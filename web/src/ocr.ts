// Photo → bet. A pluggable parser turns a slip image into a BetDraft you confirm.
//
// Two implementations behind one interface:
//   - tesseractParser: on-device OCR (tesseract.js). No key, no backend — works
//     on the static build and on your phone. Best on clean screenshots.
//   - remoteParser: POSTs the image to the backend /api/parse-slip, where a
//     vision LLM can do far more accurate structured extraction. Opt-in; needs
//     the backend running with that endpoint implemented.

import type { BetDraft } from './betDraft';
import { emptyDraft } from './betDraft';
import type { Book } from './types';
import { LEAGUES } from './espn';

export interface ParseResult {
  draft: BetDraft;
  /** Raw OCR / model text, shown so you can see what it read. */
  text: string;
  /** 0–1 rough confidence that fields were extracted (heuristic parsers only). */
  confidence: number;
}

export interface BetSlipParser {
  readonly id: 'tesseract' | 'remote';
  readonly label: string;
  parse(file: File, onProgress?: (p: number) => void): Promise<ParseResult>;
}

// --- On-device Tesseract -----------------------------------------------------

export const tesseractParser: BetSlipParser = {
  id: 'tesseract',
  label: 'On-device OCR',
  async parse(file, onProgress) {
    // Lazy-load so the heavy WASM/worker only downloads when you actually import
    // a photo (keeps first paint fast).
    const { default: Tesseract } = await import('tesseract.js');
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    });
    const text = data.text ?? '';
    return { draft: draftFromText(text), text, confidence: scoreConfidence(text) };
  },
};

// --- Remote vision-LLM parser (opt-in) --------------------------------------

export const remoteParser: BetSlipParser = {
  id: 'remote',
  label: 'AI vision (server)',
  async parse(file) {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch('/api/parse-slip', { method: 'POST', body });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(msg.error ?? 'Server parsing failed');
    }
    const parsed = (await res.json()) as { draft: Partial<BetDraft>; text?: string };
    return {
      draft: { ...emptyDraft('photo'), ...parsed.draft, source: 'photo' },
      text: parsed.text ?? '',
      confidence: 0.9,
    };
  },
};

// --- Heuristic extraction ----------------------------------------------------

/**
 * Pull likely bet fields out of raw OCR text. Deliberately forgiving — it
 * pre-fills the form for you to correct, it doesn't have to be perfect.
 */
export function draftFromText(text: string): BetDraft {
  const draft = emptyDraft('photo');
  draft.rawText = text;
  const lower = text.toLowerCase();

  // Book
  const bookMap: [RegExp, Book][] = [
    [/draftkings|draft kings|\bdk\b/, 'draftkings'],
    [/fanduel|fan duel|\bfd\b/, 'fanduel'],
    [/prizepicks|prize picks/, 'prizepicks'],
  ];
  for (const [re, book] of bookMap) if (re.test(lower)) { draft.book = book; break; }

  // Bet type
  if (/prize\s*picks|entry|lineup|pick.?em/.test(lower)) draft.betType = 'dfs_entry';
  else if (/parlay|leg\s*\d|\d+\s*leg/.test(lower)) draft.betType = 'parlay';
  else if (/\bover\b|\bunder\b|player|props?/.test(lower)) draft.betType = 'prop';

  // Status / result
  if (/\bopen\b|pending|to\s*win|potential/.test(lower)) draft.status = 'open';
  if (/\bwon\b|\bwin\b|cash(ed)?|paid/.test(lower)) { draft.status = 'settled'; draft.result = 'win'; }
  if (/\blost\b|\bloss\b/.test(lower)) { draft.status = 'settled'; draft.result = 'loss'; }
  if (/\bpush\b|void|refund/.test(lower)) { draft.status = 'settled'; draft.result = 'push'; }

  // League
  const leagueHit = LEAGUES.find((l) => new RegExp(`\\b${l.id}\\b`, 'i').test(lower));
  if (leagueHit) draft.league = leagueHit.id;

  // Money: "Wager $25", "Stake 25.00", "$25 to win $141"
  const stake = matchMoney(text, /(?:wager|stake|risk|bet|entry\s*fee)\D{0,8}\$?\s*([\d,]+\.?\d*)/i);
  if (stake != null) draft.stake = stake;
  const payout = matchMoney(text, /(?:to\s*win|payout|to\s*pay|potential|returns?)\D{0,8}\$?\s*([\d,]+\.?\d*)/i);
  if (payout != null) draft.potentialPayout = payout;
  // Fallback: first two dollar amounts → stake, payout.
  if (draft.stake === 0) {
    const dollars = [...text.matchAll(/\$\s*([\d,]+\.?\d*)/g)].map((m) => Number(m[1]!.replace(/,/g, '')));
    if (dollars[0] != null) draft.stake = dollars[0];
    if (draft.potentialPayout == null && dollars[1] != null) draft.potentialPayout = dollars[1];
  }

  // Odds: first American-odds token like +450 or -110
  const oddsMatch = text.match(/([+-]\d{2,4})(?!\d)/);
  if (oddsMatch) draft.oddsAmerican = Number(oddsMatch[1]);

  // Legs: lines that look like selections (have odds or over/under), else the
  // longest non-boilerplate lines.
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !/^\$?[\d.,+\-\s%]+$/.test(l));
  const legLines = lines.filter((l) => /[+-]\d{2,4}|over|under|\bml\b|spread|moneyline/i.test(l));
  const chosen = (legLines.length ? legLines : lines).slice(0, 8);
  if (chosen.length) {
    draft.legs = chosen.map((l) => {
      const legOdds = l.match(/([+-]\d{2,4})(?!\d)/);
      return {
        selection: l.replace(/([+-]\d{2,4})(?!\d)/, '').trim(),
        market: '',
        event: '',
        oddsAmerican: legOdds ? Number(legOdds[1]) : null,
        result: null,
      };
    });
    if (draft.legs.length > 1 && draft.betType === 'single') draft.betType = 'parlay';
  }

  return draft;
}

function matchMoney(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m || m[1] == null) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function scoreConfidence(text: string): number {
  let score = 0;
  if (/\$\s*\d/.test(text)) score += 0.4;
  if (/[+-]\d{2,4}/.test(text)) score += 0.3;
  if (/draftkings|fanduel|prizepicks/i.test(text)) score += 0.2;
  if (text.trim().length > 40) score += 0.1;
  return Math.min(1, score);
}

// Photo → bet. A pluggable parser turns a slip image into a BetDraft you confirm.
//
// Two implementations behind one interface:
//   - tesseractParser: on-device OCR (tesseract.js) + a PrizePicks-specialized
//     path that reads player names and detects the green (passed) picks by
//     analysing pixels on a canvas. No key, no backend — works on the static
//     build and on your phone.
//   - remoteParser: POSTs the image to the backend /api/parse-slip, where a
//     vision LLM can do far more accurate structured extraction. Opt-in.

import type { BetDraft, DraftLeg } from './betDraft';
import { emptyDraft } from './betDraft';
import type { Book, BetResult } from './types';
import { LEAGUES } from './espn';

export interface ParseResult {
  draft: BetDraft;
  text: string;
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
    // Draw the image to a canvas up front — used for PrizePicks green detection.
    const canvas = await fileToCanvas(file);

    const { default: Tesseract } = await import('tesseract.js');
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    });
    const text = (data as { text?: string }).text ?? '';
    const lines = extractLines(data);

    // PrizePicks entries look nothing like a straight betslip — route them to a
    // dedicated parser that pulls players and reads passed/failed from colour.
    if (/prize\s*picks|\b\d+[-\s]?pick\b|flex play|power play|pick.?em/i.test(text)) {
      return { draft: parsePrizePicks(text, lines, canvas), text, confidence: 0.7 };
    }
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

// --- Image helpers -----------------------------------------------------------

interface OcrLine {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas;
  } catch {
    return null;
  }
}

/** Flatten Tesseract's structured output into lines with bounding boxes. */
function extractLines(data: unknown): OcrLine[] {
  const out: OcrLine[] = [];
  const push = (text: string | undefined, b: { x0: number; y0: number; x1: number; y1: number } | undefined) => {
    if (text && text.trim() && b) out.push({ text: text.trim(), x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
  };
  const d = data as any;
  if (Array.isArray(d?.lines)) {
    d.lines.forEach((l: any) => push(l.text, l.bbox));
  } else if (Array.isArray(d?.blocks)) {
    d.blocks.forEach((bl: any) =>
      (bl.paragraphs ?? []).forEach((p: any) => (p.lines ?? []).forEach((l: any) => push(l.text, l.bbox))),
    );
  }
  return out.sort((a, b) => a.y0 - b.y0);
}

/**
 * Rows (y-ranges) that are mostly PrizePicks' lime-green — i.e. a full progress
 * bar of a passed pick. Calibrated against a real screenshot: green ≈ (94,215,5).
 */
function greenBands(canvas: HTMLCanvasElement): Array<[number, number]> {
  const { width: W, height: H } = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const { data } = ctx.getImageData(0, 0, W, H);
  const isGreen = (r: number, g: number, b: number) =>
    g > 170 && r > 90 && r < 220 && b < 130 && g - r > 25 && g - b > 90;

  const bands: Array<[number, number]> = [];
  let start = -1;
  for (let y = 0; y < H; y++) {
    let green = 0;
    let total = 0;
    for (let x = 0; x < W; x += 4) {
      const i = (y * W + x) * 4;
      total++;
      if (isGreen(data[i]!, data[i + 1]!, data[i + 2]!)) green++;
    }
    const frac = green / total;
    if (frac > 0.25) {
      if (start < 0) start = y;
    } else if (start >= 0) {
      bands.push([start, y - 1]);
      start = -1;
    }
  }
  if (start >= 0) bands.push([start, H - 1]);
  return bands;
}

// --- PrizePicks parser -------------------------------------------------------

// The subtitle under each player, e.g. "Argentina • Attacker • #19". Strong,
// PrizePicks-specific anchor: a bullet plus a jersey number or position word.
const PP_SUBTITLE = /(•|·).*(#\s?\d|attacker|midfield|defend|forward|goalkeeper|guard|pitcher|catcher|wr\b|rb\b|qb\b|center|winger|striker)/i;
const STAT_RE = /(\d+(?:\.\d+)?)\s*(goals?|assists?|shots?|saves?|points?|pts|rebounds?|reb|ast|passing|rushing|receiving|receptions?|yards?|strikeouts?|hits?|bases?|threes?|blocks?|steals?)/i;

/**
 * Parse a PrizePicks entry screenshot into a dfs_entry draft:
 *  - one leg per pick, selection = PLAYER NAME ONLY (team/position dropped),
 *  - stat line kept as the market ("Goals • Over 0.5"),
 *  - passed picks (green progress bar) marked as wins via colour detection.
 */
function parsePrizePicks(text: string, lines: OcrLine[], canvas: HTMLCanvasElement | null): BetDraft {
  const draft = emptyDraft('photo');
  draft.book = 'prizepicks';
  draft.betType = 'dfs_entry';
  draft.rawText = text;

  // Header: payout ("to win $40") and pick count.
  const payout = firstMoney(text, /to\s*win\s*\$?\s*([\d,]+\.?\d*)/i) ?? firstMoney(text, /\$\s*([\d,]+\.?\d*)/);
  if (payout != null) draft.potentialPayout = payout;
  const entryFee = firstMoney(text, /entry\D{0,6}\$?\s*([\d,]+\.?\d*)/i);
  if (entryFee != null) draft.stake = entryFee;

  const bands = canvas ? greenBands(canvas) : [];
  const bandCenter = ([a, b]: [number, number]) => (a + b) / 2;

  // Find each pick's player: the line directly above a subtitle line.
  const subtitles = lines.filter((l) => PP_SUBTITLE.test(l.text) || /(•|·).+(•|·)/.test(l.text));
  const players: { name: string; y0: number; y1: number }[] = [];
  for (const sub of subtitles) {
    const above = lines
      .filter((l) => l.y1 <= sub.y0 + 6 && sub.y0 - l.y1 < 120 && looksLikeName(l.text))
      .sort((a, b) => b.y1 - a.y1)[0];
    if (above) players.push({ name: cleanName(above.text), y0: above.y0, y1: sub.y1 });
  }

  // Fallback when OCR gave no usable geometry: mine names straight from text.
  if (players.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      if ((PP_SUBTITLE.test(lines[i + 1]!.text) || /(•|·)/.test(lines[i + 1]!.text)) && looksLikeName(lines[i]!.text)) {
        players.push({ name: cleanName(lines[i]!.text), y0: lines[i]!.y0, y1: lines[i + 1]!.y1 });
      }
    }
  }

  const legs: DraftLeg[] = players.map((p, i) => {
    const next = players[i + 1];
    const regionEnd = next ? next.y0 : (canvas?.height ?? Number.MAX_SAFE_INTEGER);
    // Passed if a green bar sits in this pick's vertical region.
    const passed = bands.some((b) => bandCenter(b) >= p.y0 && bandCenter(b) < regionEnd);

    // Stat line for this pick: a "0.5 Goals"-style token near the player row.
    const statLine = lines.find(
      (l) => l.y0 >= p.y0 - 20 && l.y0 < regionEnd && STAT_RE.test(l.text),
    );
    const m = statLine?.text.match(STAT_RE);
    const line = m?.[1];
    const stat = m?.[2];
    const dir = statLine && /under|↓|\bU\b/i.test(statLine.text) ? 'Under' : 'Over';
    const market = stat && line ? `${cap(stat)} • ${dir} ${line}` : '';

    const result: BetResult = passed ? 'win' : null;
    return { selection: p.name, market, event: '', oddsAmerican: null, result };
  });

  draft.legs = legs.length
    ? legs
    : [{ selection: '', market: '', event: '', oddsAmerican: null, result: null }];

  // League hint (soccer World Cup screenshots, NBA, etc.).
  const leagueHit = LEAGUES.find((l) => new RegExp(`\\b${l.id}\\b`, 'i').test(text));
  if (leagueHit) draft.league = leagueHit.id;

  // Any green pick means the entry is live/settled; leave the entry itself open
  // unless every pick is resolved (all green in a finished slate).
  const anyPassed = legs.some((l) => l.result === 'win');
  const allPassed = legs.length > 0 && legs.every((l) => l.result === 'win');
  draft.status = allPassed ? 'settled' : 'open';
  draft.result = allPassed ? 'win' : null;
  if (anyPassed && draft.status === 'open') draft.status = 'open';

  return draft;
}

function looksLikeName(s: string): boolean {
  const t = s.trim();
  // Two-plus words, mostly letters (allow accents, apostrophes, hyphens).
  if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'-]+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'-]+){1,3}$/.test(t)) return false;
  if (/\b(vs|final|world cup|flex|play|bonus|entry|pulse|details|to win)\b/i.test(t)) return false;
  return true;
}

function cleanName(s: string): string {
  return s.replace(/[^A-Za-zÀ-ÿ.'\- ]/g, '').replace(/\s+/g, ' ').trim();
}

// --- Generic (DraftKings / FanDuel) heuristics ------------------------------

export function draftFromText(text: string): BetDraft {
  const draft = emptyDraft('photo');
  draft.rawText = text;
  const lower = text.toLowerCase();

  const bookMap: [RegExp, Book][] = [
    [/draftkings|draft kings|\bdk\b/, 'draftkings'],
    [/fanduel|fan duel|\bfd\b/, 'fanduel'],
    [/prizepicks|prize picks/, 'prizepicks'],
  ];
  for (const [re, book] of bookMap) if (re.test(lower)) { draft.book = book; break; }

  if (/prize\s*picks|pick.?em|\d+[- ]?pick|\bentry\b|\bflex\b|\bpower play\b|lineup/.test(lower)) {
    draft.betType = 'dfs_entry';
  } else if (/parlay|\d+\s*leg|leg\s*\d/.test(lower)) {
    draft.betType = 'parlay';
  } else if (/\bover\b|\bunder\b|player|props?/.test(lower)) {
    draft.betType = 'prop';
  }

  if (/\bopen\b|pending|cash\s*out|to\s*win|to\s*pay|potential/.test(lower)) draft.status = 'open';
  if (/\bwon\b|\bwin\b(?!\s*\$)|cash(ed)?\b|paid|winner/.test(lower)) { draft.status = 'settled'; draft.result = 'win'; }
  if (/\blost\b|\bloss\b|\blose\b/.test(lower)) { draft.status = 'settled'; draft.result = 'loss'; }
  if (/\bpush\b|void|refund/.test(lower)) { draft.status = 'settled'; draft.result = 'push'; }

  const leagueHit = LEAGUES.find((l) => new RegExp(`\\b${l.id}\\b`, 'i').test(lower));
  if (leagueHit) draft.league = leagueHit.id;

  const stake = firstMoney(text, /(?:total\s*wager|wager|stake|risk|bet\s*amount|entry(?:\s*fee)?)\D{0,10}\$?\s*([\d,]+\.?\d*)/i);
  if (stake != null) draft.stake = stake;
  const payout = firstMoney(text, /(?:to\s*win|to\s*pay|total\s*payout|payout|potential(?:\s*(?:payout|winnings))?|returns?|prize|winnings)\D{0,10}\$?\s*([\d,]+\.?\d*)/i);
  if (payout != null) draft.potentialPayout = payout;
  if (draft.stake === 0) {
    const dollars = [...text.matchAll(/\$\s*([\d,]+\.?\d*)/g)].map((mm) => Number(mm[1]!.replace(/,/g, '')));
    if (dollars[0] != null) draft.stake = dollars[0];
    if (draft.potentialPayout == null && dollars[1] != null) draft.potentialPayout = dollars[1];
  }

  const oddsMatch = text.match(/([+-]\d{2,4})(?!\d)/);
  if (oddsMatch) draft.oddsAmerican = Number(oddsMatch[1]);

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

// --- shared helpers ----------------------------------------------------------

function firstMoney(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m || m[1] == null) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function scoreConfidence(text: string): number {
  let score = 0;
  if (/\$\s*\d/.test(text)) score += 0.4;
  if (/[+-]\d{2,4}/.test(text)) score += 0.3;
  if (/draftkings|fanduel|prizepicks/i.test(text)) score += 0.2;
  if (text.trim().length > 40) score += 0.1;
  return Math.min(1, score);
}

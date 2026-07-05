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
import { detectLeague } from './espn';

export interface ParseResult {
  /** One or more bets found in the image (a "My Bets" list can hold several). */
  drafts: BetDraft[];
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
    // Draw the image to a canvas up front. The colour original is used for
    // PrizePicks green detection; a preprocessed copy is fed to OCR.
    const canvas = await fileToCanvas(file);

    const { default: Tesseract } = await import('tesseract.js');
    // Sportsbook/DFS apps are dark-themed (light text on black), which OCR reads
    // badly. Invert + grayscale + boost contrast so it's dark text on light —
    // a big accuracy win. Same dimensions, so coordinates still line up with the
    // colour canvas used for green detection.
    const ocrTarget: File | HTMLCanvasElement = canvas ? preprocessForOcr(canvas) : file;
    const { data } = await Tesseract.recognize(ocrTarget, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
    });
    const text = (data as { text?: string }).text ?? '';
    const lines = extractLines(data);

    // PrizePicks entries look nothing like a straight betslip — route them to a
    // dedicated parser that pulls players and reads passed/failed from colour.
    if (/prize\s*picks|\b\d+[-\s]?pick\b|flex play|power play|pick.?em/i.test(text)) {
      return { drafts: [parsePrizePicks(text, lines, canvas)], text, confidence: 0.7 };
    }

    // A "My Bets" list holds several bets — split into blocks and parse each.
    // A real bet has a selection AND odds (this rejects nav bars / balances).
    const drafts = splitIntoBets(text)
      .map((block) => draftFromText(block))
      .filter((d) => d.legs.some((l) => l.selection.trim()) && d.oddsAmerican != null);
    return {
      drafts: drafts.length ? drafts : [draftFromText(text)],
      text,
      confidence: scoreConfidence(text),
    };
  },
};

// --- Remote vision-AI parser (opt-in) ---------------------------------------
// Hook point for a vision model — a hosted LLM or your own LOCAL AI. Point
// /api/parse-slip at it (or set a base URL) and it should return
// { drafts: Partial<BetDraft>[], text? }. It supersedes the heuristics entirely.

export const remoteParser: BetSlipParser = {
  id: 'remote',
  label: 'AI vision',
  async parse(file) {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch('/api/parse-slip', { method: 'POST', body });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(msg.error ?? 'Server parsing failed');
    }
    const parsed = (await res.json()) as { drafts?: Partial<BetDraft>[]; draft?: Partial<BetDraft>; text?: string };
    const list = parsed.drafts ?? (parsed.draft ? [parsed.draft] : []);
    return {
      drafts: list.map((d) => ({ ...emptyDraft('photo'), ...d, source: 'photo' as const })),
      text: parsed.text ?? '',
      confidence: 0.95,
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

/**
 * Prepare a screenshot for OCR: grayscale, invert if it's a dark-theme shot
 * (light text on black), and stretch contrast. Keeps the same dimensions so the
 * OCR text positions still align with the colour canvas used for green picks.
 */
function preprocessForOcr(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  // Average luminance → is this a dark-background screenshot?
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
  const dark = sum / (d.length / 4) < 115;

  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    if (dark) g = 255 - g; // invert so text is dark on light
    g = Math.max(0, Math.min(255, (g - 128) * 1.5 + 128)); // contrast stretch
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return c;
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
  draft.league = detectLeague(text);

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

  // Book. "Reuse selection" / "Total Wager"/"Total Payout" are FanDuel-isms.
  const bookMap: [RegExp, Book][] = [
    [/draftkings|draft kings/, 'draftkings'],
    [/fanduel|fan duel|reuse selection|total wager|total payout/, 'fanduel'],
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

  draft.league = detectLeague(text);

  // Money. Default to the first two dollar amounts in reading order (wager,
  // then payout/return) — robust for FanDuel, which prints the amounts ABOVE
  // their labels.
  const dollars = [...text.matchAll(/\$\s*([\d,]+\.?\d*)/g)].map((mm) => Number(mm[1]!.replace(/,/g, '')));
  if (dollars[0] != null) draft.stake = dollars[0];
  if (dollars[1] != null) draft.potentialPayout = dollars[1];
  const stakeLbl = firstMoney(text, /(?:total\s*wager|wager|stake|risk|bet\s*amount|entry(?:\s*fee)?)\s*:?\s*\$\s*([\d,]+\.?\d*)/i);
  if (stakeLbl != null) draft.stake = stakeLbl;
  const payLbl = firstMoney(text, /(?:total\s*payout|to\s*win|to\s*pay|payout|potential(?:\s*(?:payout|winnings))?)\s*:?\s*\$\s*([\d,]+\.?\d*)/i);
  if (payLbl != null) draft.potentialPayout = payLbl;

  // Settled outcome. "Cashed out $X" = win (took $X). "Returned $0" = loss;
  // "Returned $X" pays out $X. Otherwise the bet is open.
  const settled = parseSettled(lower, dollars, draft.stake);
  draft.status = settled.status;
  draft.result = settled.result;
  if (settled.status === 'settled' && settled.payout != null) draft.potentialPayout = settled.payout;

  // Odds: for OPEN bets derive from stake→payout (robust against a crossed-out
  // original next to a boosted price); otherwise read the first odds token.
  if (draft.status === 'open' && draft.stake > 0 && draft.potentialPayout && draft.potentialPayout > draft.stake) {
    draft.oddsAmerican = decimalToAmerican(draft.potentialPayout / draft.stake);
  } else {
    // `(?![\d:])` so a clock/time range like "15:00-19:59" isn't read as odds.
    const oddsMatch = text.match(/([+-]\d{2,4})(?![\d:])/);
    if (oddsMatch) draft.oddsAmerican = Number(oddsMatch[1]);
  }

  // Matchup: "USA v Belgium" style, else two stacked "Team score" lines.
  const TEAM = "[A-Z][\\w.'-]+(?:\\s[A-Z][a-z][\\w.'-]*)?";
  const mm = text.match(new RegExp(`(${TEAM})\\s+(?:v|vs|@)\\s+(${TEAM})`));
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^\$?[\d.,+\-\s%]+$/.test(l));
  const matchup = mm ? `${mm[1]!.trim()} v ${mm[2]!.trim()}` : stackedTeams(lines);

  const legLines = lines.filter(
    (l) => /[+-]\d{2,4}(?![\d:])|over|under|\bml\b|spread|moneyline/i.test(l) && !/\bvs?\b/i.test(l),
  );
  const chosen = (legLines.length ? legLines : lines).slice(0, 8);
  if (chosen.length) {
    draft.legs = chosen.map((l) => {
      const legOdds = l.match(/([+-]\d{2,4})(?![\d:])/);
      const idx = lines.indexOf(l);
      const next = idx >= 0 ? lines[idx + 1] : undefined;
      const market = next && isDescriptor(next) ? titleize(next) : '';
      return {
        selection: l.replace(/([+-]\d{2,4})(?![\d:])/g, '').replace(/\s+/g, ' ').trim(),
        market,
        event: matchup,
        oddsAmerican: legOdds ? Number(legOdds[1]) : null,
        result: null,
      };
    });
    if (draft.legs.length > 1 && draft.betType === 'single') draft.betType = 'parlay';
  }

  const first = draft.legs[0];
  if (draft.betType !== 'parlay' && first) {
    if (!first.selection && mm) first.selection = mm[1]!.trim();
    if (!first.market && !/over|under|spread|\d+\.5/i.test(first.selection)) first.market = 'Moneyline';
    first.oddsAmerican = draft.oddsAmerican;
    if (draft.status === 'settled') first.result = draft.result;
    // Exotic soccer/prop markets (throw-ins, corners, cards, half-time…).
    if (/throw|corner|booking|card|offside|foul|half.?time|match outcome|to (qualify|score)/i.test(`${first.selection} ${first.market}`)) {
      draft.betType = 'prop';
    }
  }

  return draft;
}

interface SettledInfo {
  status: BetDraft['status'];
  result: BetResult;
  payout: number | null;
}

function parseSettled(lower: string, dollars: number[], stake: number): SettledInfo {
  const amt = dollars.length >= 2 ? dollars[1]! : null;
  if (/cashed\s*out/.test(lower)) return { status: 'settled', result: 'win', payout: amt ?? stake };
  if (/\breturned\b|\breturn\b/.test(lower)) {
    const ret = amt ?? 0;
    const result: BetResult = ret === 0 ? 'loss' : ret > stake ? 'win' : ret === stake ? 'push' : 'loss';
    return { status: 'settled', result, payout: ret };
  }
  if (/\bwon\b|\bwinner\b|\bpaid\b/.test(lower)) return { status: 'settled', result: 'win', payout: amt };
  if (/\blost\b|\bloss\b|\blose\b/.test(lower)) return { status: 'settled', result: 'loss', payout: 0 };
  if (/\bpush\b|\bvoid\b|refund/.test(lower)) return { status: 'settled', result: 'push', payout: stake };
  return { status: 'open', result: null, payout: null };
}

/** "Paraguay 0" + "France 1" (stacked) → "Paraguay v France". */
function stackedTeams(lines: string[]): string {
  const teams: string[] = [];
  for (const l of lines) {
    if (/minute|match|outcome|result|throw|corner|wager|payout|bet\s*id|placed/i.test(l)) continue;
    const m = l.match(/^([A-Za-z][A-Za-z.' ]{1,22}?)\s+\d+\b/);
    if (m) teams.push(m[1]!.trim());
    if (teams.length === 2) break;
  }
  return teams.length === 2 ? `${teams[0]} v ${teams[1]}` : '';
}

function isDescriptor(s: string): boolean {
  if (/result|outcome|half|full.?time|corners?|throw|money.?line|winner|spread|total|to (qualify|win|score)|handicap|booking|cards?|over\/under/i.test(s)) {
    return true;
  }
  const letters = s.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && s === s.toUpperCase();
}

function titleize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a "My Bets" list into per-bet blocks (each ends at BET ID / PLACED). */
function splitIntoBets(text: string): string[] {
  const rawLines = text.split(/\n+/);
  const hasPlaced = /placed/i.test(text);
  const hasBetId = /bet\s*id/i.test(text);
  if (!hasPlaced && !hasBetId) return [text];
  const delim = hasPlaced ? /placed/i : /bet\s*id/i;
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const ln of rawLines) {
    cur.push(ln);
    if (delim.test(ln)) {
      blocks.push(cur.join('\n'));
      cur = [];
    }
  }
  if (cur.join('').trim()) blocks.push(cur.join('\n'));
  return blocks.filter((b) => b.trim().length > 0);
}

function decimalToAmerican(dec: number): number {
  if (dec <= 1) return 0;
  const profit = dec - 1;
  return profit >= 1 ? Math.round(profit * 100) : Math.round(-100 / profit);
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

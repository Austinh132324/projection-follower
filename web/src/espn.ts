// ESPN integration: live game data + a research-based win-likelihood for a bet.
//
// Uses ESPN's public (unofficial, undocumented) JSON endpoints. These run from
// the user's *browser* at runtime — they work on the static GitHub Pages build.
// Shapes are stable but not contractual, so every access is defensive; confirm
// field names against a live response if something reads empty. When the real
// backend is running, calls fall back through its /api/espn proxy to dodge CORS.
//
// The prediction is ESPN's model-based Matchup Predictor (FPI-driven) combined
// with records and market-vs-model comparison — research, not just the odds.
// It is an estimate, not betting advice.

import type { Bet } from './types';
import { USE_LOCAL } from './api';

export interface League {
  id: string;
  label: string;
  /** ESPN sport path segment, e.g. "basketball/nba". */
  path: string;
}

export const LEAGUES: League[] = [
  { id: 'nfl', label: 'NFL', path: 'football/nfl' },
  { id: 'nba', label: 'NBA', path: 'basketball/nba' },
  { id: 'mlb', label: 'MLB', path: 'baseball/mlb' },
  { id: 'nhl', label: 'NHL', path: 'hockey/nhl' },
  { id: 'wnba', label: 'WNBA', path: 'basketball/wnba' },
  { id: 'ncaaf', label: 'NCAAF', path: 'football/college-football' },
  { id: 'ncaam', label: "NCAA M", path: 'basketball/mens-college-basketball' },
  { id: 'epl', label: 'Premier League', path: 'soccer/eng.1' },
  { id: 'ucl', label: 'Champions League', path: 'soccer/uefa.champions' },
  { id: 'mls', label: 'MLS', path: 'soccer/usa.1' },
  { id: 'wc', label: 'World Cup', path: 'soccer/fifa.world' },
  { id: 'intl', label: 'Intl (Friendlies)', path: 'soccer/fifa.friendly' },
];

/** Keyword → league, for detecting the competition from a slip's text. */
export const LEAGUE_KEYWORDS: Array<[RegExp, string]> = [
  [/world cup|qualify for the next round|group stage|knockout stage/i, 'wc'],
  [/premier league|\bepl\b/i, 'epl'],
  [/champions league|\bucl\b/i, 'ucl'],
  [/\bmls\b|major league soccer/i, 'mls'],
  [/\bnba\b/i, 'nba'],
  [/\bwnba\b/i, 'wnba'],
  [/\bnfl\b/i, 'nfl'],
  [/\bmlb\b/i, 'mlb'],
  [/\bnhl\b/i, 'nhl'],
];

export function detectLeague(text: string): string | null {
  for (const [re, id] of LEAGUE_KEYWORDS) if (re.test(text)) return id;
  const byId = LEAGUES.find((l) => new RegExp(`\\b${l.id}\\b`, 'i').test(text));
  return byId?.id ?? null;
}

export function leagueById(id?: string | null): League | undefined {
  return id ? LEAGUES.find((l) => l.id === id) : undefined;
}

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports';

// --- Public result shapes ----------------------------------------------------

export interface EspnCompetitor {
  homeAway: 'home' | 'away';
  abbreviation: string;
  name: string;
  score: number | null;
  record: string | null;
  winner: boolean | null;
  /** Per-period scoring (quarters / innings / halves). */
  linescores: number[];
  logo?: string;
}

export interface EspnEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  competitors: EspnCompetitor[];
}

export interface Prediction {
  /** Team the bet is on, when identifiable. */
  side: string | null;
  /** Research (model) win probability for the side, 0–100. */
  researchWinPct: number | null;
  /** The model win % expressed as a fair American (Vegas-style) line. */
  researchFairOdds: number | null;
  /** Probability implied by the bet's odds, 0–100 (single-leg only). */
  marketImpliedPct: number | null;
  /** research − market. Positive = model sees more value than the price. */
  edgePct: number | null;
  confidence: 'low' | 'medium' | 'high';
  rationale: string[];
}

/** Bookmaker odds ESPN publishes for the game. */
export interface EspnOdds {
  provider: string;
  /** Spread text, e.g. "KC -7.5". */
  details: string | null;
  overUnder: number | null;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
}

export interface EspnInsight {
  matched: boolean;
  event?: EspnEvent;
  prediction?: Prediction;
  odds?: EspnOdds;
  /** Home-team win probability over the course of a live/finished game, 0–100. */
  winProbTimeline?: number[];
  relatedStats?: { label: string; value: string }[];
  error?: string;
}

// --- Fetch helpers -----------------------------------------------------------

async function espnFetch(url: string): Promise<unknown> {
  // Direct browser call first (works on static Pages when ESPN allows CORS).
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
  } catch {
    /* CORS or network — fall through to the backend proxy if available */
  }
  if (!USE_LOCAL) {
    const res = await fetch(`/api/espn?url=${encodeURIComponent(url)}`);
    if (res.ok) return res.json();
  }
  throw new Error('ESPN request failed');
}

function yyyymmdd(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// --- Scoreboard + event matching --------------------------------------------

function parseEvent(raw: any): EspnEvent | null {
  const comp = raw?.competitions?.[0];
  if (!comp) return null;
  const competitors: EspnCompetitor[] = (comp.competitors ?? []).map((c: any) => ({
    homeAway: c.homeAway,
    abbreviation: c.team?.abbreviation ?? '',
    name: c.team?.displayName ?? c.team?.name ?? '',
    score: c.score != null ? Number(c.score) : null,
    record: c.records?.[0]?.summary ?? null,
    winner: typeof c.winner === 'boolean' ? c.winner : null,
    linescores: (c.linescores ?? [])
      .map((l: any) => Number(l.value ?? l.displayValue))
      .filter((n: number) => Number.isFinite(n)),
    logo: c.team?.logo,
  }));
  return {
    id: String(raw.id),
    name: raw.name ?? comp.competitors?.map((c: any) => c.team?.displayName).join(' vs ') ?? '',
    shortName: raw.shortName ?? '',
    date: raw.date ?? comp.date ?? '',
    state: raw.status?.type?.state ?? comp.status?.type?.state ?? 'pre',
    statusDetail: raw.status?.type?.detail ?? raw.status?.type?.description ?? '',
    competitors,
  };
}

async function fetchScoreboard(league: League, dateIso: string): Promise<EspnEvent[]> {
  const url = `${SITE_API}/${league.path}/scoreboard?dates=${yyyymmdd(dateIso)}&limit=300`;
  const data = (await espnFetch(url)) as any;
  return (data?.events ?? []).map(parseEvent).filter(Boolean) as EspnEvent[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** All team-ish text we can mine from a bet to match against ESPN competitors. */
function betText(bet: Bet): string {
  return norm(bet.legs.map((l) => `${l.selection} ${l.event ?? ''}`).join(' '));
}

/** Does this competitor appear in the bet text? */
function competitorMentioned(c: EspnCompetitor, text: string): boolean {
  const tokens = [c.name, c.abbreviation, c.name.split(' ').slice(-1)[0]]
    .map((t) => norm(t ?? ''))
    .filter((t) => t.length >= 3);
  return tokens.some((t) => text.includes(t));
}

/**
 * Find the ESPN event a bet refers to: search the bet's date (±1 day) and pick
 * the game whose competitors best match the bet's selection/event text.
 */
async function matchEvent(
  bet: Bet,
  league: League,
): Promise<{ event: EspnEvent; picked: EspnCompetitor | null } | null> {
  const baseIso = bet.eventDate ?? bet.placedAt;
  const text = betText(bet);
  const seen = new Set<string>();

  // Search the placed date and a few days either side — a bet's game can be
  // several days out (e.g. a World Cup match placed days ahead).
  for (const offset of [0, 1, -1, 2, 3, 4]) {
    let events: EspnEvent[];
    try {
      events = await fetchScoreboard(league, shiftDays(baseIso, offset));
    } catch {
      continue;
    }
    let best: { event: EspnEvent; matches: number } | null = null;
    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const matches = ev.competitors.filter((c) => competitorMentioned(c, text)).length;
      if (matches > 0 && (!best || matches > best.matches)) best = { event: ev, matches };
    }
    if (best) {
      const picked = best.event.competitors.find((c) => competitorMentioned(c, text)) ?? null;
      return { event: best.event, picked };
    }
  }
  return null;
}

// --- Summary + prediction ----------------------------------------------------

/**
 * ESPN game summary: the Matchup Predictor (model win % per side, ESPN's "chance
 * calculator") plus the bookmaker odds ESPN publishes for the game.
 */
async function fetchSummary(
  league: League,
  eventId: string,
): Promise<{
  predictor: { home: number | null; away: number | null };
  odds?: EspnOdds;
  winProbTimeline?: number[];
}> {
  try {
    const url = `${SITE_API}/${league.path}/summary?event=${eventId}`;
    const data = (await espnFetch(url)) as any;
    const p = data?.predictor;
    return {
      predictor: { home: num(p?.homeTeam?.gameProjection), away: num(p?.awayTeam?.gameProjection) },
      odds: parseOdds(data),
      winProbTimeline: parseWinProb(data),
    };
  } catch {
    return { predictor: { home: null, away: null } };
  }
}

/** ESPN win-probability array → home win % over time (0–100), downsampled. */
function parseWinProb(data: any): number[] | undefined {
  const wp = data?.winprobability;
  if (!Array.isArray(wp) || wp.length < 2) return undefined;
  const pts = wp
    .map((w: any) => num(w.homeWinPercentage))
    .filter((n: number | null): n is number => n != null)
    .map((n: number) => (n <= 1 ? n * 100 : n));
  if (pts.length < 2) return undefined;
  // Downsample to at most 60 points for a clean sparkline.
  const step = Math.max(1, Math.ceil(pts.length / 60));
  const out = pts.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]!);
  return out;
}

function parseOdds(data: any): EspnOdds | undefined {
  const o =
    data?.pickcenter?.[0] ??
    data?.odds?.[0] ??
    data?.header?.competitions?.[0]?.odds?.[0];
  if (!o) return undefined;
  return {
    provider: o.provider?.name ?? 'ESPN',
    details: o.details ?? null,
    overUnder: num(o.overUnder),
    homeMoneyline: num(o.homeTeamOdds?.moneyLine),
    awayMoneyline: num(o.awayTeamOdds?.moneyLine),
  };
}

/** American odds → implied win probability (0–1). */
export function impliedProbFromAmerican(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

/**
 * Win probability (0–1) → fair American odds. This is the conversion behind
 * "turn ESPN's chance calculator into Vegas odds": e.g. 0.72 → -257.
 */
export function probabilityToAmerican(p: number): number | null {
  if (p <= 0 || p >= 1) return null;
  return p >= 0.5 ? Math.round(-(p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildPrediction(
  bet: Bet,
  event: EspnEvent,
  picked: EspnCompetitor | null,
  predictor: { home: number | null; away: number | null },
): Prediction {
  const rationale: string[] = [];
  const home = event.competitors.find((c) => c.homeAway === 'home');
  const away = event.competitors.find((c) => c.homeAway === 'away');

  let researchWinPct: number | null = null;
  let side: string | null = picked?.name ?? null;

  if (picked) {
    researchWinPct = picked.homeAway === 'home' ? predictor.home : predictor.away;
  } else if (predictor.home != null && predictor.away != null) {
    // No clear side in the bet text — report the favorite.
    const favHome = predictor.home >= predictor.away;
    side = (favHome ? home : away)?.name ?? null;
    researchWinPct = favHome ? predictor.home : predictor.away;
  }

  // Convert the model's win % into a fair Vegas-style line.
  const researchFairOdds =
    researchWinPct != null ? probabilityToAmerican(researchWinPct / 100) : null;

  if (researchWinPct != null && side) {
    rationale.push(
      `ESPN's model gives ${side} a ${researchWinPct.toFixed(0)}% chance to win` +
        (researchFairOdds != null ? ` (fair line ${fmtAmerican(researchFairOdds)}).` : '.'),
    );
  } else {
    rationale.push('ESPN has no matchup projection for this game yet.');
  }
  if (picked?.record) rationale.push(`${picked.name} record: ${picked.record} (${picked.homeAway}).`);
  const opp = picked ? event.competitors.find((c) => c !== picked) : null;
  if (opp?.record) rationale.push(`Opponent ${opp.name}: ${opp.record}.`);

  // Market-vs-model: single-leg only (combined parlay odds aren't per-side).
  let marketImpliedPct: number | null = null;
  let edgePct: number | null = null;
  if (bet.legs.length === 1 && bet.oddsAmerican != null) {
    marketImpliedPct = impliedProbFromAmerican(bet.oddsAmerican) * 100;
    if (researchWinPct != null) {
      edgePct = researchWinPct - marketImpliedPct;
      rationale.push(
        `Model ${researchWinPct.toFixed(0)}% vs market-implied ${marketImpliedPct.toFixed(0)}% → ` +
          `${edgePct >= 0 ? '+' : ''}${edgePct.toFixed(0)}% ${edgePct >= 0 ? 'value' : 'overpriced'}.`,
      );
    }
  }

  let confidence: Prediction['confidence'] = 'low';
  if (researchWinPct != null) {
    const strong = researchWinPct >= 65 || researchWinPct <= 35;
    const edged = edgePct != null && Math.abs(edgePct) >= 5;
    confidence = strong && edged ? 'high' : strong || edged ? 'medium' : 'low';
  }

  return { side, researchWinPct, researchFairOdds, marketImpliedPct, edgePct, confidence, rationale };
}

function fmtAmerican(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function relatedStats(event: EspnEvent): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const c of event.competitors) {
    const bits = [c.record ? `(${c.record})` : '', c.score != null ? `— ${c.score}` : '']
      .filter(Boolean)
      .join(' ');
    out.push({ label: `${c.name}${c.homeAway === 'home' ? ' (home)' : ' (away)'}`, value: bits || '—' });
  }
  return out;
}

/**
 * Top-level: match a bet to its ESPN game and build live status + a research
 * win-likelihood. Never throws — returns `{ matched:false, error }` on failure.
 */
export async function assessBet(bet: Bet): Promise<EspnInsight> {
  const league = leagueById(bet.league);
  if (!league) {
    return { matched: false, error: 'No league set on this bet — add one to enable ESPN insights.' };
  }
  try {
    const found = await matchEvent(bet, league);
    if (!found) {
      return { matched: false, error: 'Could not match this bet to an ESPN game.' };
    }
    const summary = await fetchSummary(league, found.event.id);
    return {
      matched: true,
      event: found.event,
      prediction: buildPrediction(bet, found.event, found.picked, summary.predictor),
      odds: summary.odds,
      winProbTimeline: summary.winProbTimeline,
      relatedStats: relatedStats(found.event),
    };
  } catch (err) {
    return { matched: false, error: err instanceof Error ? err.message : 'ESPN request failed' };
  }
}

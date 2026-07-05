// The editable draft behind the entry form. Shared verbatim with the web app
// (web/src/betDraft.ts): manual entry produces a BetDraft the form edits, and
// `draftToBet` finalizes it into a stored Bet.

import type { Bet, Book, BetType, BetStatus, BetResult, BetSource, Leg } from './types';

export interface DraftLeg {
  selection: string;
  market: string;
  event: string;
  oddsAmerican: number | null;
  result: BetResult;
}

export interface BetDraft {
  book: Book;
  betType: BetType;
  status: BetStatus;
  result: BetResult;
  league: string | null;
  stake: number;
  oddsAmerican: number | null;
  /** If null, derived from stake + odds. */
  potentialPayout: number | null;
  placedAt: string; // ISO
  eventDate: string | null;
  legs: DraftLeg[];
  source: BetSource;
  rawText?: string;
}

export function emptyDraft(source: BetSource = 'manual'): BetDraft {
  return {
    book: 'draftkings',
    betType: 'single',
    status: 'open',
    result: null,
    league: null,
    stake: 0,
    oddsAmerican: null,
    potentialPayout: null,
    placedAt: new Date().toISOString(),
    eventDate: null,
    legs: [{ selection: '', market: '', event: '', oddsAmerican: null, result: null }],
    source,
  };
}

export function americanToDecimal(odds: number): number {
  if (odds === 0) return 1;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function decimalToAmerican(dec: number): number {
  if (dec <= 1) return 0;
  const profit = dec - 1;
  return profit >= 1 ? Math.round(profit * 100) : Math.round(-100 / profit);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Total return if the bet wins. Uses an explicit payout if given, else odds. */
export function computePotentialPayout(draft: BetDraft): number {
  if (draft.potentialPayout != null) return round2(draft.potentialPayout);
  if (draft.oddsAmerican != null) return round2(draft.stake * americanToDecimal(draft.oddsAmerican));
  return round2(draft.stake);
}

/** Realized return once settled, from the result. */
function settledPayout(draft: BetDraft, potential: number): number | null {
  if (draft.status !== 'settled') return null;
  switch (draft.result) {
    case 'win':
      return potential;
    case 'push':
    case 'void':
      return round2(draft.stake);
    default:
      return 0;
  }
}

/** Stable-ish id for a hand-entered bet (no crypto dependency needed). */
function makeId(): string {
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function draftToBet(draft: BetDraft): Bet {
  const potentialPayout = computePotentialPayout(draft);
  const legs: Leg[] = draft.legs
    .filter((l) => l.selection.trim())
    .map((l, i) => ({
      id: String(i),
      selection: l.selection.trim(),
      market: l.market.trim() || undefined,
      event: l.event.trim() || undefined,
      oddsAmerican: l.oddsAmerican,
      // Keep per-leg results as parsed — a DFS entry can be open overall while
      // individual picks have already hit (green).
      result: l.result,
    }));

  return {
    book: draft.book,
    betId: makeId(),
    betType: draft.betType,
    status: draft.status,
    result: draft.status === 'settled' ? draft.result : null,
    placedAt: draft.placedAt,
    settledAt: draft.status === 'settled' ? draft.placedAt : null,
    stake: round2(draft.stake),
    oddsAmerican: draft.oddsAmerican,
    potentialPayout,
    payout: settledPayout(draft, potentialPayout),
    currency: 'USD',
    legs,
    source: draft.source,
    league: draft.league,
    eventDate: draft.eventDate,
    raw: draft.rawText,
  };
}

export const BET_TYPES: BetType[] = ['single', 'parlay', 'prop', 'dfs_entry'];
export const BOOK_OPTIONS: Book[] = ['draftkings', 'fanduel', 'prizepicks', 'other'];
export const STATUS_OPTIONS: BetStatus[] = ['open', 'settled'];
export const RESULT_OPTIONS: Exclude<BetResult, null>[] = ['win', 'loss', 'push', 'void'];

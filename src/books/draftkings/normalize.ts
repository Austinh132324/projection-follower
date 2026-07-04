import type {
  BetResult,
  BetStatus,
  BetType,
  Leg,
  NormalizedBet,
  RawBet,
} from '../../normalize/bet.js';
import { round2 } from '../../normalize/odds.js';

/**
 * DraftKings -> common model.
 *
 * This is the ONLY place that knows DraftKings' payload shape. When DK renames a
 * field (it happens), fix it here — nothing downstream changes. The field access
 * is deliberately defensive: DK's wager objects vary by bet type and over time,
 * so we read a few likely keys and fall back gracefully rather than throwing.
 *
 * Treat the field names below as a starting map to verify against a real payload
 * (the raw JSON is stored on every row, so you can inspect and adjust). The
 * structure — how a wager becomes a NormalizedBet with legs — is the stable part.
 */

// Loose view of a DK wager. Optional everywhere; we probe defensively.
interface DkWager {
  id?: string | number;
  betId?: string | number;
  status?: string; // e.g. "Open", "Settled", "Won", "Lost"
  outcome?: string; // e.g. "Win", "Loss", "Push", "Void"
  settlementStatus?: string;
  stake?: number | string;
  potentialReturns?: number | string;
  potentialPayout?: number | string;
  payout?: number | string;
  returns?: number | string;
  americanOdds?: number | string;
  displayOdds?: string;
  placedDate?: string;
  datePlaced?: string;
  settledDate?: string;
  dateSettled?: string;
  currencyCode?: string;
  selections?: DkSelection[];
  legs?: DkSelection[];
  numberOfSelections?: number;
}

interface DkSelection {
  id?: string | number;
  selectionId?: string | number;
  displayName?: string;
  label?: string;
  marketDisplayName?: string;
  marketName?: string;
  eventName?: string;
  eventDisplayName?: string;
  americanOdds?: number | string;
  outcome?: string;
  status?: string;
  result?: string;
}

export function normalizeDraftKings(raw: RawBet): NormalizedBet {
  const w = (raw.payload ?? {}) as DkWager;

  const selections = w.selections ?? w.legs ?? [];
  const legs: Leg[] = selections.map((sel, i) => ({
    id: String(sel.id ?? sel.selectionId ?? i),
    selection: sel.displayName ?? sel.label ?? `Selection ${i + 1}`,
    market: sel.marketDisplayName ?? sel.marketName,
    event: sel.eventDisplayName ?? sel.eventName,
    oddsAmerican: num(sel.americanOdds),
    result: mapResult(sel.result ?? sel.outcome ?? sel.status),
  }));

  const status = mapStatus(w.status ?? w.settlementStatus);
  const result = status === 'settled' ? mapResult(w.outcome ?? w.status) : null;

  const stake = num(w.stake) ?? 0;
  const potentialPayout =
    num(w.potentialReturns) ?? num(w.potentialPayout) ?? stake;
  const payout =
    status === 'settled'
      ? settledPayout(result, stake, num(w.payout) ?? num(w.returns) ?? undefined)
      : null;

  return {
    book: 'draftkings',
    betId: String(w.id ?? w.betId ?? raw.betId),
    betType: mapBetType(legs.length, w),
    status,
    result,
    placedAt: iso(w.placedDate ?? w.datePlaced) ?? new Date(0).toISOString(),
    settledAt: iso(w.settledDate ?? w.dateSettled),
    stake: round2(stake),
    oddsAmerican: num(w.americanOdds),
    potentialPayout: round2(potentialPayout),
    payout: payout === null ? null : round2(payout),
    currency: w.currencyCode ?? 'USD',
    legs,
    raw: raw.payload,
  };
}

function mapBetType(legCount: number, w: DkWager): BetType {
  if (legCount > 1 || (w.numberOfSelections ?? 0) > 1) return 'parlay';
  // A single-selection player prop vs. a straight bet is a market-level nuance;
  // default to 'single' and let the market field on the leg carry the detail.
  return 'single';
}

function mapStatus(raw?: string): BetStatus {
  const s = (raw ?? '').toLowerCase();
  if (['open', 'pending', 'unsettled', 'live', 'accepted'].some((k) => s.includes(k))) {
    return 'open';
  }
  return 'settled';
}

function mapResult(raw?: string): BetResult {
  const s = (raw ?? '').toLowerCase();
  if (!s) return null;
  if (s.includes('win') || s.includes('won')) return 'win';
  if (s.includes('los') || s.includes('lost')) return 'loss';
  if (s.includes('push') || s.includes('tie')) return 'push';
  if (s.includes('void') || s.includes('cancel') || s.includes('refund')) return 'void';
  if (['open', 'pending', 'unsettled', 'live'].some((k) => s.includes(k))) return null;
  return null;
}

/** Realized return for a settled bet: use the book's figure when present, else derive. */
function settledPayout(result: BetResult, stake: number, reported?: number): number {
  if (reported !== undefined && Number.isFinite(reported)) return reported;
  switch (result) {
    case 'win':
      return stake; // unknown profit -> at least return stake; refine from real payload
    case 'push':
    case 'void':
      return stake;
    case 'loss':
    default:
      return 0;
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v.replace(/[^0-9.+-]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function iso(v?: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

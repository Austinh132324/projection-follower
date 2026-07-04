import type { Leg, NormalizedBet, RawBet, BetResult, BetStatus } from '../../normalize/bet.js';
import { round2 } from '../../normalize/odds.js';

/**
 * PrizePicks -> common model.
 *
 * PrizePicks is DFS pick'em, not graded sportsbook wagers, so its structure
 * differs — but it maps cleanly onto the same model:
 *
 *   - One ENTRY  -> one NormalizedBet with betType `dfs_entry`.
 *   - Each PICK  -> one Leg (player projection: "over/under a stat line").
 *   - `stake`    -> entry fee. `potentialPayout` -> max/current payout.
 *   - There are no American odds on legs (it's over/under), so `oddsAmerican`
 *     stays null; the leg's `market` carries the stat + line instead
 *     (e.g. "Points • Over 27.5").
 *
 * Result rolls up from the picks: an entry wins when enough picks hit (flex vs.
 * power play), but we record the entry-level result the API reports and keep the
 * per-pick results on the legs.
 */

interface PpEntry {
  id?: string | number;
  status?: string; // e.g. "open", "settled", "won", "lost"
  result?: string;
  fee?: number | string; // entry fee (stake)
  amount?: number | string;
  payout?: number | string;
  maxPayout?: number | string;
  toWin?: number | string;
  created_at?: string;
  createdAt?: string;
  settled_at?: string;
  settledAt?: string;
  picks?: PpPick[];
  projections?: PpPick[];
}

interface PpPick {
  id?: string | number;
  playerName?: string;
  name?: string;
  statType?: string; // "Points", "Rebounds", ...
  line?: number | string; // the projection line, e.g. 27.5
  lineScore?: number | string;
  choice?: string; // "over" | "under"
  wager_type?: string;
  result?: string; // "win" | "loss" | "push" | "dnp"/"void"
  status?: string;
  gameName?: string;
  description?: string;
}

export function normalizePrizePicks(raw: RawBet): NormalizedBet {
  const e = (raw.payload ?? {}) as PpEntry;
  const picks = e.picks ?? e.projections ?? [];

  const legs: Leg[] = picks.map((p, i) => {
    const line = num(p.line) ?? num(p.lineScore);
    const choice = (p.choice ?? '').toString();
    const stat = p.statType ?? '';
    const market = [stat, choice && line != null ? `${cap(choice)} ${line}` : choice]
      .filter(Boolean)
      .join(' • ');
    return {
      id: String(p.id ?? i),
      selection: p.playerName ?? p.name ?? p.description ?? `Pick ${i + 1}`,
      market: market || undefined,
      event: p.gameName,
      oddsAmerican: null, // pick'em: no per-leg American odds
      result: mapResult(p.result ?? p.status),
    };
  });

  const status = mapStatus(e.status ?? e.result);
  const result = status === 'settled' ? mapResult(e.result ?? e.status) : null;
  const stake = num(e.fee) ?? num(e.amount) ?? 0;
  const potentialPayout = num(e.maxPayout) ?? num(e.toWin) ?? num(e.payout) ?? stake;
  const payout =
    status === 'settled' ? (num(e.payout) ?? (result === 'win' ? potentialPayout : 0)) : null;

  return {
    book: 'prizepicks',
    betId: String(e.id ?? raw.betId),
    betType: 'dfs_entry',
    status,
    result,
    placedAt: iso(e.created_at ?? e.createdAt) ?? new Date(0).toISOString(),
    settledAt: iso(e.settled_at ?? e.settledAt),
    stake: round2(stake),
    oddsAmerican: null,
    potentialPayout: round2(potentialPayout),
    payout: payout === null ? null : round2(payout),
    currency: 'USD',
    legs,
    raw: raw.payload,
  };
}

function mapStatus(raw?: string): BetStatus {
  const s = (raw ?? '').toLowerCase();
  return ['open', 'pending', 'in_progress', 'live', 'submitted'].some((k) => s.includes(k))
    ? 'open'
    : 'settled';
}

function mapResult(raw?: string): BetResult {
  const s = (raw ?? '').toLowerCase();
  if (!s) return null;
  if (s.includes('win') || s.includes('won')) return 'win';
  if (s.includes('los') || s.includes('lost')) return 'loss';
  if (s.includes('push') || s.includes('tie') || s.includes('refund')) return 'push';
  if (s.includes('void') || s.includes('dnp') || s.includes('cancel')) return 'void';
  return null;
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

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

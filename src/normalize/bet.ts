/**
 * The common, book-agnostic bet model.
 *
 * Every book's scraper produces a `RawBet` (untouched provider payload) and a
 * `NormalizedBet` (this shape). The dashboard, analytics, and DB only ever see
 * `NormalizedBet` — book-specific quirks stop at the scraper boundary. The raw
 * payload is retained on the DB row so we can re-normalize retroactively when a
 * mapping bug is found, without re-scraping.
 *
 * PrizePicks is DFS (pick'em entries), not graded single/parlay wagers. It maps
 * onto this same model: an entry becomes one `NormalizedBet` of type `dfs_entry`,
 * and each projection/pick becomes a `Leg`. See src/books/prizepicks.
 */

export type Book = 'draftkings' | 'fanduel' | 'prizepicks';

export const BOOK_LABELS: Record<Book, string> = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  prizepicks: 'PrizePicks',
};

export type BetType = 'single' | 'parlay' | 'prop' | 'dfs_entry';

export type BetStatus = 'open' | 'settled';

/** Outcome of a settled bet (or leg). `null` while still open. */
export type BetResult = 'win' | 'loss' | 'push' | 'void' | null;

export interface Leg {
  /** Stable per-leg id if the book provides one; otherwise index-derived. */
  id: string;
  /** Human-readable selection, e.g. "Lakers -4.5" or "LeBron James Over 27.5 PTS". */
  selection: string;
  /** Market/category, e.g. "Point Spread", "Player Points". */
  market?: string;
  /** Event this leg belongs to, e.g. "Lakers @ Celtics". */
  event?: string;
  /** American odds for this leg when available (e.g. -110, +145). */
  oddsAmerican?: number | null;
  result: BetResult;
}

export interface NormalizedBet {
  book: Book;
  /** The book's own wager/entry id. Unique within a book; `(book, betId)` is the global key. */
  betId: string;
  betType: BetType;
  status: BetStatus;
  result: BetResult;

  /** ISO 8601 UTC. When the bet was placed. */
  placedAt: string;
  /** ISO 8601 UTC. When it settled, or null if still open. */
  settledAt: string | null;

  /** Amount risked, in account currency major units (dollars). */
  stake: number;
  /** Combined American odds for the whole ticket, when the book exposes it. */
  oddsAmerican: number | null;
  /** Total return if the bet wins (stake + profit). */
  potentialPayout: number;
  /**
   * Realized return once settled: full payout on win, 0 on loss, stake on push/void.
   * `null` while open. `payout - stake` is the net for a settled bet.
   */
  payout: number | null;

  currency: string;
  legs: Leg[];

  /** Untouched provider payload, retained for re-normalization and debugging. */
  raw: unknown;
}

/** A book scraper's pre-normalization output: an id plus the raw payload. */
export interface RawBet {
  betId: string;
  payload: unknown;
}

// --- Derivations ------------------------------------------------------------
// Analytics live here so books, DB, and UI agree on how numbers are computed.

/** Net profit/loss for a settled bet; 0 (unrealized) while open. */
export function netProfit(bet: NormalizedBet): number {
  if (bet.status !== 'settled' || bet.payout === null) return 0;
  return bet.payout - bet.stake;
}

/** Money currently at risk on unsettled bets. */
export function openExposure(bet: NormalizedBet): number {
  return bet.status === 'open' ? bet.stake : 0;
}

/** Whether a settled bet counts toward win rate (pushes/voids are excluded). */
export function isGraded(bet: NormalizedBet): boolean {
  return bet.status === 'settled' && (bet.result === 'win' || bet.result === 'loss');
}

export interface AggregateStats {
  count: number;
  settledCount: number;
  openCount: number;
  totalStaked: number;
  netProfit: number;
  /** ROI = net profit / total staked on *settled* bets. */
  roi: number;
  /** Win rate over graded (win/loss) bets only. */
  winRate: number;
  openExposure: number;
}

export function aggregate(bets: NormalizedBet[]): AggregateStats {
  let settledCount = 0;
  let openCount = 0;
  let totalStaked = 0;
  let settledStake = 0;
  let net = 0;
  let wins = 0;
  let graded = 0;
  let exposure = 0;

  for (const bet of bets) {
    totalStaked += bet.stake;
    if (bet.status === 'open') {
      openCount += 1;
      exposure += bet.stake;
    } else {
      settledCount += 1;
      settledStake += bet.stake;
      net += netProfit(bet);
      if (isGraded(bet)) {
        graded += 1;
        if (bet.result === 'win') wins += 1;
      }
    }
  }

  return {
    count: bets.length,
    settledCount,
    openCount,
    totalStaked,
    netProfit: net,
    roi: settledStake > 0 ? net / settledStake : 0,
    winRate: graded > 0 ? wins / graded : 0,
    openExposure: exposure,
  };
}

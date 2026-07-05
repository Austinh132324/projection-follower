// The common bet model, shared verbatim with the web app (web/src/types.ts).

export type Book = 'draftkings' | 'fanduel' | 'prizepicks' | 'other';

export const BOOK_LABELS: Record<Book, string> = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  prizepicks: 'PrizePicks',
  other: 'Other',
};

export const BOOK_ACCENT: Record<Book, string> = {
  draftkings: '#53d337',
  fanduel: '#1493ff',
  prizepicks: '#8b5cff',
  other: '#8a8aa3',
};

export const BOOKS: Book[] = ['draftkings', 'fanduel', 'prizepicks', 'other'];

export type BetSource = 'manual' | 'photo';

export type BetType = 'single' | 'parlay' | 'prop' | 'dfs_entry';

export const BET_TYPE_LABELS: Record<BetType, string> = {
  single: 'Single',
  parlay: 'Parlay',
  prop: 'Prop',
  dfs_entry: 'DFS Entry',
};

export type BetStatus = 'open' | 'settled';
export type BetResult = 'win' | 'loss' | 'push' | 'void' | null;

export interface Leg {
  id: string;
  selection: string;
  market?: string;
  event?: string;
  oddsAmerican?: number | null;
  result: BetResult;
}

export interface Bet {
  book: Book;
  betId: string;
  betType: BetType;
  status: BetStatus;
  result: BetResult;
  placedAt: string;
  settledAt: string | null;
  stake: number;
  oddsAmerican: number | null;
  potentialPayout: number;
  payout: number | null;
  currency: string;
  legs: Leg[];

  /** How the bet was entered. */
  source: BetSource;
  /** ESPN league id (see espn.ts LEAGUES) for live stats + prediction matching. */
  league?: string | null;
  /** Kickoff/first-pitch time for ESPN matching; defaults to placedAt if unknown. */
  eventDate?: string | null;
  /** Original OCR text when imported from a photo. */
  raw?: unknown;
}

export interface Filter {
  books: Book[];
  status: BetStatus | 'all';
  betType: BetType | 'all';
}

export const EMPTY_FILTER: Filter = { books: [], status: 'all', betType: 'all' };

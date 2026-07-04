// Frontend mirror of the backend common model (src/normalize/bet.ts). Kept as a
// small, standalone copy so the web app builds independently of the Node package
// — the API returns exactly this shape.

export type Book = 'draftkings' | 'fanduel' | 'prizepicks';

export const BOOK_LABELS: Record<Book, string> = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  prizepicks: 'PrizePicks',
};

export const BOOK_ACCENT: Record<Book, string> = {
  draftkings: '#53d337',
  fanduel: '#1493ff',
  prizepicks: '#8b5cff',
};

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
}

export interface Filter {
  books: Book[];
  status: BetStatus | 'all';
  betType: BetType | 'all';
}

export const EMPTY_FILTER: Filter = { books: [], status: 'all', betType: 'all' };

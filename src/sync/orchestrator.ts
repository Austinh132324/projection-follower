import type { Book, NormalizedBet } from '../normalize/bet.js';
import { getScraper } from '../books/registry.js';
import { withSession, SessionExpiredError, hasSession } from '../session/manager.js';
import {
  upsertBets,
  recordSyncSuccess,
  recordSyncError,
  getSyncState,
} from '../db/repository.js';
import { config } from '../config.js';

/**
 * The sync orchestrator: the one callable that both cron and the UI use to pull
 * fresh data. It is deliberately book-isolated — each book runs in its own
 * try/catch, so one book breaking (site redesign, expired session) never blocks
 * the others. Results report per-book outcomes for the caller to surface.
 */

export interface BookSyncResult {
  book: Book;
  ok: boolean;
  fetched: number;
  inserted: number;
  updated: number;
  needsReauth: boolean;
  error?: string;
}

export interface SyncResult {
  startedAt: string;
  finishedAt: string;
  books: BookSyncResult[];
}

export interface SyncOptions {
  /** Books to sync; defaults to config.books. */
  books?: Book[];
  headless?: boolean;
  maxRecords?: number;
}

export async function syncBook(book: Book, opts: SyncOptions = {}): Promise<BookSyncResult> {
  const scraper = getScraper(book);
  const base: BookSyncResult = {
    book,
    ok: false,
    fetched: 0,
    inserted: 0,
    updated: 0,
    needsReauth: false,
  };

  if (!hasSession(book)) {
    return { ...base, needsReauth: true, error: `No saved session. Run: npm run login -- ${book}` };
  }

  try {
    const since = getSyncState(book)?.lastBetPlacedAt ?? undefined;
    const raw = await withSession(
      book,
      (context) => scraper.fetchRawBets(context, { since, maxRecords: opts.maxRecords }),
      { headless: opts.headless ?? config.headless },
    );

    const normalized: NormalizedBet[] = raw.map((r) => scraper.normalize(r));
    const { inserted, updated } = upsertBets(normalized);
    const watermark = newestPlacedAt(normalized);
    recordSyncSuccess(book, watermark);

    return { ...base, ok: true, fetched: raw.length, inserted, updated };
  } catch (err) {
    const needsReauth = err instanceof SessionExpiredError;
    const message = err instanceof Error ? err.message : String(err);
    recordSyncError(book, message);
    return { ...base, needsReauth, error: message };
  }
}

/** Sync every requested book. Never throws — failures are captured per-book. */
export async function syncAll(opts: SyncOptions = {}): Promise<SyncResult> {
  const books = opts.books ?? (config.books as Book[]);
  const startedAt = new Date().toISOString();
  const results: BookSyncResult[] = [];

  // Sequential: each book drives its own browser; running them serially keeps
  // resource use predictable for a personal tool. Parallelize later if needed.
  for (const book of books) {
    results.push(await syncBook(book, opts));
  }

  return { startedAt, finishedAt: new Date().toISOString(), books: results };
}

function newestPlacedAt(bets: NormalizedBet[]): string | null {
  let newest: string | null = null;
  for (const b of bets) {
    if (!newest || b.placedAt > newest) newest = b.placedAt;
  }
  return newest;
}

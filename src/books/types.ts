import type { BrowserContext } from 'playwright';
import type { Book, NormalizedBet, RawBet } from '../normalize/bet.js';

export interface FetchOptions {
  /**
   * Only fetch bets placed at/after this ISO timestamp when the book supports
   * incremental pulls. Advisory — a book that can only return a full history
   * may ignore it, and the sync layer will upsert-dedupe regardless.
   */
  since?: string;
  /** Safety cap on pages/records for a single run. */
  maxRecords?: number;
}

/**
 * The contract every book module implements. Adding a book = implementing this
 * once; nothing else in the system changes. A book breaking (site redesign)
 * fails in isolation inside its own `fetchRawBets`.
 */
export interface BookScraper {
  readonly book: Book;

  /** Where interactive login sends you. */
  readonly loginUrl: string;

  /**
   * True when the given context holds a valid, logged-in session. Used both by
   * the interactive-login poller and by callers wanting a cheap pre-check.
   * Should be a lightweight signal (auth cookie present, or a 200 from a
   * whoami-style endpoint) — not a full bet fetch.
   */
  isLoggedIn(context: BrowserContext): Promise<boolean>;

  /**
   * Pull raw bet records using the authenticated context. Implementations should
   * hit the book's JSON XHR endpoint via `context.request` (which carries the
   * session cookies) rather than scraping HTML. Must throw `SessionExpiredError`
   * when the session is no longer valid so the caller can prompt for re-auth.
   */
  fetchRawBets(context: BrowserContext, opts: FetchOptions): Promise<RawBet[]>;

  /** Map one raw record to the common model. Pure — no network. */
  normalize(raw: RawBet): NormalizedBet;
}

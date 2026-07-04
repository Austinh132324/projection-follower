import type { BrowserContext } from 'playwright';
import type { RawBet } from '../../normalize/bet.js';
import type { BookScraper, FetchOptions } from '../types.js';
import { SessionExpiredError } from '../../session/manager.js';
import { normalizePrizePicks } from './normalize.js';

/**
 * PrizePicks — DFS pick'em. The `normalize` mapping is implemented (see
 * normalize.ts) to show how entries fold into the common schema. `fetchRawBets`
 * is a documented stub: PrizePicks exposes an entries endpoint that hobbyist
 * repos use, so this is the most approachable one to finish.
 *
 * To complete it: log in, open your entries page, find the XHR returning your
 * entries JSON (commonly under an `/entries` path returning `{ data: [...] }`),
 * and call it here via `context.request`, mapping into RawBet the same way the
 * DraftKings module does.
 */
export const prizepicks: BookScraper = {
  book: 'prizepicks',
  loginUrl: 'https://app.prizepicks.com/',

  async isLoggedIn(_context: BrowserContext): Promise<boolean> {
    throw new Error('PrizePicks scraper not implemented yet');
  },

  async fetchRawBets(_context: BrowserContext, _opts: FetchOptions): Promise<RawBet[]> {
    // When implemented, mirror DraftKings:
    //   const res = await context.request.get(ENTRIES_ENDPOINT, { failOnStatusCode: false });
    //   if (res.status() === 401 || res.status() === 403) throw new SessionExpiredError('prizepicks');
    //   return extractEntries(await res.json()).map(...);
    void SessionExpiredError; // referenced for the pattern above
    throw new Error('PrizePicks scraper not implemented yet');
  },

  normalize(raw: RawBet) {
    return normalizePrizePicks(raw);
  },
};

import type { BrowserContext } from 'playwright';
import type { RawBet } from '../../normalize/bet.js';
import type { BookScraper, FetchOptions } from '../types.js';

/**
 * FanDuel — stub. Implement against the BookScraper contract, mirroring the
 * DraftKings module: find the bet-history JSON XHR (DevTools > Network), call it
 * via `context.request`, and put all FanDuel-specific field mapping in a sibling
 * `normalize.ts`. Nothing else in the system needs to change to add it.
 */
export const fanduel: BookScraper = {
  book: 'fanduel',
  loginUrl: 'https://sportsbook.fanduel.com/',

  async isLoggedIn(_context: BrowserContext): Promise<boolean> {
    throw new Error('FanDuel scraper not implemented yet');
  },

  async fetchRawBets(_context: BrowserContext, _opts: FetchOptions): Promise<RawBet[]> {
    throw new Error('FanDuel scraper not implemented yet');
  },

  normalize(_raw: RawBet) {
    throw new Error('FanDuel normalize not implemented yet');
  },
};

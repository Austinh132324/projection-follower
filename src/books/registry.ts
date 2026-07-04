import type { Book } from '../normalize/bet.js';
import type { BookScraper } from './types.js';
import { draftkings } from './draftkings/index.js';
import { fanduel } from './fanduel/index.js';
import { prizepicks } from './prizepicks/index.js';

/**
 * The single place books are registered. The sync orchestrator and CLI look
 * scrapers up here; adding a book is one line plus its module.
 */
export const SCRAPERS: Record<Book, BookScraper> = {
  draftkings,
  fanduel,
  prizepicks,
};

export function getScraper(book: string): BookScraper {
  const scraper = SCRAPERS[book as Book];
  if (!scraper) {
    throw new Error(`Unknown book "${book}". Known: ${Object.keys(SCRAPERS).join(', ')}`);
  }
  return scraper;
}

/** Books that are fully wired end-to-end (login → fetch → normalize → store). */
export const IMPLEMENTED_BOOKS: Book[] = ['draftkings'];

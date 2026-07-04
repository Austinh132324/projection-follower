import { argv } from 'node:process';
import { pathToFileURL } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { queryBets, getSyncState, type BetFilter } from '../db/repository.js';
import { aggregate, BOOK_LABELS, type Book, type BetStatus, type BetType } from '../normalize/bet.js';
import { syncAll } from '../sync/orchestrator.js';
import { SCRAPERS, IMPLEMENTED_BOOKS } from '../books/registry.js';
import { hasSession } from '../session/manager.js';

/**
 * Read/reporting API for the dashboard, plus a "sync now" trigger. The analytics
 * are computed in the shared `aggregate()` so the API and any other consumer
 * agree on the numbers. Bound to localhost — this is a personal tool.
 */

const app = express();
app.use(express.json());

function parseFilter(q: Request['query']): BetFilter {
  const filter: BetFilter = {};
  if (typeof q.books === 'string' && q.books.trim()) {
    filter.books = q.books.split(',').map((b) => b.trim()) as Book[];
  }
  if (typeof q.status === 'string' && (q.status === 'open' || q.status === 'settled')) {
    filter.status = q.status as BetStatus;
  }
  if (typeof q.betType === 'string' && q.betType) {
    filter.betType = q.betType as BetType;
  }
  if (typeof q.from === 'string' && q.from) filter.from = q.from;
  if (typeof q.to === 'string' && q.to) filter.to = q.to;
  return filter;
}

/** Bets + aggregate stats for the current filter, in one round-trip. */
app.get('/api/bets', (req: Request, res: Response) => {
  const filter = parseFilter(req.query);
  const bets = queryBets(filter);
  res.json({ bets, stats: aggregate(bets), filter });
});

/** Stats only (lighter payload for the header tiles). */
app.get('/api/stats', (req: Request, res: Response) => {
  const bets = queryBets(parseFilter(req.query));
  res.json(aggregate(bets));
});

/** Book metadata + per-book session/sync status, for the filter bar and banners. */
app.get('/api/books', (_req: Request, res: Response) => {
  const books = (Object.keys(SCRAPERS) as Book[]).map((book) => ({
    book,
    label: BOOK_LABELS[book],
    implemented: IMPLEMENTED_BOOKS.includes(book),
    hasSession: hasSession(book),
    sync: getSyncState(book),
  }));
  res.json({ books });
});

/** Trigger a sync on demand. Same code path cron uses. */
app.post('/api/sync', async (req: Request, res: Response) => {
  try {
    const books = Array.isArray(req.body?.books) ? (req.body.books as Book[]) : undefined;
    const result = await syncAll({ books });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Serve the built dashboard if present (npm run web:build), so a single process
// hosts both API and UI in "production".
app.use(express.static(new URL('../../web/dist', import.meta.url).pathname));

const isMain = argv[1] ? import.meta.url === pathToFileURL(argv[1]).href : false;
if (isMain || process.env.PF_START_SERVER) {
  app.listen(config.port, () => {
    console.log(`projection-follower API on http://localhost:${config.port}`);
  });
}

export { app };

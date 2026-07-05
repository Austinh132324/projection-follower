import { argv } from 'node:process';
import { pathToFileURL } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import {
  queryBets,
  upsertBets,
  deleteBet,
  type BetFilter,
} from '../db/repository.js';
import {
  aggregate,
  BOOK_LABELS,
  type Book,
  type BetStatus,
  type BetType,
  type NormalizedBet,
} from '../normalize/bet.js';

/**
 * Backend for "real mode": local persistence for hand-entered / photo-imported
 * bets, plus an ESPN proxy (so the browser can dodge CORS when the API is up).
 * The static GitHub Pages build doesn't use this — it persists to localStorage
 * and calls ESPN directly. Bound to localhost; personal tool.
 */

const app = express();
app.use(express.json({ limit: '2mb' }));

function parseFilter(q: Request['query']): BetFilter {
  const filter: BetFilter = {};
  if (typeof q.books === 'string' && q.books.trim()) {
    filter.books = q.books.split(',').map((b) => b.trim()) as Book[];
  }
  if (q.status === 'open' || q.status === 'settled') filter.status = q.status as BetStatus;
  if (typeof q.betType === 'string' && q.betType) filter.betType = q.betType as BetType;
  if (typeof q.from === 'string' && q.from) filter.from = q.from;
  if (typeof q.to === 'string' && q.to) filter.to = q.to;
  return filter;
}

app.get('/api/bets', (req: Request, res: Response) => {
  const filter = parseFilter(req.query);
  const bets = queryBets(filter);
  res.json({ bets, stats: aggregate(bets), filter });
});

app.get('/api/stats', (req: Request, res: Response) => {
  res.json(aggregate(queryBets(parseFilter(req.query))));
});

app.get('/api/books', (_req: Request, res: Response) => {
  res.json({
    books: (Object.keys(BOOK_LABELS) as Book[]).map((book) => ({ book, label: BOOK_LABELS[book] })),
  });
});

/** Create/update a hand-entered or photo-imported bet. */
app.post('/api/bets', (req: Request, res: Response) => {
  const bet = req.body as NormalizedBet;
  if (!bet?.book || !bet?.betId || !Array.isArray(bet.legs)) {
    return res.status(400).json({ error: 'Invalid bet: book, betId, and legs are required.' });
  }
  const { inserted, updated } = upsertBets([bet]);
  res.json({ ok: true, inserted, updated });
});

app.delete('/api/bets/:book/:betId', (req: Request, res: Response) => {
  const removed = deleteBet(req.params.book as Book, String(req.params.betId));
  res.json({ ok: removed });
});

/**
 * ESPN proxy. Forwards a whitelisted ESPN URL and returns its JSON, so the
 * browser can call ESPN through the same origin (no CORS) when the backend runs.
 */
app.get('/api/espn', async (req: Request, res: Response) => {
  const target = String(req.query.url ?? '');
  let host: string;
  try {
    host = new URL(target).host;
  } catch {
    return res.status(400).json({ error: 'Provide ?url=<espn url>' });
  }
  if (!/(^|\.)espn\.com$/.test(host)) {
    return res.status(403).json({ error: 'Only *.espn.com URLs are allowed.' });
  }
  try {
    const upstream = await fetch(target, { headers: { accept: 'application/json' } });
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Photo → structured bet. Stub for the pluggable server-side parser: wire a
 * vision LLM (e.g. Claude) here to turn an uploaded slip image into a bet. The
 * web app's on-device Tesseract parser is the default and needs none of this.
 */
app.post('/api/parse-slip', (_req: Request, res: Response) => {
  res.status(501).json({
    error:
      'Server-side slip parsing is not configured. The app uses on-device OCR by ' +
      'default; implement this endpoint with a vision LLM to enable higher-accuracy parsing.',
  });
});

app.use(express.static(new URL('../../web/dist', import.meta.url).pathname));

const isMain = argv[1] ? import.meta.url === pathToFileURL(argv[1]).href : false;
if (isMain || process.env.PF_START_SERVER) {
  app.listen(config.port, () => {
    console.log(`projection-follower API on http://localhost:${config.port}`);
  });
}

export { app };

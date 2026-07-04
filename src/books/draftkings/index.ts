import type { BrowserContext } from 'playwright';
import type { RawBet } from '../../normalize/bet.js';
import type { BookScraper, FetchOptions } from '../types.js';
import { SessionExpiredError } from '../../session/manager.js';
import { config } from '../../config.js';
import { normalizeDraftKings } from './normalize.js';

/**
 * DraftKings scraper — the proof-of-concept implementation of BookScraper.
 *
 * Strategy (in priority order):
 *   1. Call the known bet-history JSON endpoint directly via `context.request`,
 *      which carries the authenticated session cookies. Fast and clean.
 *   2. If that endpoint 404s / changed shape (site redesign), fall back to
 *      auto-discovery: open the bet-history page in the authenticated context,
 *      sniff network responses, and grab the JSON XHR that returns wagers.
 *
 * How to (re-)find the endpoint by hand when both paths fail:
 *   - Open DraftKings bet history while logged in, open DevTools > Network,
 *     filter by Fetch/XHR, and find the request whose JSON response contains
 *     your wagers. Copy its URL into PF_DK_WAGERS_ENDPOINT (env) — no code edit.
 */

const BET_HISTORY_URL = 'https://sportsbook.draftkings.com/mybets';
const LOGIN_URL = 'https://sportsbook.draftkings.com/';

// Best-effort default. DraftKings moves this; the env override + auto-discovery
// exist precisely because this line will eventually go stale. Verify against the
// Network tab and set PF_DK_WAGERS_ENDPOINT rather than trusting this blindly.
const DEFAULT_WAGERS_ENDPOINT =
  'https://api.draftkings.com/wagers/v1/wagers?status=all&limit=100';

export const draftkings: BookScraper = {
  book: 'draftkings',
  loginUrl: LOGIN_URL,

  async isLoggedIn(context: BrowserContext): Promise<boolean> {
    const endpoint = config.overrides.draftkingsWagersEndpoint ?? DEFAULT_WAGERS_ENDPOINT;
    try {
      const res = await context.request.get(endpoint, { failOnStatusCode: false });
      // 401/403 => not authenticated. 200 => good. Other codes (e.g. 404 from a
      // moved endpoint) are inconclusive, so fall back to a page-load check.
      if (res.status() === 200) return true;
      if (res.status() === 401 || res.status() === 403) return false;
    } catch {
      /* network hiccup — fall through to the page check */
    }
    return isLoggedInViaPage(context);
  },

  async fetchRawBets(context: BrowserContext, opts: FetchOptions): Promise<RawBet[]> {
    const endpoint = config.overrides.draftkingsWagersEndpoint ?? DEFAULT_WAGERS_ENDPOINT;

    // Path 1: direct endpoint call.
    try {
      const res = await context.request.get(endpoint, { failOnStatusCode: false });
      if (res.status() === 401 || res.status() === 403) {
        throw new SessionExpiredError('draftkings');
      }
      if (res.status() === 200) {
        const body = (await res.json()) as unknown;
        const wagers = extractWagers(body);
        if (wagers.length > 0) return toRawBets(wagers, opts);
      }
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
      // else fall through to discovery
    }

    // Path 2: auto-discovery via the bet-history page.
    return discoverAndFetch(context, opts);
  },

  normalize(raw: RawBet) {
    return normalizeDraftKings(raw);
  },
};

async function isLoggedInViaPage(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto(BET_HISTORY_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // If DK bounced us to a login/SSO screen, we're not authenticated.
    const url = page.url();
    if (/login|signin|sso|account.*login/i.test(url)) return false;
    return true;
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

/**
 * Load the bet-history page in the authenticated context and capture the JSON
 * response(s) that look like wagers. Resilient to endpoint moves because it
 * keys off response *shape*, not a hardcoded URL.
 */
async function discoverAndFetch(context: BrowserContext, opts: FetchOptions): Promise<RawBet[]> {
  const page = await context.newPage();
  const captured: unknown[] = [];
  const pending: Promise<unknown>[] = [];

  page.on('response', (response) => {
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('application/json')) return;
    // Defer body reads; collect promises to await after navigation settles.
    pending.push(
      response
        .json()
        .then((body) => {
          const wagers = extractWagers(body);
          if (wagers.length > 0) {
            captured.push(...wagers);
            if (process.env.PF_LOG_DISCOVERY) {
              console.log(`[draftkings] discovered wagers at: ${response.url()}`);
            }
          }
        })
        .catch(() => undefined),
    );
  });

  try {
    await page.goto(BET_HISTORY_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    if (/login|signin|sso/i.test(page.url())) {
      throw new SessionExpiredError('draftkings');
    }
    // Give lazy-loaded XHRs a beat, then drain the body reads.
    await page.waitForTimeout(2500);
    await Promise.allSettled(pending);
  } finally {
    await page.close();
  }

  if (captured.length === 0) {
    throw new Error(
      '[draftkings] Could not locate a wagers JSON response. The site likely changed. ' +
        'Find the endpoint in DevTools > Network and set PF_DK_WAGERS_ENDPOINT.',
    );
  }
  return toRawBets(captured, opts);
}

/**
 * Pull an array of wager objects out of an arbitrary JSON body. DK has wrapped
 * wagers under several keys over time; we probe the common ones and otherwise
 * fall back to "the first array of objects that look like wagers".
 */
function extractWagers(body: unknown): unknown[] {
  if (Array.isArray(body)) return body.filter(looksLikeWager);
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['wagers', 'bets', 'data', 'results', 'items']) {
      const val = obj[key];
      if (Array.isArray(val) && val.some(looksLikeWager)) return val.filter(looksLikeWager);
      // one level of nesting, e.g. { data: { wagers: [...] } }
      if (val && typeof val === 'object') {
        const nested = extractWagers(val);
        if (nested.length > 0) return nested;
      }
    }
  }
  return [];
}

function looksLikeWager(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const hasId = 'id' in o || 'betId' in o;
  const hasBetish =
    'stake' in o || 'selections' in o || 'legs' in o || 'potentialReturns' in o || 'status' in o;
  return hasId && hasBetish;
}

function toRawBets(wagers: unknown[], opts: FetchOptions): RawBet[] {
  const limited = opts.maxRecords ? wagers.slice(0, opts.maxRecords) : wagers;
  return limited.map((payload, i) => {
    const o = (payload ?? {}) as Record<string, unknown>;
    return { betId: String(o.id ?? o.betId ?? i), payload };
  });
}

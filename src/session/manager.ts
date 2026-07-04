import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Browser, BrowserContext } from 'playwright';
import { config, ensureDataDirs } from '../config.js';
import type { Book } from '../normalize/bet.js';

/**
 * Session persistence for authenticated scraping.
 *
 * The model: you log in *yourself* once, in a visible browser, clearing any 2FA.
 * We snapshot Playwright's `storageState` (cookies + localStorage) to disk, and
 * every later run reuses it — no re-login, no stored password. When the session
 * expires, the scraper throws `SessionExpiredError`, and you re-run the
 * interactive login to refresh the snapshot.
 *
 * The storageState file is effectively a live credential. It lives under
 * `data/sessions/` which is gitignored; treat it like a password.
 */

export class SessionExpiredError extends Error {
  constructor(public readonly book: Book) {
    super(`Session for "${book}" is expired or missing. Run: npm run login -- ${book}`);
    this.name = 'SessionExpiredError';
  }
}

function statePath(book: Book): string {
  return path.join(config.sessionDir, `${book}.json`);
}

export function hasSession(book: Book): boolean {
  return fs.existsSync(statePath(book));
}

/**
 * Open an authenticated context from a saved session. Throws
 * `SessionExpiredError` if no snapshot exists yet — callers should surface that
 * as a prompt to run the interactive login. Whether the session is still *valid*
 * (vs. logged out server-side) can only be known by making a request; scrapers
 * detect that and re-throw `SessionExpiredError`.
 */
export async function openAuthenticatedContext(
  book: Book,
  opts: { headless?: boolean } = {},
): Promise<{ browser: Browser; context: BrowserContext }> {
  if (!hasSession(book)) throw new SessionExpiredError(book);
  const browser = await chromium.launch({ headless: opts.headless ?? config.headless });
  const context = await browser.newContext({
    storageState: statePath(book),
    userAgent: DEFAULT_UA,
    viewport: { width: 1440, height: 900 },
  });
  return { browser, context };
}

/**
 * Interactive first-login. Opens a *visible* browser at the book's login page
 * and waits until you've signed in (and cleared 2FA), detected by
 * `isLoggedIn(page)`. Then it snapshots storageState to disk.
 *
 * `isLoggedIn` is provided by each book module — usually "is there an auth
 * cookie" or "did we land on the account/logged-in URL".
 */
export async function interactiveLogin(
  book: Book,
  loginUrl: string,
  isLoggedIn: (context: BrowserContext) => Promise<boolean>,
  opts: { timeoutMs?: number } = {},
): Promise<void> {
  ensureDataDirs();
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: DEFAULT_UA,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    console.log(
      `\n[${book}] A browser window opened. Log in (including any 2FA).\n` +
        `Waiting up to ${Math.round(timeoutMs / 1000)}s for a successful login…\n`,
    );

    const deadline = Date.now() + timeoutMs;
    // Poll for the logged-in signal rather than racing a single navigation —
    // real logins bounce through SSO/2FA redirects unpredictably.
    while (Date.now() < deadline) {
      if (await isLoggedIn(context).catch(() => false)) {
        await context.storageState({ path: statePath(book) });
        console.log(`[${book}] Login detected. Session saved to ${statePath(book)}`);
        return;
      }
      await page.waitForTimeout(1500);
    }
    throw new Error(
      `[${book}] Timed out waiting for login. Nothing was saved. Re-run when ready.`,
    );
  } finally {
    await browser.close();
  }
}

/**
 * Run `fn` against an authenticated context, guaranteeing cleanup. If the
 * scraper detects an invalid session it should throw `SessionExpiredError`,
 * which propagates so the caller can prompt for re-auth.
 */
export async function withSession<T>(
  book: Book,
  fn: (context: BrowserContext) => Promise<T>,
  opts: { headless?: boolean } = {},
): Promise<T> {
  const { browser, context } = await openAuthenticatedContext(book, opts);
  try {
    const result = await fn(context);
    // Persist any refreshed cookies/tokens the site rotated during the run.
    await context.storageState({ path: statePath(book) });
    return result;
  } finally {
    await browser.close();
  }
}

/** A recent desktop Chrome UA; keeps us looking like the browser you logged in with. */
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

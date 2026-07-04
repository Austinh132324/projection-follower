# Projection Follower

A personal, single-user bet tracker: it logs into your own sportsbook/DFS accounts via browser automation, pulls your bet history, and shows W/L, ROI, and open exposure on one dashboard. DraftKings works end-to-end today; FanDuel and PrizePicks are stubs on the same interface.

> Personal use only — your accounts, your data, all local. These books have no bet-history API, so the only path is being authenticated as you; expect a scraper to break on a site redesign, and fixing one book is isolated.

## Architecture

One TypeScript codebase with clean boundaries: isolated scraper per book → common normalization → SQLite → sync orchestrator → Express API → React dashboard. The flow is **scraper (raw) → normalize → DB → API → UI**, and only the common model ever leaves the scraper (raw payloads are retained for re-normalization).

```
src/
  normalize/bet.ts     ★ common model + analytics (ROI/win-rate/exposure)
  books/               one module per book (draftkings ★, fanduel, prizepicks)
  session/manager.ts   Playwright storageState: login, persist, expiry
  db/                  schema + idempotent upserts + queries
  sync/orchestrator.ts ★ standalone sync — cron and UI both call it
  server/ · cli/       Express API · login/sync commands
web/                   React + Vite dashboard (mobile-first, animated)
```

## Session persistence

You log in yourself once in a visible browser (clearing 2FA), and Playwright snapshots `storageState` to `data/sessions/<book>.json` so later runs reuse it — no stored password. An invalid session throws `SessionExpiredError`, which surfaces as a prompt to re-run `npm run login`.

## DraftKings scraper

It calls the bet-history JSON endpoint via the authenticated `context.request`, and if that endpoint has moved it falls back to auto-discovery (sniffing the page's network responses for wager-shaped JSON). When both fail, set `PF_DK_WAGERS_ENDPOINT` in `.env` — a redesign is an env change, not a code edit. Adding FanDuel/PrizePicks means implementing `BookScraper` once and registering it.

## Common schema & PrizePicks

`NormalizedBet` captures book, id, type, status, result, stake, odds, payouts, and `legs[]`, keyed by `(book, betId)` with idempotent upserts so open bets become settled on a later sync. PrizePicks folds in cleanly: one entry → one `dfs_entry` bet, each pick → a leg (stat line in `leg.market`, e.g. `Points • Over 27.5`).

## Run it

```bash
npm install
npm run login -- draftkings   # one-time headed login (incl. 2FA)
npm run sync                  # fetch → normalize → store
npm run dev:server            # API on :4000
npm --prefix web run dev      # dashboard (VITE_USE_MOCK=false to hit the API)
```

Schedule syncs by pointing cron at `npm run sync`; the sync module is standalone so cron and the UI share one code path.

## Dashboard & GitHub Pages

Mobile-first React SPA with a bottom tab bar, animated transitions, and filterable bets. It runs fully static on GitHub Pages with bundled mock data — deploy via the Actions tab → *Deploy dashboard to Pages* → **Run workflow**, then log in with `austin` / `admin`.

> Mock data and mock login are demo-only, fenced in `MOCK …` comment blocks in `web/src/mock.ts` and `web/src/auth.tsx`. Delete both and flip `USE_MOCK` in `web/src/api.ts` to run against your real backend.

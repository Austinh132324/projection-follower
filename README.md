# Projection Follower

A personal, single-user bet tracker: log your bets by hand or by **snapping a photo of the slip**, then track W/L, ROI, and open exposure on one mobile dashboard. Tap any bet to pull its **live game score and a research-based win-likelihood from ESPN** — model vs. market, not just the odds.

> Personal use only — your bets, your device. Entry is manual or photo-OCR (no sportsbook logins); ESPN data is fetched live at runtime and is an estimate for research, not betting advice.

## Architecture

One TypeScript codebase: a mobile-first React + Vite dashboard (the star, runs fully static) and an optional Express + SQLite backend for persistence. Everything speaks one common bet model; the ESPN layer and OCR parser are self-contained modules.

```
web/src/
  espn.ts        ★ ESPN client: scoreboard/summary, event matching, prediction engine
  ocr.ts         ★ Photo → bet: pluggable parser (on-device Tesseract + remote-LLM stub)
  betDraft.ts    editable draft ↔ finalized bet (payout math)
  stats.ts       client-side filtering + aggregation (ROI/win-rate/exposure)
  api.ts         persistence: localStorage (static) or backend
  components/ · pages/   nav + Add FAB, entry form, photo import, bet detail, dashboard
src/             optional backend: db (SQLite) + Express (bet CRUD, ESPN proxy, parse-slip stub)
```

## Entering bets

Two ways, both on-device: type it in the form, or pick/scan a slip photo. Photo import runs OCR in your browser (`tesseract.js`), heuristically pre-fills the form, and you confirm before saving — the parser sits behind an interface so a higher-accuracy vision-LLM backend can be swapped in later.

## ESPN: live stats + prediction

Set a bet's league and it matches to the real ESPN game by team + date, showing a live/final scorebug. The **win-likelihood** blends ESPN's model-based Matchup Predictor with team records, then compares it to the odds-implied probability to surface an **edge** (model % − market %) — research over price.

> ESPN's endpoints are public but unofficial; calls run in your browser and shapes are parsed defensively. When the backend runs, ESPN is proxied through `/api/espn` to avoid CORS.

## Run it

```bash
# Static app only (what GitHub Pages ships) — no backend needed:
cd web && npm install && npm run dev

# With the optional persistence backend:
npm install && npm run dev:server      # API on :4000
cd web && VITE_USE_MOCK=false npm run dev
```

## Dashboard & GitHub Pages

Mobile-first SPA with a bottom tab bar + center Add button, animated transitions, filterable bets, and per-book/type stats. It runs fully static with browser-stored data — deploy via the Actions tab → *Deploy dashboard to Pages* → **Run workflow**, then log in with `austin` / `admin`.

> Mock data + mock login are demo-only, fenced in `MOCK …` comment blocks in `web/src/mock.ts` and `web/src/auth.tsx`. Delete them and set `VITE_USE_MOCK=false` to run against your real backend.

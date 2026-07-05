# BetFollow — mobile (React Native + Expo)

The native mobile version of the BetFollow bet tracker in `../web`. Same app,
same feature set, built with **React Native** and **Expo** so it runs as a real
iOS / Android app (and, via Expo's web target, in a browser too).

## What it does (same as the web dashboard)

- **Dashboard** — net P/L, ROI, win rate, open exposure, per-book breakdown, recent bets.
- **Bets** — filter by book / status / type; tap a bet for details.
- **Scout** — pick a league and it ranks today's games by ESPN win probability, flags the "locks", best value (model vs. market edge), and a lock parlay — each trackable in one tap.
- **Bet detail** — live/final ESPN scorebug, matchup countdown, win-probability chart, linescore, a research win-likelihood (model % vs. market-implied % → edge), and the Vegas odds ESPN publishes.
- **Stats** — profit by book (bar chart) and by bet type.
- **Add a bet** — manual entry form, or pick/snap a slip photo.
- **Local, private storage** — bets live on the device via `AsyncStorage`. No backend, no sportsbook logins.

The shared, DOM-free logic (`types`, `stats`, `betDraft`, `espn`) is ported
essentially verbatim from the web app, so the two stay behaviour-compatible.

### Difference from the web app

The web app runs slip OCR in the browser (`tesseract.js` + `<canvas>`), which
has no on-device equivalent in React Native. Here the two photo options pick /
capture an image and open the entry form tagged as a photo import for you to
confirm — the same "review before saving" flow, minus the auto-fill. A native
OCR/vision module can be dropped into `AddSheet` later.

## Run it locally

```bash
cd mobile
npm install
npm start            # Expo dev server — press i (iOS), a (Android), or w (web)
```

Open in **Expo Go** on your phone (scan the QR), or a simulator/emulator.
Log in with any mock user (`austin`, `brian`, `allison`, `steven`, `jordan`)
and password `admin` — the same demo gate as the web app (`src/lib/auth.tsx`).

## Build & deploy with EAS

Building installable binaries and shipping to the stores uses
[EAS Build](https://docs.expo.dev/build/introduction/). These steps need **your**
Expo account (and Apple / Google credentials) — they can't be done for you.

```bash
npm install -g eas-cli
eas login
eas init                       # creates the EAS project, fills app.json extra.eas.projectId

# Cloud builds:
eas build --platform android --profile preview      # installable APK
eas build --platform ios --profile preview          # internal-distribution build
eas build --platform all --profile production       # store-ready builds

# Submit to the stores (needs store credentials configured):
eas submit --platform android
eas submit --platform ios
```

Build profiles live in `eas.json`. A ready-to-use GitHub Actions workflow is at
`../.github/workflows/eas-build.yml` — add an `EXPO_TOKEN` repo secret
(Expo → account settings → access tokens) and run it from the Actions tab.

### Quick web deploy

Expo can also export a static web build, which can go anywhere (e.g. GitHub Pages):

```bash
npm run export:web        # outputs ./dist
```

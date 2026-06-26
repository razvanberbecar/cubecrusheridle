---
name: crazygames-qa
description: Run Cube Crusher Idle through the CrazyGames submission/QA checklist — build the production bundle, boot it headlessly, play the core loop, and assert SDK lifecycle, zero console errors, no disallowed external requests, and bundle size. Use before submitting or after significant changes, or when asked to verify CrazyGames compliance / publish-readiness.
---

# CrazyGames QA gate

Verifies the game meets CrazyGames' technical/QA bar. This is the runtime complement
to the auto-build Stop hook (which already guards build success + bundle cap).

## Procedure

1. **Build production bundle**
   ```bash
   npm run build
   ```
   Must end with `built in …`. Note the reported `dist/` sizes.

2. **Serve the built bundle** (NOT dev — test what ships):
   ```bash
   npm run preview   # serves dist/ (default http://localhost:4173)
   ```

3. **Drive it in a real browser** (Playwright MCP if available, else headless Chromium
   from `%LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win64\chrome.exe`). Run a full
   loop: dismiss the welcome popup ("START CRUSHING"), click the canvas to crush several
   cubes, trigger a boss (every 30 crushes), open/close the upgrade drawer, open the
   rebirth menu, toggle mute. Screenshot for a visual sanity check.

## Pass criteria (CrazyGames compliance)

- [ ] **Build clean** — `built in …`, no Vite errors/warnings.
- [ ] **Zero console errors** across the whole play session (warnings noted).
- [ ] **No disallowed external requests** — the ONLY external origin allowed is the CrazyGames SDK CDN. No other CDNs, fonts, analytics, or asset hosts. All game assets load from relative paths (`base: './'`).
- [ ] **SDK lifecycle fires** — `init()` awaited at boot; `loadingStart/Stop`; `gameplayStart/Stop` on menu↔gameplay and on tab blur/focus.
- [ ] **Ads guarded** — interstitial + rewarded requests go through the SDK wrapper; game never gets stuck-paused if an ad errors/no-fills; rewards only granted on `adFinished`.
- [ ] **Save works** — persists via the SDK with localStorage fallback; survives reload.
- [ ] **Bundle < 50 MB** (currently ~5 MB; flag if climbing).
- [ ] **Mobile** — `pointerdown` input (touch+mouse), viewport `viewport-fit=cover` / `user-scalable=no`, DPR/shadow scaling on touch devices, audio gated behind the START gesture.
- [ ] **Sitelock** present and not breaking local/preview runs.

## Output
Report each criterion as ✅ / ⚠️ / ❌ with the evidence (console excerpt, request list,
screenshot path, sizes). End with a clear PASS / NEEDS-WORK verdict. Remaining
real-device fps check and live ad-fill confirmation are user-only — call those out.

Related: [[crazygames-publish-readiness]] in memory.

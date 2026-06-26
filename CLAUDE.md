# Cube Crusher Idle

A hypercasual 3D idle/clicker for **CrazyGames**. Stack: **Vite + Three.js (r0.184) + vanilla JS**, no framework.

## Read first
- **GDD.md** — the original design doc (Three.js primitives, formulas, CrazyGames compliance). It is the *reference*, but the game has since evolved per user requests — see "Deviations from the GDD" below. **When GDD and current code disagree, the code + this file win.** Don't "restore" GDD behavior that was intentionally changed.

## Run / build / verify
There is no test suite. Verify changes by building (and by `npm run dev` when you need to see it).
- `npm run dev` — local dev server (HMR). Tell the user to open it; you can't see the canvas.
- `npm run build` — production build into `dist/`. **Always run this after code changes.**
- Quick build check (PowerShell, avoids stderr noise):
  ```
  $out = npm run build 2>&1 | Out-String; if ($out -match "built in") { "BUILD OK" } else { "BUILD FAILED"; $out }
  ```
- Bundle must stay well under CrazyGames' 50 MB cap (currently ~550 KB / ~141 KB gzip — Three.js dominates).

## Architecture (`src/`)
- `main.js` — entry: boot, save/load, input, the rAF game loop, pause flag, wires everything.
- `gameState.js` — single plain-object source of truth + `applySave` (whitelists known keys, incl. nested `rebirthBonuses`).
- `upgrades.js` — `UPGRADES` array (data-driven; UI renders generically), cost formula `ceil(base*growth^level)`, `recomputeStats`.
- `scene.js` — `createScene` (camera/lights/renderer/env-map/fog) + `createEnvironment` (factory room: floor/walls/ceiling, hanging blue lamps, corner pipes).
- `decorations.js` — `createDecorations`: warehouse props (racks, container, pallets, crates, barrels, forklift, hazard lines, etc.). **All static primitives are baked to world space and merged per material via `mergeGeometries` → ~15 draw calls.** No textures, no external models.
- `press.js` — hydraulic press mesh + down/up animation state machine; `update(ms)` returns true the frame it bottoms out.
- `conveyor.js` — continuous belt, cube spawning/flow, **crush zone**, golden-cube glow lifecycle, **boss cubes**, `reset()`.
- `cube.js` — cube factory (neon pool, golden, boss); golden cube's `PointLight` is on `userData.glow` (managed by conveyor, not parented).
- `particles.js` — pooled crush particles (100, sized/colored per burst).
- `ui.js` — DOM overlay: money counter, upgrade drawer, crit flash, boss health bar, rebirth button toggle.
- `rebirth.js` — prestige: `performRebirth(bonusId)` + radial web-menu wiring + corner badge.
- `audio.js` — synthesized SFX (crush/boss/purchase) + **procedural synthwave music engine** (look-ahead scheduler), all through one AudioContext; mute controls both. iOS resume fix.
- `sdk.js` — CrazyGames SDK wrapper (guarded), sitelock, save with localStorage fallback.
- `index.html` — canvas, SDK CDN tag, all DOM overlays (top bar, upgrade panel, welcome popup, rebirth overlay/badge, boss bar) + their CSS.

## Deviations from the GDD (intentional — keep them)
- **Auto-Speed upgrade REMOVED** → game is **manual-click only** (no idle auto-press, no offline earnings).
- **Continuous belt + miss mechanic**: cubes never stop; only crushable inside the crush zone (`CRUSH_HALF_WIDTH` in conveyor.js); a mistimed click misses and the cube rides off.
- **New upgrades**: Magnet, Golden Cube, Critical Hit (plus original Press Power, Conveyor Speed). Golden = ×10, crit = ×5 (×10 with Lucky Strikes rebirth), boss = ×25.
- **Boss cubes** every **30 crushes**: 2.4³ dark-red, 3 HP, blocks belt, DOM health bar, 25× reward, deeper sound.
- **Rebirth (prestige)** at `rebirthThreshold` ($5k, ×3 each): manual **Rebirth button** in top bar (never auto-opens) → radial web menu of 6 permanent bonuses banked in `gameState.rebirthBonuses`; resets run.
- **First-visit welcome popup** (localStorage `cci_visited`); freezes game until "START CRUSHING", which also starts music.
- **Industrial environment + warehouse decorations** added (not in GDD).

## Conventions / gotchas
- **No external assets** (no textures, no model files, no extra CDNs beyond the CrazyGames SDK). Everything is procedural Three.js primitives. CrazyGames needs relative paths (`vite.config.js` sets `base: './'`).
- Keep static decorative geometry **merged by material** to protect the 60fps mobile target; gameplay objects (cubes/particles) stay individual.
- The **gameplay zone `x:[-2,2] AND z:[-1,3]`** must stay clear of decorations.
- `paused` (main.js) gates all game logic and is shared by the welcome popup and the rebirth overlay; the loop still renders while paused.
- Money awards go through `awardMoney(multiplier)` in main.js (applies cube-value mult + crit). Don't add money directly elsewhere.
- Persist via `persist()` (every 30s, on purchase, on rebirth, on unload). Saves the whole `gameState`.
- Memory notes for this project live in the assistant's memory dir (`MEMORY.md` → `project_overview.md`) with finer detail.

## Automations (Claude Code setup — `.claude/`)
Tailored automations live in `.claude/` (generated via the `claude-code-setup` plugin's automation-recommender). New config registers on session start — after pulling/editing, open `/hooks` once or restart so it goes live.

- **Stop hook** — `.claude/settings.json` runs `.claude/hooks/postbuild-check.mjs` when Claude finishes a turn. Enforces the "always `npm run build`" rule: rebuilds **only if `src/`, `public/`, `index.html`, or `vite.config.js` changed** since the last build; on build failure exits 2 so the error is fed back and fixed before stopping; guards the bundle (warn 30 MB, hard-fail 47 MB, under the 50 MB CrazyGames cap). Edit thresholds in the script; review/disable via `/hooks`.
- **Skills** — `/regen-cover` (user-only): regenerates `icon_512.png` + `banner_1200x630.png` from the bundled Canvas2D generator (`.claude/skills/regen-cover/cover.html` → headless Chromium via `render.mjs`); edit `cover.html` to change the art. `/crazygames-qa`: runs the submission/QA checklist (SDK lifecycle, zero console errors, no stray external requests, save, bundle, mobile).
- **Subagents** — `threejs-perf-reviewer` (60 fps / merged-geometry / per-frame-alloc / leak review) and `crazygames-compliance-reviewer` (external resources, SDK usage, ad handling, bundle cap). Invoke for diff review of perf-sensitive or SDK/asset changes.
- **MCP servers** (project scope, in `~/.claude.json`) — **playwright** (`@playwright/mcp`): drive the running game in a real browser, click the canvas, screenshot, read console — the core QA loop. **context7** (`@upstash/context7-mcp`): version-correct Three.js r0.184 docs.

## Status (as of last session, 2026-06-26)
**Complete and launch-ready.** Builds clean. **Visuals done** (warehouse environment + decorations browser-verified — see `Screenshot.png`). **CrazyGames QA compliance verified.** SDK lifecycle, save, and **ads (interstitial + rewarded — "2× Money" and "Golden Surge" buttons)** all wired and working. Background music/SFX done. **Cover art done** — `icon_512.png` (512×512) + `banner_1200x630.png` (1200×630), redone 2026-06-26 as stylized game scenes (press crushing a neon cube on the hazard conveyor) with reworked branding. Generated from a self-contained Canvas2D script rendered via headless Chromium (not kept in repo; regenerate from scratch if needed).

**QA re-verified 2026-06-26** via `/crazygames-qa` against the production `dist/` bundle (headless Chromium, full play loop): build clean, **5.1 MB** bundle, **zero console errors**, **zero external requests** beyond the CrazyGames SDK, SDK lifecycle + ads + save + sitelock all correct, renders correctly. Verdict: **PASS**.

Polish/fixes landed this session (all building clean):
- **WebGL guard** (`main.js`): renderer creation wrapped in try/catch — devices without WebGL get a graceful "Couldn't start the 3D engine" message + `loadingStop()` instead of a black screen / uncaught throw.
- **Favicon 404 silenced** (`index.html`): added `<link rel="icon" href="data:," />` so the console is clean (the only console error was the auto-requested favicon).
- **Rebirth badge collision fixed** (`index.html`): `#rebirth-badge` moved into the `#boosts` flex column (was `position:fixed` on the same bottom-left corner as the ad buttons) so it stacks cleanly above the "2× Money"/"Golden Surge" buttons at any screen size.
- **Next-rebirth progress HUD** (`index.html` `#rebirth-progress` + `ui.js` `refreshRebirthProgress`): bottom-right block showing a progress bar + "$X to go" toward `rebirthThreshold` (turns teal "Rebirth ready ✦" when `money >= threshold`). Updated each frame from `refreshMoney` (guarded against redundant DOM writes).
- **Textures left uncompressed (deliberate):** the heavy files are 1024² RGB **normal maps** on the press; JPG/downscale would visibly degrade the hero object and the bundle is only 5.1 MB / 50 MB cap, so not worth it. Lossless-only if ever revisited.

Nothing left to build for launch. Remaining items are submission-only (upload to CrazyGames portal, real-device fps spot-check, confirm live ad fill).

**Planned next feature: Daily Prize** (7-day login-reward cycle, button under the balance) — full implementation spec in **`DAILY_PRIZE_PLAN.md`**. Deferred to a fresh session for full budget; build it from that plan.

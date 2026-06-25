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

## Status (as of last session, 2026-06-24)
Feature-complete for the loop above and **builds clean**. Not yet browser-verified for the latest warehouse/visual changes — placement/scale of decorations may need nudging. Not yet done: ad integration (interstitial/rewarded), background-music polish, game cover art (512×512 + 1200×630). SDK lifecycle + save are wired; ads are stubbed/guarded only.

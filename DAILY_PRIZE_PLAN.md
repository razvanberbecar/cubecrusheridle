# Daily Prize — Implementation Plan

> Build spec for the **daily login reward** feature. Written 2026-06-26 to be executed in a fresh session with full budget. Grounded in the current codebase — file/line references were accurate at write time; re-verify before editing.

## Goal
Log in and play each day → claim a prize. Rewards escalate over a **7-day cycle**; **day 7 is the big one**, then the cycle repeats. Opened from a **button under the balance** (top-left, under `#money-display`). Miss a day → streak resets to day 1.

---

## 1. State — `src/gameState.js`
Add two **numeric** fields to `gameState` (and they're auto-covered by the `DEFAULTS` spread + `applySave`'s numeric whitelist — **no `applySave` change needed**):
```js
dailyStreak: 0,        // 0 = never claimed; otherwise 1..7 (last claimed day in the cycle)
dailyLastClaimDay: 0,  // local-day index of last claim; 0 = never
```
Persistence is automatic via the existing `gameState` save (`persist()` → `saveGame`).

## 2. Logic — new module `src/daily.js` (mirror `rebirth.js` structure)
```js
import { gameState } from './gameState.js';

export const DAILY_REWARDS = [ /* 7 entries, see §3 */ ];

export function todayIndex() {
  const n = new Date();
  return Math.floor(new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() / 86400000);
}

// status: 'claimable' | 'claimed' (already today); activeDay = the tile to highlight (1..7)
export function getDailyState() {
  const today = todayIndex();
  const last = gameState.dailyLastClaimDay;
  if (last === 0)                return { status: 'claimable', activeDay: 1,                         today };
  if (today === last)           return { status: 'claimed',   activeDay: gameState.dailyStreak,     today };
  if (today === last + 1)       return { status: 'claimable', activeDay: (gameState.dailyStreak % 7) + 1, today };
  return                               { status: 'claimable', activeDay: 1,                         today }; // missed a day → reset
}

export function claimDaily() {
  const s = getDailyState();
  if (s.status !== 'claimable') return null;
  gameState.dailyStreak = s.activeDay;
  gameState.dailyLastClaimDay = s.today;
  return DAILY_REWARDS[s.activeDay - 1];
}
```

## 3. Reward table — `DAILY_REWARDS` in `daily.js`
Reuse the **existing boost rails** (`main.js` already drives them every frame in `updateBoosts()`): money-boost = set `moneyBoostUntil`; golden = set `goldenSurgeUntil` (then `updateBoosts` calls `conveyor.setGoldenSurge`). Instant cash = direct grant (see §5).

Money values **scale off `rebirthThreshold`** so they stay relevant as the player prestiges (threshold starts 5000, ×3 per rebirth). Starting proposal (tune in playtest):
```js
// each: { day, type, icon, label, value?(thr)->number, seconds? }
[ { day:1, type:'money',      icon:'💰', label:'Cash',          value: t => t*0.03 },            // ~$150 early
  { day:2, type:'moneyBoost', icon:'⚡', label:'2× Money 90s',  seconds:90 },
  { day:3, type:'money',      icon:'💰', label:'Cash',          value: t => t*0.06 },
  { day:4, type:'golden',     icon:'✨', label:'Golden 45s',    seconds:45 },
  { day:5, type:'money',      icon:'💰', label:'Cash',          value: t => t*0.10 },
  { day:6, type:'moneyBoost', icon:'⚡', label:'2× Money 120s', seconds:120 },
  { day:7, type:'mega',       icon:'🎁', label:'MEGA PRIZE',    value: t => t*0.25, seconds:180 } ] // cash + long 2×
```

## 4. UI — `index.html` + `src/ui.js`
**Daily button** (`index.html`): add `#daily-btn` directly under `#money-display` in the top-left bar (locate the money-display's container). Gift icon + "Daily". Add a `.has-reward` class for a pulsing glow/dot when a claim is available. Match existing button styling (`var(--panel-bg)`, `var(--accent)`, `backdrop-filter: blur(6px)`).

**Daily modal** (`index.html`): `#daily-overlay`, full-screen like `#rebirth-overlay`, **z-index ~50** (below welcome's 60, above HUD's 12). Card contains:
- A **7-tile row** (generate from `DAILY_REWARDS` in `ui.js`, or static + state classes). Tile states: `.claimed` (✓, dimmed) / `.active` (today's claimable, highlighted) / `.locked` (future, dimmed). **Day-7 tile** visually larger / gradient border.
- A big **CLAIM** button (enabled only when `status==='claimable'`); after claim show "Claimed! Come back tomorrow" + streak text.
- Close button.

**`ui.js`** additions (extend `initUI`):
- Refs for `#daily-btn`, `#daily-overlay`, tiles, claim button.
- `renderDaily(state)` — set tile state classes, claim button enabled/label, streak text.
- `openDaily()` / `closeDaily()` — toggle overlay; **fold into `syncMenu()`/`isPanelOpen()`** so the game pauses while open (add a `dailyOpen` flag alongside `panelOpen`/`settingsOpen`).
- `setDailyAvailable(bool)` — toggle `.has-reward` glow on `#daily-btn`.
- Add an `onClaimDaily` callback param to `initUI(...)` (wire in `main.js`).

## 5. Wiring — `src/main.js`
- Import `getDailyState`, `claimDaily`, `DAILY_REWARDS` from `./daily.js`.
- After `loadGame()` + `initUI`: `const ds = getDailyState(); ui.setDailyAvailable(ds.status === 'claimable'); ui.renderDaily(ds);`
  - **Optional (recommended) engagement:** if claimable, auto-open the modal once, after the welcome **START** (not before — keep audio/gesture gating intact).
- Money grant helper (daily prize is a flat grant, **not** a crush — so it does NOT go through `awardMoney()`; that's intentional and correct. Note for the compliance reviewer.):
  ```js
  function grantBonusMoney(amount) { gameState.money += amount; ui.refreshMoney(); }
  ```
- Claim handler (passed as `onClaimDaily`):
  ```js
  const reward = claimDaily();
  if (!reward) return;
  if (reward.value)  grantBonusMoney(reward.value(gameState.rebirthThreshold));
  if (reward.type === 'moneyBoost' || reward.type === 'mega') moneyBoostUntil = performance.now() + reward.seconds*1000;
  if (reward.type === 'golden') goldenSurgeUntil = performance.now() + reward.seconds*1000;
  playPurchase();                 // or a dedicated SFX in audio.js
  ui.renderDaily(getDailyState());
  ui.setDailyAvailable(false);
  persist();
  ```
- Pause integration: ensure `ui.isPanelOpen()` (used by the loop's `frozen` gate and the `visibilitychange` handler) returns true while the daily modal is open.

## 6. Optional stretch — "Double your prize" rewarded ad
On the claim screen, offer a `requestRewardedAd` (via the existing `playAd('rewarded', ...)`) that 2×'s the just-claimed reward. Good monetization; skip if budget is tight.

## 7. Testing (use the project tooling)
- Drive with **Playwright MCP** (now fixed to bundled chromium) or the headless-CDP smoke pattern in scratchpad. Verify: button glows when claimable → open modal → claim → money up / boost active → glow clears → reopen shows "claimed".
- **Streak logic**: temporarily override `gameState.dailyLastClaimDay` via a debug `evaluate` to `today-1` (continues, advances day) and `today-2` (resets to day 1); reopen and confirm the highlighted tile.
- Run **`/crazygames-qa`** afterward to confirm no regressions (clean console, bundle, SDK lifecycle).

## 8. Files touched
- `src/gameState.js` — +2 numeric fields.
- `src/daily.js` — **new** (logic + reward table).
- `index.html` — `#daily-btn` + `#daily-overlay` + CSS.
- `src/ui.js` — modal render/open/close, `setDailyAvailable`, `onClaimDaily`, extend `isPanelOpen`/`syncMenu`.
- `src/main.js` — import, boot state, `grantBonusMoney`, claim handler, pause integration.

## 9. Open decisions to confirm with the user before/while building
1. **Reward values & types** — the §3 table is a starting point; tune for pacing.
2. **Auto-open on launch** when claimable? (recommended: yes, once per session, after START.)
3. **"Watch ad to double"** upsell (§6)? yes/no.
4. **Streak reset** = back to day 1 on any missed day (proposed) vs. forgiving.

## 10. Notes / gotchas
- Day index uses the **client clock** (local midnight). Clock manipulation could let a user re-claim — acceptable for a low-stakes hypercasual; no server time available.
- New save fields default to 0 for existing players → everyone starts a fresh streak. Fine.
- Keep it **comment-free** (house style) and assets procedural (no new external deps).
- Don't break the `x:[-2,2] AND z:[-1,3]` gameplay zone or the merged-geometry perf rules (UI-only feature, so low risk — but run `threejs-perf-reviewer` if any 3D is added).

# Cube Crusher Idle — Game Design Document

**Engine:** Vite + Three.js + Vanilla JS
**Genre:** Hypercasual Idle
**Platform:** Web (Desktop + Mobile)

---

## 1. Core Loop

1. **Cubes flow in** — neon cubes ride the conveyor belt continuously from right to left toward the hydraulic press; they never stop.
2. **Player times the crush** — click/tap slams the press. A cube is only destroyed if it's inside the press's crush zone, so a mistimed click *misses* and the cube rides off the end of the belt.
3. **Particles explode** — the crushed cube shatters into coloured particle spheres; money is awarded (golden cubes pay 10×, critical hits 5×).
4. **Boss cubes** — every 30 crushes a giant dark-red boss cube arrives, stops under the press, and **blocks the belt**. It takes 3 hits to destroy and pays 25× normal money before the belt resumes.
5. **Spend → upgrade** — money buys upgrades (Press Power, Conveyor Speed, Magnet, Golden Cube, Critical Hit) that increase income or remove friction.
6. **Rebirth** — at $5,000 (×3 each time) the game pauses and offers a radial web of six permanent prestige bonuses; choosing one resets the run with that bonus banked.

---

## 2. Game State Variables

| Variable | Default | Description |
|---|---|---|
| `money` | 0 | Current player currency |
| `pressPower` | 1 | Money multiplier per crush |
| `autoSpeed` | 0 | Presses per second (0 = manual only) |
| `conveyorSpeed` | 1 | Cube spawn rate multiplier |
| `pressLevel` | 0 | Upgrade tier for Press Power |
| `autoLevel` | 0 | Upgrade tier for Auto-Speed |
| `conveyorLevel` | 0 | Upgrade tier for Conveyor Speed |

---

## 3. Three.js Primitives

### Scene & Lighting
- `THREE.Scene` with `fog` (subtle depth fog, dark background `#0a0a0f`)
- `THREE.DirectionalLight` — intensity 3.0, position `(5, 10, 5)`, `castShadow: true`, hard shadow map (`shadowMapSize 2048x2048`, `shadow.bias -0.001`)
- `THREE.AmbientLight` — intensity 0.2, so unlit faces stay dark (harsh look)
- `THREE.PerspectiveCamera` — FOV 60, positioned at `(0, 6, 10)`, looking at origin

### The Hydraulic Press
- **Body:** `THREE.CylinderGeometry(1.5, 1.5, 2, 32)` — the main piston shaft
- **Head/Plate:** `THREE.CylinderGeometry(2, 2, 0.3, 32)` — wide flat crushing face
- **Material:** `THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1.0, roughness: 0.1, envMapIntensity: 1.5 })`
- Animation: press Y position tweens from rest (`y = 4`) to crush (`y = 0.5`) in ~120ms, returns in ~300ms (ease-out bounce feel)

### The Conveyor Belt
- **Belt surface:** `THREE.BoxGeometry(12, 0.2, 3)` — flat platform
- **Rollers (decorative):** `THREE.CylinderGeometry(0.15, 0.15, 3, 12)` repeated every 1 unit along X
- **Material:** `THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4, roughness: 0.7 })`
- Cubes slide along the X axis; conveyor moves them via `position.x -= conveyorSpeed * delta`

### The Cubes
- **Geometry:** `THREE.BoxGeometry(1.2, 1.2, 1.2)` with `castShadow: true`
- **Material:** `THREE.MeshStandardMaterial({ color: <neonColor>, metalness: 0.1, roughness: 0.3, emissive: <neonColor>, emissiveIntensity: 0.3 })`
- Neon color pool (pick randomly on spawn):
  - Cyan `#00ffff`, Hot Pink `#ff007f`, Lime `#7fff00`, Electric Purple `#bf00ff`, Orange `#ff6600`

### Crush Particles
- On crush: spawn **20–30 particles** from cube's world position
- **Geometry:** `THREE.SphereGeometry(0.1, 6, 6)` (low-poly is fine, they're fast)
- **Material:** same neon color as the destroyed cube, emissive, no shadows
- Physics: each particle gets a random velocity vector, gravity pulls `vy -= 9.8 * delta`, lifetime 0.8s, fade out via `material.opacity`
- Use an object pool (reuse up to 100 particle meshes) to avoid GC spikes

### Environment Map (for metallic reflections)
- Use `THREE.PMREMGenerator` with a simple procedural `THREE.RoomEnvironment` (bundled in Three.js examples) — this gives the press its chrome-like reflections without external textures

---

## 4. Upgrade System

### Upgrades

> **Note:** Auto-Speed was removed — the game is **manual-click only**. The current upgrade set is below.

| Upgrade | Effect per level | Base Cost |
|---|---|---|
| **Press Power** | `pressPower = 1 + level * 0.5` → multiplies money per crush | 10 |
| **Conveyor Speed** | `conveyorSpeed = 1 + level * 0.3` → faster belt | 15 |
| **Magnet** | `magnetStrength = level * 1.2` → extra belt pull that reels cubes toward the press while they're *outside* the crush zone (less wait between cubes; timing inside the zone stays fair). Shows a subtle purple glow ring on the belt floor. | 40 |
| **Golden Cube** | `goldenChance = min(level * 0.02, 1)` → chance a spawned cube is golden (`#FFD700`, attached gold PointLight, worth **10×** money) | 50 |
| **Critical Hit** | `critChance = min(level * 0.05, 0.5)` → chance a crush deals **5×** money; the money counter flashes bright yellow for 0.3s | 30 |

### Cost Scaling Formula

Exponential scaling to create meaningful decision points:

```
cost(level) = baseCost * growthRate ^ level
```

| Upgrade | `baseCost` | `growthRate` |
|---|---|---|
| Press Power | 10 | 1.6 |
| Conveyor Speed | 15 | 1.5 |
| Magnet | 40 | 1.55 |
| Golden Cube | 50 | 1.7 |
| Critical Hit | 30 | 1.65 |

### Boss Cubes

- Every **30 crushes**, the next spawn is a **boss cube** instead of a normal one.
- **Geometry:** `THREE.BoxGeometry(2.4, 2.4, 2.4)` (2× size); **colour** `#8B0000` dark red with a red emissive glow.
- **Health:** requires **3 clicks** to destroy; a DOM health bar floats above it (3D→screen projected each frame).
- **Behaviour:** slides in, stops under the press, and **blocks the belt** — no new cubes spawn until it's destroyed.
- **Reward:** **25×** normal money on the killing blow (stacks with a critical hit).
- **Audio:** a deeper, low-passed crunch on each boss hit, with an extra boom on destruction.

### Rebirth (Prestige)

When `money` first reaches `rebirthThreshold` (starts **$5,000**, ×3 each rebirth → $15k, $45k, …) the game **pauses** and a full-screen dark overlay shows a radial **web menu** (HTML/CSS, neon nodes, CSS-line spokes). The centre node reads **REBIRTH**; six branches each grant a permanent bonus banked in `gameState.rebirthBonuses`:

| Node | Permanent effect | Stacking |
|---|---|---|
| **Cube Value ×1.2** | all cube money ×1.2 | multiplicative each pick |
| **Head Start +$200** | runs start with $200 | flag |
| **Press Veteran** | Press Power starts at level 3 | flag |
| **Golden Touch** | +3% base golden chance | additive each pick |
| **Speed Demon** | Conveyor Speed starts at level 3 | flag |
| **Lucky Strikes** | crits deal 10× instead of 5× | flag |

Choosing a node applies the bonus, resets `money` (0, or 200 with Head Start), resets all upgrade levels to 0 (Press/Conveyor honour Veteran/Speed Demon), clears the belt, increments `rebirthCount`, multiplies `rebirthThreshold` ×3, then closes the overlay and resumes. A corner badge shows the rebirth count and active bonuses.

**Example — Press Power costs:**
- Level 0→1: `10 * 1.6^0 = 10`
- Level 1→2: `10 * 1.6^1 = 16`
- Level 2→3: `10 * 1.6^2 = 25.6` → round to `26`
- Level 5→6: `10 * 1.6^5 ≈ 105`
- Level 10→11: `10 * 1.6^10 ≈ 1,099`

Round all costs: `Math.ceil(baseCost * Math.pow(growthRate, level))`

---

## 5. Economy & Progression

- **Base money per crush:** `pressPower` coins (starts at 1)
- **Income per second (idle):** `autoSpeed * pressPower` coins/sec
- **Soft cap feel:** Auto-Speed has the highest growth rate (1.8×) to make manual play competitive early; Conveyor Speed (1.5×) stays cheap to keep the screen busy and satisfying

### Milestone Targets (tuning guide)
| Time | Expected $ | Suggested state |
|---|---|---|
| 1 min | ~50 | Press Power lv 2, manual play |
| 5 min | ~500 | Auto-Speed lv 1, Conveyor lv 2 |
| 15 min | ~10,000 | Full idle loop running |
| 30 min | ~500,000 | Press Power lv 10+ |

---

## 6. Input Handling

- **Desktop:** `pointerdown` on the canvas (anywhere) triggers press
- **Mobile:** same `pointerdown` event; no separate touch handling needed
- During auto-press: player taps still fire extra presses (additive, not blocked)
- Debounce: ignore input if press animation is already in downswing (`isPressing === true`)

---

## 7. UI Layout (HTML overlay, no Three.js UI)

```
┌─────────────────────────────────┐
│  💰 $1,234          [⚙ Upgrades] │  ← top bar (position: fixed)
│                                 │
│        [  Three.js Canvas  ]    │
│                                 │
│  ┌──────────────────────────┐   │
│  │  PRESS POWER   Lv.3  $26 │   │  ← upgrade panel (slide-up drawer)
│  │  AUTO SPEED    Lv.1  $45 │   │
│  │  CONVEYOR SPD  Lv.2  $22 │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

- Canvas fills 100vw × 100vh; UI sits in front via `z-index`
- Upgrade buttons grey out (CSS `disabled` state) when player can't afford them

---

## 8. File Structure (Vite project)

```
/src
  main.js          ← entry: init Three.js scene, game loop
  scene.js         ← camera, lights, renderer, env map
  press.js         ← hydraulic press mesh + animation state machine
  conveyor.js      ← belt mesh + cube spawning/movement
  cube.js          ← cube factory, neon color pool
  particles.js     ← particle pool + physics update
  upgrades.js      ← upgrade definitions, cost formula, state mutations
  ui.js            ← DOM money display, upgrade panel, button states
  gameState.js     ← single source of truth (plain JS object)
index.html
vite.config.js
```

---

## 9. Performance Targets

- Target **60 fps** on mid-range mobile
- Max draw calls: **< 50** (merge conveyor rollers into one `InstancedMesh`)
- Particle pool: pre-allocate 100 `SphereGeometry` meshes at startup, toggle `visible`
- Shadow map: only the `DirectionalLight` casts shadows; limit shadow camera frustum to the play area (`shadow.camera.near/far/left/right` tightly fitted)

---

## 10. CrazyGames Compliance

> Source: [CrazyGames Technical Requirements](https://docs.crazygames.com/requirements/technical/), [Quality Guidelines](https://docs.crazygames.com/requirements/quality/), [Ad Requirements](https://docs.crazygames.com/requirements/ads/), [Idle Monetization Guide](https://docs.crazygames.com/resources/monetizing-midcore-idle/)

### 10.1 Technical (Basic Launch — mandatory from day 1)

- **Bundle size:** Vite build must stay **≤ 50MB total** (target < 20MB to qualify for the mobile homepage). Three.js + game code should be well under this — no textures, no external models.
- **Relative paths only:** All asset/script references must use relative paths. Vite handles this automatically; do not hard-code `localhost` or absolute URLs anywhere.
- **Browser targets:** Chrome + Edge are required. Test on both before submission. Safari support is recommended; CrazyGames will disable the game on Safari if it doesn't run smoothly.
- **Chromebook support:** Must run acceptably on a 4GB RAM Chromebook (Chrome OS). Three.js with our low draw-call design should pass easily.
- **Mobile touch:** `pointerdown` already handles this; additionally add the following CSS to `body` in `index.html` to prevent selection/magnification popups on mobile:
  ```css
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  ```
- **iOS audio resume:** The `AudioContext` enters `interrupted` state when iOS backgrounds the app. On `touchend`, call `audioContext.resume()` if state is `suspended`:
  ```js
  document.addEventListener('touchend', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });
  ```
- **Sitelock:** Implement a sitelock that whitelists all CrazyGames domains (`crazygames.com`, `crazygames.net`, etc.). See the [CrazyGames HTML5 sitelock guide](https://docs.crazygames.com/resources/html5/sitelock/).
- **No restricted keys:** Do not use `Escape` (closes fullscreen) or `Ctrl/Cmd+W` (closes tab) as game controls. This game is pointer-only — no risk here.

### 10.2 CrazyGames SDK Integration

Add the SDK via CDN in `index.html` (do not bundle it):

```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

Add a `sdk.js` module to the file structure. Wrap all SDK calls with a guard so the game runs fine without the SDK (local dev):

```js
const sdk = window.CrazyGames?.SDK;
```

**Basic Launch (minimum):**
- Call `sdk.game.gameplayStart()` when the player first interacts (first `pointerdown` or when autopress begins) — this is how CrazyGames measures initial download size.
- Call `sdk.game.gameplayStop()` when the upgrade panel is open (player is in a "menu" state).

**Full Launch (required for monetization):**
- `gameplayStart` / `gameplayStop` around all active play sessions
- `sdk.game.loadingStart()` at app init, `sdk.game.loadingStop()` when Three.js scene is ready and the first cube has been placed
- **Data module** for saving progression — idle games have long sessions; players expect their state to persist. Save `gameState` to `sdk.data.setItem('save', JSON.stringify(gameState))` on every upgrade purchase and every 30 seconds.

### 10.3 Advertisement Integration (Full Launch only)

> Ads are **disabled and must not be called** during Basic Launch. Wire up SDK calls but gate them behind a `window.CrazyGames` check.

**Midgame ads (interstitials):**
- Only trigger at a natural pause — e.g., when the player opens the upgrade panel and has been playing > 3 minutes.
- Pause the game loop, mute audio, show a loading spinner before calling; resume/unmute on `adFinished` or `adError`.
- CrazyGames enforces a 3-minute cooldown between midgame ads automatically — just call at opportune moments without tracking timing yourself.
- Do **not** show a midgame ad on the upgrade button click itself (that's a navigational action, which is forbidden).

```js
async function showMidgameAd() {
  sdk.game.gameplayStop();
  muteAudio();
  try {
    await sdk.ad.requestAd('midgame');
  } catch (e) { /* adError — continue silently */ }
  unmuteAudio();
  sdk.game.gameplayStart();
}
```

**Rewarded ads — high-value placements for an idle game:**

| Placement | Reward | Notes |
|---|---|---|
| "Double offline earnings" | 2× accumulated idle coins on return | Show only on session start if player was away > 5 min |
| "2× Press Power for 60s" | Temporary multiplier boost | Offer once per upgrade panel open, max 3×/day |
| "Skip upgrade cost" | Free one upgrade | Hide button if ad not available; never block gameplay |

Rules (enforced by CrazyGames QA):
- The "watch ad" button and the "no thanks" button must be the **same size, font, and color** — no dark patterns.
- Do NOT reward the player on `adError`.
- Do NOT offer rewarded ads during active gameplay (while cubes are being crushed).
- Set a daily cap (e.g., 5 rewarded ads/day) and show a timer when the cap is reached.

**Economy balance with ads:** Rewarded ad rewards must scale with the player's current level — a flat `+100 coins` bonus is useless at hour 2. Use `pressPower * 60` as the offline boost formula so it always feels meaningful.

### 10.4 Progress Save (Full Launch)

Idle games live or die by save persistence. Use the CrazyGames `Data` module (falls back to `localStorage` for local dev):

```js
async function saveGame() {
  const payload = JSON.stringify(gameState);
  if (sdk?.data) await sdk.data.setItem('save', payload);
  else localStorage.setItem('cci_save', payload);
}

async function loadGame() {
  const raw = sdk?.data
    ? await sdk.data.getItem('save')
    : localStorage.getItem('cci_save');
  if (raw) Object.assign(gameState, JSON.parse(raw));
}
```

### 10.5 Quality & QA Checklist

CrazyGames QA will check these — design with them in mind from the start:

- **Onboarding:** First-time players see a brief animated hint (tap/click the screen) that auto-dismisses after first crush. No text walls. Skippable immediately.
- **Clear goal at all times:** The money counter and upgrade costs are always visible — the player always knows what they're working toward.
- **Audio consistency:** All sounds at similar volume levels. Background music (if added) must be optional and default to on, with a mute toggle in the UI.
- **No gameplay interruption:** The upgrade panel does not pause or interfere with the auto-press loop. It slides up over the canvas.
- **Responsive layout:** Canvas fills 100vw × 100vh. UI elements use `vw`/`vh` units or `clamp()` so they scale cleanly from 375px mobile to 2560px desktop. Test portrait and landscape on mobile.
- **No broken state:** If `adError` fires, the game must continue normally. If the save fails, the game must continue normally.
- **Aesthetic consistency:** Neon cubes + metallic press + dark background throughout. No mode or screen should break the visual language.
- **Game covers:** Submit a 512×512 icon and a 1200×630 banner following the [CrazyGames cover specs](https://docs.crazygames.com/requirements/game-covers/). The cover must clearly show a cube being crushed — not just the logo.

### 10.6 Updated File Structure (with SDK)

```
/src
  main.js          ← entry: init scene, load save, start game loop
  scene.js         ← camera, lights, renderer, env map
  press.js         ← hydraulic press mesh + animation state machine
  conveyor.js      ← belt mesh + cube spawning/movement
  cube.js          ← cube factory, neon color pool
  particles.js     ← particle pool + physics update
  upgrades.js      ← upgrade definitions, cost formula, state mutations
  ui.js            ← DOM money display, upgrade panel, button states
  gameState.js     ← single source of truth (plain JS object)
  sdk.js           ← CrazyGames SDK wrapper (ads, save, gameplay events)
  audio.js         ← AudioContext manager (mute/unmute, iOS resume fix)
index.html         ← SDK script tag, body CSS for user-select: none
vite.config.js
```

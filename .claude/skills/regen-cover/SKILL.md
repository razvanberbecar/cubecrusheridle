---
name: regen-cover
description: Regenerate Cube Crusher Idle's CrazyGames cover art — icon_512.png (512x512) and banner_1200x630.png (1200x630) — from the Canvas2D generator, rendered via headless Chromium. Use when the cover art needs to be remade or tweaked.
disable-model-invocation: true
---

# Regenerate cover art

Produces the two CrazyGames submission images from `cover.html` (a self-contained
Canvas2D scene: the hydraulic press crushing a neon cube on the hazard conveyor,
warehouse backdrop, impact burst, reworked branding). No external assets, no installs —
it drives a Chromium/Edge/Chrome already on the machine.

## Run it

```bash
node .claude/skills/regen-cover/render.mjs        # both images
node .claude/skills/regen-cover/render.mjs icon   # just icon_512.png
node .claude/skills/regen-cover/render.mjs banner # just banner_1200x630.png
```

Outputs overwrite `icon_512.png` and `banner_1200x630.png` in the project root at
exact dimensions (the canvas supersamples ×2 then downsamples for crisp edges).

## Workflow

1. **Back up** the current `icon_512.png` / `banner_1200x630.png` first (git has them, but copy aside before overwriting).
2. To change the art, edit `.claude/skills/regen-cover/cover.html` (composeIcon / composeBanner and the draw helpers: `cube`, `press`, `impactGlow`, `impactDebris`, `belt`, `wordLine`, …).
3. Re-run the render command.
4. **Read** the output PNGs to visually self-review, then iterate. Verify dimensions are exactly 512×512 and 1200×630 before finishing.

## Notes
- Tunable levers: palette (magenta vs cyan/orange), bloom/debris density, wordmark font/weight, composition.
- If no browser is found, the script says so — `npx playwright install chromium` provides one.
- Related: [[crazygames-publish-readiness]] in memory documents how the art was made.

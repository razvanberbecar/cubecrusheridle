#!/usr/bin/env node
// Renders the Cube Crusher Idle cover art (cover.html) to exact-size PNGs using
// whatever Chromium-family browser is already on the machine (no extra installs).
// Outputs to the project root: icon_512.png (512x512) and banner_1200x630.png.
//
// Usage:  node .claude/skills/regen-cover/render.mjs [icon|banner|all]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const COVER = path.join(here, 'cover.html');

function findChrome() {
  const c = [];
  const local = process.env.LOCALAPPDATA;
  if (local) {
    const pw = path.join(local, 'ms-playwright');
    try {
      for (const d of fs.readdirSync(pw)) {
        if (d.startsWith('chromium-') && !d.includes('headless_shell')) {
          for (const sub of ['chrome-win64\\chrome.exe', 'chrome-win\\chrome.exe']) {
            c.push(path.join(pw, d, sub));
          }
        }
      }
    } catch {}
  }
  c.push('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
  c.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  c.push('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe');
  c.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  return c.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
}

const TARGETS = {
  icon:   { w: 512,  h: 512,  out: 'icon_512.png' },
  banner: { w: 1200, h: 630,  out: 'banner_1200x630.png' },
  land:   { w: 1920, h: 1080, out: 'landscape_1920x1080.png' },
  port:   { w: 800,  h: 1200, out: 'portrait_800x1200.png' },
  square: { w: 800,  h: 800,  out: 'square_800x800.png' },
};
const GROUPS = { all: ['icon', 'banner'], promo: ['land', 'port', 'square'] };

function render(chrome, mode) {
  const t = TARGETS[mode];
  const out = path.join(ROOT, t.out);
  const url = `${pathToFileURL(COVER).href}?mode=${mode}&w=${t.w}&h=${t.h}&ss=2`;
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${t.w},${t.h}`,
    '--virtual-time-budget=3000', `--screenshot=${out}`, url,
  ];
  const r = spawnSync(chrome, args, { encoding: 'utf8' });
  if (!fs.existsSync(out)) {
    console.error(`✗ ${mode}: render failed`, r.stderr || r.error || '');
    return false;
  }
  console.log(`✓ ${t.out} (${t.w}x${t.h})`);
  return true;
}

const which = (process.argv[2] || 'all').toLowerCase();
const chrome = findChrome();
if (!chrome) {
  console.error('No Chromium/Edge/Chrome binary found. Install a Chromium-family browser or run `npx playwright install chromium`.');
  process.exit(1);
}
const modes = GROUPS[which] || [which];
let ok = true;
for (const m of modes) { if (!TARGETS[m]) { console.error(`unknown target: ${m}`); ok = false; continue; } ok = render(chrome, m) && ok; }
process.exit(ok ? 0 : 1);

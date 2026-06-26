#!/usr/bin/env node
// Stop hook for Cube Crusher Idle.
// Enforces CLAUDE.md's rule "always run `npm run build` after code changes" and
// guards the CrazyGames 50 MB bundle cap. Only rebuilds when source actually
// changed since the last build, so it stays cheap on no-op turns.
//
// Exit codes (Claude Code Stop-hook semantics):
//   0  -> allow stop (quiet on success / non-blocking warning)
//   2  -> block stop, feed stderr back to Claude so it fixes the issue
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WARN_BYTES = 30 * 1024 * 1024;
const HARD_BYTES = 47 * 1024 * 1024; // margin under the 50 MB CrazyGames cap

// --- read hook payload from stdin; bail if we're already in a stop-hook loop ---
let payload = {};
try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (payload.stop_hook_active) process.exit(0);

const newestMtime = (dir, acc = { t: 0 }) => {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc.t; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) newestMtime(p, acc);
    else { try { acc.t = Math.max(acc.t, fs.statSync(p).mtimeMs); } catch {} }
  }
  return acc.t;
};
const mtimeOf = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

const distIndex = path.join(ROOT, 'dist', 'index.html');
const distBuilt = mtimeOf(distIndex);
const srcNewest = Math.max(
  newestMtime(path.join(ROOT, 'src')),
  newestMtime(path.join(ROOT, 'public')),
  mtimeOf(path.join(ROOT, 'index.html')),
  mtimeOf(path.join(ROOT, 'vite.config.js')),
);

// nothing changed since last build -> nothing to do
if (distBuilt && srcNewest <= distBuilt) process.exit(0);

const res = spawnSync('npm', ['run', 'build'], { cwd: ROOT, shell: true, encoding: 'utf8' });
const out = `${res.stdout || ''}${res.stderr || ''}`;
const ok = res.status === 0 && /built in/i.test(out);

if (!ok) {
  const tail = out.trim().split('\n').slice(-25).join('\n');
  process.stderr.write(`❌ npm run build FAILED after your changes. Fix before finishing:\n\n${tail}\n`);
  process.exit(2);
}

// --- bundle-size guard ---
const dirSize = (dir) => {
  let total = 0, entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += dirSize(p);
    else { try { total += fs.statSync(p).size; } catch {} }
  }
  return total;
};
const bytes = dirSize(path.join(ROOT, 'dist'));
const mb = (bytes / 1024 / 1024).toFixed(1);

if (bytes > HARD_BYTES) {
  process.stderr.write(`❌ dist/ is ${mb} MB — over the ${(HARD_BYTES/1024/1024)} MB safety margin for CrazyGames' 50 MB cap. Trim assets before finishing.\n`);
  process.exit(2);
}
if (bytes > WARN_BYTES) {
  process.stdout.write(`⚠️  Build OK, but dist/ is ${mb} MB and climbing toward the 50 MB CrazyGames cap.\n`);
}
process.exit(0);

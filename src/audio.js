let ctx = null;
let muted = false;
let sfxGain = null;
let musicVolume = 1;
let sfxVolume = 1;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = muted ? 0 : sfxVolume;
      sfxGain.connect(ctx.destination);
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, duration, type = 'square', gain = 0.12) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(gain, ac.currentTime);
  env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(env).connect(sfxGain);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playCrush(isGolden = false) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const dur = 0.18;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {

    const decay = (1 - i / len) ** 2;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900 + Math.random() * 600;
  band.Q.value = 0.8;

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.55, now + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(band).connect(noiseGain).connect(sfxGain);
  noise.start(now);
  noise.stop(now + dur);

  const thud = ac.createOscillator();
  const thudGain = ac.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(170, now);
  thud.frequency.exponentialRampToValueAtTime(48, now + 0.12);
  thudGain.gain.setValueAtTime(0.28, now);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  thud.connect(thudGain).connect(sfxGain);
  thud.start(now);
  thud.stop(now + 0.17);

  if (isGolden) {
    [880, 1320, 1760].forEach((freq, k) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const t = now + 0.03 + k * 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(sfxGain);
      o.start(t);
      o.stop(t + 0.18);
    });
  }
}

export function playBossHit(destroyed = false) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const dur = 0.28;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const decay = (1 - i / len) ** 2;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 350;

  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(0.6, now + 0.006);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(lp).connect(ng).connect(sfxGain);
  noise.start(now);
  noise.stop(now + dur);

  const thud = ac.createOscillator();
  const tg = ac.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(110, now);
  thud.frequency.exponentialRampToValueAtTime(32, now + 0.2);
  tg.gain.setValueAtTime(0.35, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  thud.connect(tg).connect(sfxGain);
  thud.start(now);
  thud.stop(now + 0.28);

  if (destroyed) {
    const boom = ac.createOscillator();
    const bg = ac.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(160, now);
    boom.frequency.exponentialRampToValueAtTime(38, now + 0.35);
    bg.gain.setValueAtTime(0.3, now);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    boom.connect(bg).connect(sfxGain);
    boom.start(now);
    boom.stop(now + 0.42);
  }
}

export function playPurchase() {
  blip(660, 0.09, 'triangle', 0.1);
  setTimeout(() => blip(990, 0.09, 'triangle', 0.09), 70);
}

export function setMuted(value) {
  muted = value;
  if (ctx && musicGain) {
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(muted ? 0 : musicVolume * MUSIC_LEVEL, now + 0.25);
  }
  if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxVolume;
  return muted;
}

export function toggleMute() {
  return setMuted(!muted);
}

export function isMuted() {
  return muted;
}

export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  if (ctx && musicGain && !muted) {
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(musicVolume * MUSIC_LEVEL, now + 0.1);
  }
  return musicVolume;
}

export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, v));
  if (sfxGain && !muted) sfxGain.gain.value = sfxVolume;
  return sfxVolume;
}

const MUSIC_LEVEL = 0.3;
const BPM = 90;
const EIGHTH = 60 / BPM / 2;
const BAR = EIGHTH * 8;
const BASS_NOTES = [65.41, 98.0, 110.0, 87.31];
const STEPS = 32;

let musicStarted = false;
let musicGain = null;
let noiseBuffer = null;
let padOscA = null;
let padOscB = null;
let nextStepTime = 0;
let stepIndex = 0;

function getNoiseBuffer(ac) {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(ac.sampleRate);
  noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function musicKick(ac, time) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
  g.gain.setValueAtTime(0.7, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  osc.connect(g).connect(musicGain);
  osc.start(time);
  osc.stop(time + 0.2);
}

function musicHat(ac, time) {
  const src = ac.createBufferSource();
  src.buffer = getNoiseBuffer(ac);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.18, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.connect(hp).connect(g).connect(musicGain);
  src.start(time);
  src.stop(time + 0.05);
}

function musicBass(ac, time, freq) {
  const osc = ac.createOscillator();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.5, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + BAR * 0.92);
  osc.connect(lp).connect(g).connect(musicGain);
  osc.start(time);
  osc.stop(time + BAR);
}

function scheduleStep(ac, step, time) {
  musicHat(ac, time);
  const inBar = step % 8;
  if (inBar === 0 || inBar === 4) musicKick(ac, time);
  if (inBar === 0) {
    const root = BASS_NOTES[Math.floor(step / 8) % BASS_NOTES.length];
    musicBass(ac, time, root);

    if (padOscA && padOscB) {
      padOscA.frequency.setValueAtTime(root * 2, time);
      padOscB.frequency.setValueAtTime(root * 2, time);
    }
  }
}

export function startMusic() {
  if (musicStarted) return;
  const ac = ensureCtx();
  if (!ac) return;
  musicStarted = true;

  musicGain = ac.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(ac.destination);

  const padGain = ac.createGain();
  padGain.gain.value = 0.22;
  const padFilter = ac.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 800;
  padFilter.Q.value = 6;

  padOscA = ac.createOscillator();
  padOscB = ac.createOscillator();
  padOscA.type = 'sawtooth';
  padOscB.type = 'sawtooth';
  padOscA.detune.value = -8;
  padOscB.detune.value = 8;
  padOscA.frequency.value = BASS_NOTES[0] * 2;
  padOscB.frequency.value = BASS_NOTES[0] * 2;

  const lfo = ac.createOscillator();
  const lfoDepth = ac.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  lfoDepth.gain.value = 450;
  lfo.connect(lfoDepth).connect(padFilter.frequency);

  padOscA.connect(padFilter);
  padOscB.connect(padFilter);
  padFilter.connect(padGain).connect(musicGain);

  const t0 = ac.currentTime;
  padOscA.start(t0);
  padOscB.start(t0);
  lfo.start(t0);

  musicGain.gain.setValueAtTime(0, t0);
  musicGain.gain.linearRampToValueAtTime(muted ? 0 : musicVolume * MUSIC_LEVEL, t0 + 2);

  nextStepTime = t0 + 0.15;
  stepIndex = 0;
  setInterval(() => {
    while (nextStepTime < ac.currentTime + 0.12) {
      scheduleStep(ac, stepIndex, nextStepTime);
      nextStepTime += EIGHTH;
      stepIndex = (stepIndex + 1) % STEPS;
    }
  }, 25);
}

export function installIOSResume() {
  document.addEventListener('touchend', () => {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  });
}

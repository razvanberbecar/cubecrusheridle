import * as THREE from 'three';
import { gameState, applySave } from './gameState.js';
import { recomputeStats } from './upgrades.js';
import { createScene, createEnvironment } from './scene.js';
import { createDecorations } from './decorations.js';
import { createPress } from './press.js';
import { createConveyor, BELT_Z } from './conveyor.js';
import { createParticles } from './particles.js';
import { preloadCubeModels } from './cube.js';
import { initUI, formatMoney } from './ui.js';
import { initRebirth } from './rebirth.js';
import {
  playCrush,
  playBossHit,
  startMusic,
  installIOSResume,
  setMuted,
  isMuted,
} from './audio.js';
import {
  checkSitelock,
  initSDK,
  loadingStart,
  loadingStop,
  gameplayStart,
  gameplayStop,
  requestMidgameAd,
  requestRewardedAd,
  saveGame,
  loadGame,
} from './sdk.js';

async function boot() {

  if (!checkSitelock()) {
    document.body.innerHTML =
      '<div style="color:#fff;font:700 20px sans-serif;padding:40px">Play this game on CrazyGames.</div>';
    return;
  }

  await initSDK();

  loadingStart();

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingFill = document.getElementById('loading-fill');
  let loadingHidden = false;
  function hideLoading() {
    if (loadingHidden) return;
    loadingHidden = true;
    loadingOverlay.classList.add('hidden');
    setTimeout(() => (loadingOverlay.style.display = 'none'), 600);
  }
  THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    if (total) loadingFill.style.width = `${Math.round((loaded / total) * 100)}%`;
  };

  const canvas = document.getElementById('game-canvas');
  let sceneCtx;
  try {
    sceneCtx = createScene(canvas);
  } catch (e) {
    loadingStop();
    document.body.innerHTML =
      '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div style="max-width:420px"><div style="font-size:20px;font-weight:700;margin-bottom:10px">Couldn\'t start the 3D engine</div><div style="font-size:15px;line-height:1.5;opacity:.8">Your browser or device may not support WebGL. Try updating your browser, enabling hardware acceleration, or switching to a different one.</div></div></div>';
    return;
  }
  const { scene, camera, renderer } = sceneCtx;
  createEnvironment(scene);
  createDecorations(scene);
  const press = createPress(scene);
  const conveyor = createConveyor(scene, () => resetCombo());
  press.group.position.z = BELT_Z;
  const particles = createParticles(scene);

  const camBase = camera.position.clone();
  const camTarget = new THREE.Vector3(0, 1, 0);
  let shakeMag = 0;
  function addShake(amount) {
    shakeMag = Math.min(0.6, Math.max(shakeMag, amount));
  }

  const saved = await loadGame();
  if (saved) {
    applySave(saved);
    recomputeStats();
  }
  press.setFixed(gameState.pressFixLevel > 0);

  const ui = initUI(
    () => {
      press.setFixed(gameState.pressFixLevel > 0);
      persist();
    },
    () => triggerRebirth()
  );
  ui.refreshUpgrades();

  let paused = false;
  let hidden = false;
  let muteBeforeHide = false;

  const AD_GRACE_MS = 90000;
  const AD_COOLDOWN_MS = 180000;
  let lastInterstitial = -AD_COOLDOWN_MS;
  let bossKills = 0;
  let moneyBoostUntil = 0;
  let goldenSurgeUntil = 0;

  function playAd(kind, onReward) {
    const wasMuted = isMuted();
    const wasPaused = paused;
    paused = true;
    gameplayStop();
    setMuted(true);
    const finish = () => {
      setMuted(wasMuted);
      paused = wasPaused;
      if (!wasPaused) gameplayStart();
    };
    if (kind === 'rewarded') requestRewardedAd({ onReward, onFinish: finish });
    else requestMidgameAd({ onFinish: finish });
  }

  function tryInterstitial() {
    const now = performance.now();
    if (now < AD_GRACE_MS || now - lastInterstitial < AD_COOLDOWN_MS) return;
    lastInterstitial = now;
    playAd('midgame');
  }

  const rebirth = initRebirth(() => {

    conveyor.reset();
    ui.refreshUpgrades();
    persist();
    paused = false;
    gameplayStart();
    tryInterstitial();
  });

  function triggerRebirth() {
    paused = true;
    gameplayStop();
    rebirth.open();
  }

  let combo = 0;
  let comboMult = 1;
  function bumpCombo() {
    combo += 1;
    comboMult = 1 + Math.min(combo, 50) * 0.02;
    ui.setCombo(combo, comboMult);
  }
  function resetCombo() {
    if (combo === 0) return;
    combo = 0;
    comboMult = 1;
    ui.setCombo(0, 1);
  }

  function toScreen(pos) {
    const v = pos.clone();
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function awardMoney(multiplier) {
    let gain =
      gameState.pressPower * multiplier * gameState.rebirthBonuses.cubeValueMult * comboMult;
    if (performance.now() < moneyBoostUntil) gain *= 2;
    let crit = false;
    if (Math.random() < gameState.critChance) {
      gain *= gameState.rebirthBonuses.luckyStrikes ? 10 : 5;
      crit = true;
      ui.flashMoney();
    }
    gameState.money += gain;
    return { gain, crit };
  }

  await preloadCubeModels();

  conveyor.update(0.016);
  loadingStop();

  let started = false;
  function onPointerDown() {
    if (!started) {
      started = true;
      gameplayStart();
      startMusic();
    }
    press.trigger();
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  installIOSResume();

  let firstVisit = false;
  try {
    firstVisit = !localStorage.getItem('cci_visited');
    if (firstVisit) localStorage.setItem('cci_visited', '1');
  } catch {
    firstVisit = false;
  }
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const startBtn = document.getElementById('start-btn');
  if (firstVisit) {
    paused = true;
    welcomeOverlay.classList.add('show');
  }
  startBtn.addEventListener('click', () => {
    welcomeOverlay.classList.remove('show');
    if (!started) {
      started = true;
      gameplayStart();
    }
    startMusic();
    paused = false;
  });

  const rotateOverlay = document.getElementById('rotate-overlay');
  const rotateDismiss = document.getElementById('rotate-dismiss');
  rotateDismiss?.addEventListener('click', () => rotateOverlay.classList.add('dismissed'));

  const boostMoneyBtn = document.getElementById('boost-money');
  const boostGoldenBtn = document.getElementById('boost-golden');
  const moneyLabel = boostMoneyBtn.querySelector('.boost-label');
  const goldenLabel = boostGoldenBtn.querySelector('.boost-label');

  boostMoneyBtn.addEventListener('click', () => {
    if (performance.now() < moneyBoostUntil) return;
    playAd('rewarded', () => {
      moneyBoostUntil = performance.now() + 60000;
    });
  });
  boostGoldenBtn.addEventListener('click', () => {
    if (performance.now() < goldenSurgeUntil) return;
    playAd('rewarded', () => {
      goldenSurgeUntil = performance.now() + 30000;
    });
  });

  function updateBoosts() {
    const now = performance.now();
    const mLeft = Math.ceil((moneyBoostUntil - now) / 1000);
    boostMoneyBtn.classList.toggle('active', mLeft > 0);
    moneyLabel.textContent = mLeft > 0 ? `2× Money · ${mLeft}s` : '2× Money · 60s';

    const gActive = now < goldenSurgeUntil;
    conveyor.setGoldenSurge(gActive);
    const gLeft = Math.ceil((goldenSurgeUntil - now) / 1000);
    boostGoldenBtn.classList.toggle('active', gActive);
    goldenLabel.textContent = gActive ? `Golden Surge · ${gLeft}s` : 'Golden Surge · 30s';
  }

  setInterval(persist, 30000);
  window.addEventListener('beforeunload', persist);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hidden = true;
      muteBeforeHide = isMuted();
      setMuted(true);
      gameplayStop();
      persist();
    } else {
      hidden = false;
      setMuted(muteBeforeHide);
      if (started && !paused && !ui.isPanelOpen()) gameplayStart();
    }
  });

  let prev = performance.now();
  function frame(now) {
    let delta = (now - prev) / 1000;
    prev = now;
    if (delta > 0.1) delta = 0.1;

    if (shakeMag > 0.001) {
      camera.position.set(
        camBase.x + (Math.random() - 0.5) * shakeMag,
        camBase.y + (Math.random() - 0.5) * shakeMag,
        camBase.z + (Math.random() - 0.5) * shakeMag * 0.5
      );
      camera.lookAt(camTarget);
      shakeMag *= 0.85;
    } else if (shakeMag !== 0) {
      shakeMag = 0;
      camera.position.copy(camBase);
      camera.lookAt(camTarget);
    }

    const frozen = paused || ui.isPanelOpen() || hidden;
    if (!frozen) {
      conveyor.update(delta);

      if (press.update(delta * 1000)) {
        const target = conveyor.getCrushTarget();
        if (target) {
          if (target.userData.isBoss) {

            const res = conveyor.damageBoss(target);
            particles.burst(res.position, res.color);
            playBossHit(res.destroyed);
            bumpCombo();
            addShake(res.destroyed ? 0.45 : 0.22);
            ui.dismissHint();
            if (res.destroyed) {
              particles.burst(res.position, res.color);
              const { gain } = awardMoney(res.multiplier);
              const s = toScreen(res.position);
              ui.popText(s.x, s.y, '+' + formatMoney(gain), 'boss');
              bossKills += 1;
              if (bossKills % 5 === 0) tryInterstitial();
            }
          } else {
            const crushed = conveyor.crush(target);
            if (crushed) {
              bumpCombo();
              particles.burst(crushed.position, crushed.color);
              const { gain, crit } = awardMoney(crushed.multiplier);
              const s = toScreen(crushed.position);
              ui.popText(
                s.x,
                s.y,
                '+' + formatMoney(gain),
                crit ? 'crit' : crushed.golden ? 'gold' : ''
              );
              addShake(crit ? 0.3 : 0.15);
              playCrush(crushed.golden);
              ui.dismissHint();
            }
          }
        }
      }

      const boss = conveyor.getBoss();
      if (boss) {
        const v = boss.position.clone();
        v.y += 1.8;
        v.project(camera);
        ui.moveBoss(
          (v.x * 0.5 + 0.5) * window.innerWidth,
          (-v.y * 0.5 + 0.5) * window.innerHeight
        );
        ui.setBossHealth(boss.userData.health / boss.userData.maxHealth);
        ui.showBoss(true);
      } else {
        ui.showBoss(false);
      }

      particles.update(delta);
    }

    ui.setRebirthAvailable(gameState.money >= gameState.rebirthThreshold);
    ui.refreshMoney();
    updateBoosts();

    renderer.render(scene, camera);
    hideLoading();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function persist() {
  gameState.lastSeen = Date.now();
  saveGame(gameState);
}

boot();

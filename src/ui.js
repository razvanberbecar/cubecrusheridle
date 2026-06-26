import { gameState } from './gameState.js';
import { UPGRADES, costFor, canAfford, buyUpgrade, isMaxed } from './upgrades.js';
import { gameplayStart, gameplayStop } from './sdk.js';
import { playPurchase, toggleMute, isMuted, setMusicVolume, setSfxVolume } from './audio.js';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
export function formatMoney(n) {
  if (n < 1000) return '$' + Math.floor(n).toLocaleString('en-US');
  let tier = 0;
  while (n >= 1000 && tier < SUFFIXES.length - 1) {
    n /= 1000;
    tier++;
  }
  return '$' + n.toFixed(2).replace(/\.?0+$/, '') + SUFFIXES[tier];
}

export function initUI(onPurchase, onRebirth) {
  const moneyEl = document.getElementById('money-display');
  const panel = document.getElementById('upgrade-panel');
  const listEl = document.getElementById('upgrade-list');
  const openBtn = document.getElementById('open-panel');
  const closeBtn = document.getElementById('close-panel');
  const muteBtn = document.getElementById('mute-btn');
  const rebirthBtn = document.getElementById('rebirth-btn');
  const hintEl = document.getElementById('hint');
  const bossHealthEl = document.getElementById('boss-health');
  const bossFillEl = document.getElementById('boss-health-fill');
  const fxLayer = document.getElementById('fx-layer');
  const comboEl = document.getElementById('combo');
  const comboCountEl = comboEl.querySelector('.combo-count');
  const comboMultEl = comboEl.querySelector('.combo-mult');
  const rebirthProgEl = document.getElementById('rebirth-progress');
  const rpFill = rebirthProgEl.querySelector('.rp-fill');
  const rpText = rebirthProgEl.querySelector('.rp-text');

  let lastMoneyText = '';
  let lastRpText = '';
  let lastRpPct = -1;
  let lastRpReady = null;
  const rows = new Map(); // upgrade.id -> { btn, levelEl, costEl }

  // ---- Build the upgrade rows once ----
  for (const up of UPGRADES) {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `
      <span class="up-info">
        <span class="up-name">${up.name}</span>
        <span class="up-effect"></span>
      </span>
      <span class="up-buy">
        <span class="up-level"></span>
        <span class="up-cost"></span>
      </span>`;
    const effectEl = btn.querySelector('.up-effect');
    const levelEl = btn.querySelector('.up-level');
    const costEl = btn.querySelector('.up-cost');

    btn.addEventListener('click', () => {
      if (buyUpgrade(up)) {
        playPurchase();
        refreshUpgrades();
        onPurchase?.();
      }
    });

    listEl.appendChild(btn);
    rows.set(up.id, { btn, effectEl, levelEl, costEl });
  }

  let panelOpen = false;
  let settingsOpen = false;
  function syncMenu() {
    if (panelOpen || settingsOpen) gameplayStop();
    else gameplayStart();
  }
  function openPanel() {
    panelOpen = true;
    panel.classList.add('open');
    refreshUpgrades();
    syncMenu();
  }
  function closePanel() {
    panelOpen = false;
    panel.classList.remove('open');
    syncMenu();
  }
  openBtn.addEventListener('click', () => (panelOpen ? closePanel() : openPanel()));
  closeBtn.addEventListener('click', closePanel);

  rebirthBtn.addEventListener('click', () => onRebirth?.());
  let rebirthShown = null;
  function setRebirthAvailable(avail) {
    if (avail === rebirthShown) return;
    rebirthShown = avail;
    rebirthBtn.style.display = avail ? 'inline-block' : 'none';
  }

  muteBtn.addEventListener('click', () => {
    const m = toggleMute();
    muteBtn.textContent = m ? '🔇' : '🔊';
  });

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const volMusic = document.getElementById('vol-music');
  const volSfx = document.getElementById('vol-sfx');
  settingsBtn.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsPanel.classList.toggle('open', settingsOpen);
    syncMenu();
  });

  function readVol(key, fallback) {
    const v = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback;
  }
  const startMusicVol = readVol('cci_vol_music', 100);
  const startSfxVol = readVol('cci_vol_sfx', 100);
  volMusic.value = startMusicVol;
  volSfx.value = startSfxVol;
  setMusicVolume(startMusicVol / 100);
  setSfxVolume(startSfxVol / 100);
  volMusic.addEventListener('input', () => {
    setMusicVolume(volMusic.value / 100);
    try { localStorage.setItem('cci_vol_music', volMusic.value); } catch {}
  });
  volSfx.addEventListener('input', () => {
    setSfxVolume(volSfx.value / 100);
    try { localStorage.setItem('cci_vol_sfx', volSfx.value); } catch {}
  });

  function popText(x, y, text, kind = '') {
    const el = document.createElement('div');
    el.className = 'fx-pop' + (kind ? ' ' + kind : '');
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // ---- Combo / streak indicator ----
  function setCombo(count, mult) {
    if (count >= 2) {
      comboEl.classList.add('show');
      comboCountEl.textContent = `🔥 ${count} COMBO`;
      comboMultEl.textContent = `${mult.toFixed(2)}× money`;
      comboEl.classList.remove('bump');
      void comboEl.offsetWidth;
      comboEl.classList.add('bump');
    } else {
      comboEl.classList.remove('show');
    }
  }

  let hintDismissed = false;
  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    hintEl.classList.add('hidden');
    setTimeout(() => (hintEl.style.display = 'none'), 450);
  }

  let flashTimer = null;
  function flashMoney() {
    moneyEl.classList.add('crit');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => moneyEl.classList.remove('crit'), 300);
  }

  function showBoss(show) {
    bossHealthEl.style.display = show ? 'block' : 'none';
  }
  function setBossHealth(ratio) {
    bossFillEl.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }
  function moveBoss(x, y) {
    bossHealthEl.style.left = `${x}px`;
    bossHealthEl.style.top = `${y}px`;
  }

  function refreshMoney() {
    const txt = formatMoney(gameState.money);
    if (txt !== lastMoneyText) {
      moneyEl.textContent = txt;
      lastMoneyText = txt;
      if (panelOpen) refreshAffordability();
    }
    refreshRebirthProgress();
  }

  function refreshRebirthProgress() {
    const threshold = gameState.rebirthThreshold;
    const ready = gameState.money >= threshold;
    const pct = Math.round(Math.max(0, Math.min(1, gameState.money / threshold)) * 1000) / 10;
    if (pct !== lastRpPct) {
      rpFill.style.width = pct + '%';
      lastRpPct = pct;
    }
    const txt = ready
      ? 'Rebirth ready ✦'
      : formatMoney(threshold - gameState.money) + ' to go';
    if (txt !== lastRpText) {
      rpText.textContent = txt;
      lastRpText = txt;
    }
    if (ready !== lastRpReady) {
      rebirthProgEl.classList.toggle('ready', ready);
      lastRpReady = ready;
    }
  }

  function refreshUpgrades() {
    for (const up of UPGRADES) {
      const row = rows.get(up.id);
      const oneTime = up.maxLevel === 1;
      const maxed = isMaxed(up);
      row.levelEl.textContent = oneTime ? '' : `Lv.${gameState[up.levelKey]}`;
      row.costEl.textContent = maxed ? (oneTime ? 'OWNED' : 'MAX') : formatMoney(costFor(up));
      row.effectEl.textContent = up.effectText(gameState[up.levelKey]);
    }
    refreshAffordability();
  }

  function refreshAffordability() {
    for (const up of UPGRADES) {
      rows.get(up.id).btn.disabled = !canAfford(up);
    }
  }

  refreshUpgrades();

  return {
    refreshMoney,
    refreshUpgrades,
    dismissHint,
    flashMoney,
    setRebirthAvailable,
    showBoss,
    setBossHealth,
    moveBoss,
    popText,
    setCombo,
    isPanelOpen: () => panelOpen || settingsOpen,
  };
}

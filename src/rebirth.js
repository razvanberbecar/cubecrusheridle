import { gameState } from './gameState.js';
import { recomputeStats } from './upgrades.js';

export function performRebirth(bonusId) {
  const b = gameState.rebirthBonuses;

  switch (bonusId) {
    case 'cubeValue':
      b.cubeValueMult *= 1.2;
      break;
    case 'headStart':
      b.headStart = true;
      break;
    case 'pressVeteran':
      b.pressVeteran = true;
      break;
    case 'goldenTouch':
      b.goldenChanceBonus += 0.03;
      break;
    case 'speedDemon':
      b.speedDemon = true;
      break;
    case 'luckyStrikes':
      b.luckyStrikes = true;
      break;
  }

  gameState.money = b.headStart ? 200 : 0;
  gameState.pressLevel = b.pressVeteran ? 3 : 0;
  gameState.conveyorLevel = b.speedDemon ? 3 : 0;
  gameState.goldenLevel = 0;
  gameState.critLevel = 0;
  gameState.magnetLevel = 0;
  gameState.crushCount = 0;
  recomputeStats();

  gameState.rebirthCount += 1;
  gameState.rebirthThreshold *= 3;
}

export function initRebirth(onComplete) {
  const overlay = document.getElementById('rebirth-overlay');
  const badge = document.getElementById('rebirth-badge');
  const titleEl = document.getElementById('rebirth-subtitle');

  overlay.querySelectorAll('.web-node').forEach((node) => {
    node.addEventListener('click', () => {
      performRebirth(node.dataset.bonus);
      hide();
      updateBadge();
      onComplete?.();
    });
  });

  function open() {

    titleEl.textContent = `Rebirth #${gameState.rebirthCount + 1} — choose one permanent bonus`;
    overlay.classList.add('show');
  }

  function hide() {
    overlay.classList.remove('show');
  }

  function updateBadge() {
    if (gameState.rebirthCount <= 0) {
      badge.style.display = 'none';
      return;
    }
    const b = gameState.rebirthBonuses;
    const chips = [];
    if (b.cubeValueMult > 1) chips.push(`Cube ×${b.cubeValueMult.toFixed(2)}`);
    if (b.headStart) chips.push('Head Start');
    if (b.pressVeteran) chips.push('Veteran');
    if (b.goldenChanceBonus > 0) chips.push(`+${Math.round(b.goldenChanceBonus * 100)}% Gold`);
    if (b.speedDemon) chips.push('Speed Demon');
    if (b.luckyStrikes) chips.push('Lucky ×10');

    badge.style.display = 'block';
    badge.innerHTML =
      `<div class="rb-count">♻ Rebirth ${gameState.rebirthCount}</div>` +
      chips.map((c) => `<span class="rb-chip">${c}</span>`).join('');
  }

  updateBadge();
  return { open, updateBadge };
}

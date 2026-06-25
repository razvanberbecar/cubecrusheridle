export const gameState = {
  money: 0,
  pressPower: 1,
  conveyorSpeed: 1,
  goldenChance: 0,
  critChance: 0,
  magnetStrength: 0,

  pressLevel: 0,
  conveyorLevel: 0,
  goldenLevel: 0,
  critLevel: 0,
  magnetLevel: 0,
  pressFixLevel: 0,

  crushCount: 0,

  rebirthCount: 0,
  rebirthThreshold: 5000,
  rebirthBonuses: {
    cubeValueMult: 1,
    headStart: false,
    pressVeteran: false,
    goldenChanceBonus: 0,
    speedDemon: false,
    luckyStrikes: false,
  },

  lastSeen: Date.now(),
};

const DEFAULTS = { ...gameState };

export function applySave(raw) {
  if (!raw || typeof raw !== 'object') return;

  for (const key of Object.keys(DEFAULTS)) {
    if (
      typeof DEFAULTS[key] === 'number' &&
      typeof raw[key] === 'number' &&
      Number.isFinite(raw[key])
    ) {
      gameState[key] = raw[key];
    }
  }

  if (raw.rebirthBonuses && typeof raw.rebirthBonuses === 'object') {
    const dst = gameState.rebirthBonuses;
    for (const k of Object.keys(dst)) {
      const v = raw.rebirthBonuses[k];
      if (typeof dst[k] === 'number' && typeof v === 'number' && Number.isFinite(v)) {
        dst[k] = v;
      } else if (typeof dst[k] === 'boolean' && typeof v === 'boolean') {
        dst[k] = v;
      }
    }
  }
}

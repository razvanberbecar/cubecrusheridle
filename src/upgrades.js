import { gameState } from './gameState.js';

const GOLD_CHANCE_PER_LEVEL = 0.02;
const CRIT_CHANCE_PER_LEVEL = 0.05;
const CRIT_CHANCE_MAX = 0.5;
const MAGNET_PULL_PER_LEVEL = 1.2;

export const UPGRADES = [
  {
    id: 'press',
    name: 'Press Power',
    baseCost: 10,
    growthRate: 1.6,
    levelKey: 'pressLevel',
    effectText: (lvl) => `x${(1 + lvl * 0.5).toFixed(1)} money / crush`,
    apply() {
      gameState.pressPower = 1 + gameState.pressLevel * 0.5;
    },
  },
  {

    id: 'fixpress',
    name: 'Fix Press',
    baseCost: 1000,
    growthRate: 1,
    levelKey: 'pressFixLevel',
    maxLevel: 1,
    effectText: (lvl) => (lvl > 0 ? 'Press restored ✓' : 'Repair the rusty press'),
    apply() {},
  },
  {
    id: 'conveyor',
    name: 'Conveyor Speed',
    baseCost: 15,
    growthRate: 1.5,
    levelKey: 'conveyorLevel',
    effectText: (lvl) => `x${(1 + lvl * 0.3).toFixed(1)} belt speed`,
    apply() {
      gameState.conveyorSpeed = 1 + gameState.conveyorLevel * 0.3;
    },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    baseCost: 40,
    growthRate: 1.55,
    levelKey: 'magnetLevel',
    effectText: (lvl) =>
      lvl > 0 ? `+${(lvl * MAGNET_PULL_PER_LEVEL).toFixed(1)} belt pull` : 'no pull yet',
    apply() {
      gameState.magnetStrength = gameState.magnetLevel * MAGNET_PULL_PER_LEVEL;
    },
  },
  {
    id: 'golden',
    name: 'Golden Cube',
    baseCost: 50,
    growthRate: 1.7,
    levelKey: 'goldenLevel',
    effectText: (lvl) =>
      `${Math.round(Math.min(lvl * GOLD_CHANCE_PER_LEVEL, 1) * 100)}% golden · x10 $`,
    apply() {
      gameState.goldenChance = Math.min(gameState.goldenLevel * GOLD_CHANCE_PER_LEVEL, 1);
    },
  },
  {
    id: 'crit',
    name: 'Critical Hit',
    baseCost: 30,
    growthRate: 1.65,
    levelKey: 'critLevel',
    effectText: (lvl) =>
      `${Math.round(Math.min(lvl * CRIT_CHANCE_PER_LEVEL, CRIT_CHANCE_MAX) * 100)}% crit · x5 $`,
    apply() {
      gameState.critChance = Math.min(
        gameState.critLevel * CRIT_CHANCE_PER_LEVEL,
        CRIT_CHANCE_MAX
      );
    },
  },
];

export function isMaxed(upgrade) {
  return upgrade.maxLevel != null && gameState[upgrade.levelKey] >= upgrade.maxLevel;
}

export function costFor(upgrade) {
  const level = gameState[upgrade.levelKey];
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.growthRate, level));
}

export function canAfford(upgrade) {
  return !isMaxed(upgrade) && gameState.money >= costFor(upgrade);
}

export function buyUpgrade(upgrade) {
  if (isMaxed(upgrade)) return false;
  const cost = costFor(upgrade);
  if (gameState.money < cost) return false;
  gameState.money -= cost;
  gameState[upgrade.levelKey] += 1;
  upgrade.apply();
  return true;
}

export function recomputeStats() {
  for (const upgrade of UPGRADES) upgrade.apply();
}

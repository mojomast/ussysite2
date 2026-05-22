export const RUN_STATE_KEY = 'ussysite2.runState.v1';

const SCHEMA_VERSION = 1;

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function getStorage() {
  return globalThis.sessionStorage || null;
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function stringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0);
}

function cloneReputation(reputationState = {}) {
  const source = isObject(reputationState.scores) ? reputationState.scores : reputationState;
  return { ...source };
}

function buildRunState(combatState = {}, traderState = {}, reputationState = {}, skillTree = {}) {
  const maxShieldHp = Math.max(1, Math.round(skillTree.getMaxShield?.() ?? 100));
  const maxHull = Math.max(1, Math.round(skillTree.getMaxArmor?.() ?? 100));
  return {
    v: SCHEMA_VERSION,
    ts: now(),
    combat: {
      score: Math.max(0, Math.round(combatState.flightScore ?? combatState.score ?? 0)),
      wave: Math.max(1, Math.round(combatState.waveNumber ?? combatState.wave ?? 1)),
      credits: Math.max(0, Math.round(traderState.credits ?? combatState.credits ?? 0)),
      hull: Math.max(1, Math.round(combatState.hull ?? combatState.armor ?? maxHull)),
      shieldHp: Math.max(0, Math.round(combatState.shieldHp ?? combatState.shield ?? maxShieldHp)),
      maxShieldHp,
      maxHull,
      bossThresholdIdx: Math.max(0, Math.round(combatState.bossThresholdIdx ?? 0)),
      killCount: Math.max(0, Math.round(combatState.killCount ?? combatState.sessionKills ?? 0))
    },
    trader: {
      equippedPrimary: combatState.primaryWeapon ?? traderState.equippedPrimary ?? null,
      equippedSecondary: combatState.secondaryWeapon ?? traderState.equippedSecondary ?? null,
      inventory: [...(combatState.ownedWeapons || traderState.inventory || [])].filter(item => typeof item === 'string')
    },
    rep: cloneReputation(reputationState),
    skills: [...(skillTree.unlocked || combatState.unlocked || [])].filter(item => typeof item === 'string')
  };
}

export function saveRunState(combatState, traderState, reputationState, skillTree) {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(RUN_STATE_KEY, JSON.stringify(buildRunState(combatState, traderState, reputationState, skillTree)));
    return true;
  } catch {
    return false;
  }
}

export function loadRunState() {
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(RUN_STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return isObject(data) ? data : null;
  } catch {
    return null;
  }
}

export function clearRunState() {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.removeItem(RUN_STATE_KEY);
    return true;
  } catch {
    return false;
  }
}

function validateRunState(data) {
  if (!isObject(data) || data.v !== SCHEMA_VERSION || !finiteNumber(data.ts)) return false;
  if (!isObject(data.combat) || !isObject(data.trader) || !isObject(data.rep)) return false;
  const { combat, trader } = data;
  if (!nonNegativeInteger(combat.score)) return false;
  if (!Number.isInteger(combat.wave) || combat.wave < 1) return false;
  if (!nonNegativeInteger(combat.credits)) return false;
  if (!Number.isInteger(combat.maxHull) || combat.maxHull < 1) return false;
  if (!Number.isInteger(combat.hull) || combat.hull < 1 || combat.hull > combat.maxHull) return false;
  if (!Number.isInteger(combat.maxShieldHp) || combat.maxShieldHp < 1) return false;
  if (!Number.isInteger(combat.shieldHp) || combat.shieldHp < 0 || combat.shieldHp > combat.maxShieldHp) return false;
  if (!nonNegativeInteger(combat.bossThresholdIdx) || !nonNegativeInteger(combat.killCount)) return false;
  if (typeof trader.equippedPrimary !== 'string' || typeof trader.equippedSecondary !== 'string') return false;
  if (!stringArray(trader.inventory) || !stringArray(data.skills)) return false;
  return Object.values(data.rep).every(value => finiteNumber(value));
}

function replaceSetContents(targetSet, values) {
  if (!targetSet || typeof targetSet.clear !== 'function' || typeof targetSet.add !== 'function') return;
  targetSet.clear();
  values.forEach(value => targetSet.add(value));
}

export function applyRunState(data, combatState = {}, traderState = {}, reputationState = {}, skillTree = {}) {
  if (!validateRunState(data)) return false;
  const { combat, trader, rep, skills } = data;
  combatState.score = combat.score;
  combatState.flightScore = combat.score;
  combatState.waveNumber = combat.wave;
  combatState.credits = combat.credits;
  combatState.hull = combat.hull;
  combatState.armor = combat.hull;
  combatState.shieldHp = combat.shieldHp;
  combatState.shield = combat.shieldHp;
  combatState.maxShieldHp = combat.maxShieldHp;
  combatState.maxHull = combat.maxHull;
  combatState.bossThresholdIdx = combat.bossThresholdIdx;
  combatState.killCount = combat.killCount;
  combatState.sessionKills = combat.killCount;
  combatState.primaryWeapon = trader.equippedPrimary;
  combatState.secondaryWeapon = trader.equippedSecondary;
  traderState.credits = combat.credits;
  traderState.equippedPrimary = trader.equippedPrimary;
  traderState.equippedSecondary = trader.equippedSecondary;
  traderState.inventory = [...trader.inventory];
  replaceSetContents(combatState.ownedWeapons, trader.inventory);
  const scores = isObject(reputationState.scores) ? reputationState.scores : reputationState;
  Object.keys(rep).forEach(faction => {
    scores[faction] = rep[faction];
  });
  replaceSetContents(skillTree.unlocked, skills);
  replaceSetContents(combatState.unlocked, skills);
  return true;
}

import { PLANETS, STATIONS } from './world.js';

export const RUN_STATE_KEY = 'ussysite2.runState.v1';

const SCHEMA_VERSION = 2;
const ACTIVE_AUTOPILOT_STATES = new Set(['PLOTTING', 'ENGAGED', 'DECELERATING']);

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

function missionArray(value) {
  return Array.isArray(value) && value.every(item => isObject(item) && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.status === 'string');
}

function getCoord(source, axis, index) {
  if (!source) return 0;
  if (Array.isArray(source)) return source[index] ?? 0;
  if (Array.isArray(source.pos)) return source.pos[index] ?? 0;
  if (Array.isArray(source.position)) return source.position[index] ?? 0;
  if (source.position && typeof source.position === 'object') return source.position[axis] ?? 0;
  return source[axis] ?? 0;
}

function toFinitePositionArray(pos) {
  if (!pos) return null;
  const position = [getCoord(pos, 'x', 0), getCoord(pos, 'y', 1), getCoord(pos, 'z', 2)];
  return position.every(finiteNumber) ? position : null;
}

function getBodyId(body) {
  return body?.id ?? body?.userData?.planetId ?? body?.userData?.stationId ?? body?.userData?.bodyId ?? null;
}

function isValidPositionArray(position) {
  return Array.isArray(position) && position.length === 3 && position.every(finiteNumber);
}

export function getNearestPersistedBody(playerPos, bodies = [...PLANETS, ...STATIONS], maxDist = Infinity) {
  const origin = toFinitePositionArray(playerPos);
  if (!origin) return null;
  let nearest = null;

  for (const body of bodies ?? []) {
    const id = getBodyId(body);
    if (!id) continue;
    const position = toFinitePositionArray(body);
    if (!position) continue;
    const dx = position[0] - origin[0];
    const dy = position[1] - origin[1];
    const dz = position[2] - origin[2];
    const dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    if (dist <= maxDist && (!nearest || dist < nearest.dist)) nearest = { body: { ...body, id }, dist };
  }

  return nearest;
}

function getPersistableAutopilotTargetId(flightState) {
  const autopilot = flightState?.autopilot;
  if (!autopilot || typeof autopilot !== 'object' || typeof autopilot.targetId !== 'string' || autopilot.targetId.length === 0) return null;
  if (autopilot.engaged === true || autopilot.active === true || ACTIVE_AUTOPILOT_STATES.has(autopilot.state)) return autopilot.targetId;
  return null;
}

function buildFlightRunState(flightState, options = {}) {
  const position = toFinitePositionArray(flightState?.pos);
  const bodies = options.bodies ?? options.persistBodies ?? [...PLANETS, ...STATIONS];
  const nearestBody = position ? getNearestPersistedBody(position, bodies, options.maxBodyDistance ?? Infinity) : null;
  const autopilotTargetId = getPersistableAutopilotTargetId(flightState);
  const flight = {};

  if (position) flight.position = position;
  if (nearestBody?.body?.id) flight.lastVisitedBodyId = nearestBody.body.id;
  if (autopilotTargetId) flight.autopilotTargetId = autopilotTargetId;
  return Object.keys(flight).length ? flight : null;
}

function cloneReputation(reputationState = {}) {
  const source = isObject(reputationState.scores) ? reputationState.scores : reputationState;
  return { ...source };
}

function buildRunState(combatState = {}, traderState = {}, reputationState = {}, skillTree = {}, options = {}) {
  const maxShieldHp = Math.max(1, Math.round(skillTree.getMaxShield?.() ?? 100));
  const maxHull = Math.max(1, Math.round(skillTree.getMaxArmor?.() ?? 100));
  const state = {
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
      inventory: [...(combatState.ownedWeapons || traderState.inventory || [])].filter(item => typeof item === 'string'),
      activeMissions: Array.isArray(traderState.activeMissions) ? traderState.activeMissions : [],
      completedMissionIds: Array.isArray(traderState.completedMissionIds) ? traderState.completedMissionIds.filter(item => typeof item === 'string') : []
    },
    rep: cloneReputation(reputationState),
    skills: [...(skillTree.unlocked || combatState.unlocked || [])].filter(item => typeof item === 'string')
  };
  const flight = buildFlightRunState(options.flightState, options);
  if (flight) state.flight = flight;
  return state;
}

export function saveRunState(combatState, traderState, reputationState, skillTree, options = {}) {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(RUN_STATE_KEY, JSON.stringify(buildRunState(combatState, traderState, reputationState, skillTree, options)));
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
    if (isObject(data) && data.v === 1) return null;
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
  if (trader.activeMissions !== undefined && !missionArray(trader.activeMissions)) return false;
  if (trader.completedMissionIds !== undefined && !stringArray(trader.completedMissionIds)) return false;
  if (!Object.values(data.rep).every(value => finiteNumber(value))) return false;
  if (data.flight !== undefined) {
    if (!isObject(data.flight)) return false;
    if (data.flight.position !== undefined && !isValidPositionArray(data.flight.position)) return false;
    if (data.flight.lastVisitedBodyId !== undefined && typeof data.flight.lastVisitedBodyId !== 'string') return false;
    if (data.flight.autopilotTargetId !== undefined && typeof data.flight.autopilotTargetId !== 'string') return false;
  }
  return true;
}

function applyPosition(target, position) {
  if (!target || !isValidPositionArray(position)) return;
  const [x, y, z] = position;
  if (typeof target.copy === 'function') {
    target.copy({ x, y, z });
  } else if (typeof target.set === 'function') {
    target.set(x, y, z);
  } else {
    target.x = x;
    target.y = y;
    target.z = z;
  }
}

function applyFlightRunState(flight, options = {}) {
  if (!isObject(flight)) return;
  const flightState = options.flightState ?? options.state ?? null;
  if (flightState?.pos && isValidPositionArray(flight.position)) applyPosition(flightState.pos, flight.position);

  const lastVisitedTarget = options.lastVisitedState ?? flightState;
  if (lastVisitedTarget && typeof flight.lastVisitedBodyId === 'string') {
    lastVisitedTarget.lastVisitedBodyId = flight.lastVisitedBodyId;
  }

  if (typeof flight.autopilotTargetId === 'string' && options.navGraph && typeof options.plotCourse === 'function') {
    options.plotCourse(flightState, options.navGraph, flight.autopilotTargetId);
  }
}

function replaceSetContents(targetSet, values) {
  if (!targetSet || typeof targetSet.clear !== 'function' || typeof targetSet.add !== 'function') return;
  targetSet.clear();
  values.forEach(value => targetSet.add(value));
}

export function applyRunState(data, combatState = {}, traderState = {}, reputationState = {}, skillTree = {}, options = {}) {
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
  traderState.activeMissions = trader.activeMissions
    ? (typeof structuredClone === 'function' ? structuredClone(trader.activeMissions) : JSON.parse(JSON.stringify(trader.activeMissions)))
    : [];
  traderState.completedMissionIds = trader.completedMissionIds ? [...trader.completedMissionIds] : [];
  traderState.missionBoard ??= { declinedMissionIds: [] };
  replaceSetContents(combatState.ownedWeapons, trader.inventory);
  const scores = isObject(reputationState.scores) ? reputationState.scores : reputationState;
  Object.keys(rep).forEach(faction => {
    scores[faction] = rep[faction];
  });
  replaceSetContents(skillTree.unlocked, skills);
  replaceSetContents(combatState.unlocked, skills);
  applyFlightRunState(data.flight, options);
  return true;
}

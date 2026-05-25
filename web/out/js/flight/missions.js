import { COMMODITIES } from '../economy/trader.js';
import { distanceBetweenNodes, findRoute, getNavNode } from './navgraph.js';

export const MISSION_TYPES = Object.freeze({
  BOUNTY: 'BOUNTY',
  DELIVERY: 'DELIVERY',
  ESCORT: 'ESCORT',
  SCAN: 'SCAN',
  PATROL: 'PATROL'
});

const ACTIVE_MISSION_LIMIT = 3;
const FACTIONS = ['core', 'creative', 'infrastructure', 'security', 'governance', 'tools'];
const KILL_CLASSES = ['scout', 'raider', 'interceptor'];
const TYPE_ACTION = {
  BOUNTY: 'kill',
  DELIVERY: 'deliver',
  ESCORT: 'escort',
  SCAN: 'scan',
  PATROL: 'patrol'
};
const TYPE_TITLES = {
  BOUNTY: ['Rogue Signal Hunt', 'Lane Raider Contract', 'Blackbox Bounty'],
  DELIVERY: ['Priority Data Run', 'Sealed Cargo Transfer', 'Relay Packet Delivery'],
  ESCORT: ['Convoy Shadow', 'Courier Guard', 'Beacon Escort'],
  SCAN: ['Deep Scan Sweep', 'Anomaly Survey', 'Signal Triangulation'],
  PATROL: ['Perimeter Patrol', 'Jump Lane Sweep', 'Ring Security Pass']
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stationTypes(stationDef = {}) {
  if (stationDef.type === 'outpost') return [MISSION_TYPES.BOUNTY, MISSION_TYPES.PATROL];
  if (stationDef.type === 'military') return [MISSION_TYPES.BOUNTY, MISSION_TYPES.PATROL, MISSION_TYPES.ESCORT];
  return [MISSION_TYPES.DELIVERY, MISSION_TYPES.ESCORT, MISSION_TYPES.SCAN];
}

function getNodeName(navGraph, id) {
  return getNavNode(navGraph, id)?.name ?? id;
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  if (typeof a.distanceTo === 'function') return a.distanceTo(b);
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0), (a.z ?? 0) - (b.z ?? 0));
}

function routeDistance(navGraph, route = []) {
  let total = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const dist = distanceBetweenNodes(navGraph, route[index], route[index + 1]);
    if (Number.isFinite(dist)) total += dist;
  }
  return total;
}

function preferredTargetTypes(type) {
  if (type === MISSION_TYPES.PATROL) return new Set(['jump']);
  if (type === MISSION_TYPES.SCAN) return new Set(['planet', 'station']);
  if (type === MISSION_TYPES.DELIVERY || type === MISSION_TYPES.ESCORT) return new Set(['station', 'planet']);
  return null;
}

function pickTarget(stationId, type, navGraph, rng) {
  const preferred = preferredTargetTypes(type);
  const candidates = [...(navGraph?.values?.() ?? [])]
    .filter(node => node.id !== stationId)
    .map(node => ({ node, route: findRoute(navGraph, stationId, node.id) }))
    .filter(entry => Array.isArray(entry.route) && entry.route.length > 1);
  const pool = candidates.filter(entry => !preferred || preferred.has(entry.node.type));
  const usable = pool.length ? pool : candidates;
  if (!usable.length) return null;
  usable.sort((a, b) => {
    const typeBias = (preferred?.has(b.node.type) ? 1 : 0) - (preferred?.has(a.node.type) ? 1 : 0);
    if (typeBias) return typeBias;
    return a.node.id.localeCompare(b.node.id);
  });
  return pick(usable, rng);
}

function stationFaction(stationDef = {}) {
  if (stationDef.id === 'fort-kova' || stationDef.type === 'military') return 'security';
  if (stationDef.id === 'hub-alpha' || stationDef.type === 'hub') return 'infrastructure';
  if (stationDef.id === 'relay-7' || stationDef.type === 'outpost') return 'tools';
  return FACTIONS[hashString(stationDef.id ?? stationDef.name ?? 'station') % FACTIONS.length];
}

function buildReward(type, route, navGraph, required) {
  const distanceBonus = Math.round(routeDistance(navGraph, route) / 120);
  const hopBonus = Math.max(0, route.length - 1) * 90;
  const typeBonus = type === MISSION_TYPES.BOUNTY ? required * 140 : type === MISSION_TYPES.ESCORT ? 240 : 120;
  return clamp(500 + distanceBonus + hopBonus + typeBonus, 500, 2000);
}

function deliveryItem(stationId, targetId, rng) {
  const options = COMMODITIES.filter(item => !item.blackMarketOnly && !item.restricted);
  const item = pick(options, rng) ?? { id: 'devplans', name: 'DEVPLANS' };
  return {
    commodityId: item.id,
    name: item.name,
    qty: 1 + Math.floor(rng() * 3),
    sourceId: stationId,
    destinationId: targetId
  };
}

export function createMission(overrides = {}) {
  return {
    id: null,
    title: '',
    description: '',
    type: MISSION_TYPES.BOUNTY,
    issuer: null,
    targetId: null,
    objective: '',
    reward: 0,
    reputationReward: 0,
    timeLimit: null,
    status: 'AVAILABLE',
    killTarget: null,
    deliveryItem: null,
    acceptedAt: null,
    ...overrides
  };
}

function createGeneratedMission({ stationDef = {}, stationId = stationDef.id, seed = 0, slot = 0, type, targetId, navGraph, route } = {}) {
  if (!stationId || !navGraph) return null;
  const rng = createRng(`${stationId}:${seed}:${slot}:${type ?? 'mission'}`);
  const missionType = type ?? pick(stationTypes(stationDef), rng);
  const targetEntry = targetId ? { node: getNavNode(navGraph, targetId), route: route ?? findRoute(navGraph, stationId, targetId) } : pickTarget(stationId, missionType, navGraph, rng);
  if (!targetEntry?.node) return null;
  const missionRoute = Array.isArray(targetEntry.route) ? targetEntry.route : [stationId, targetEntry.node.id];
  const required = missionType === MISSION_TYPES.BOUNTY ? 2 + Math.floor(rng() * 4) : missionType === MISSION_TYPES.PATROL ? 2 + Math.floor(rng() * 3) : 1;
  const targetName = targetEntry.node.name ?? targetEntry.node.id;
  const id = `mb-${stationId}-${seed}-${slot}-${missionType.toLowerCase()}-${targetEntry.node.id}`;
  const title = pick(TYPE_TITLES[missionType], rng);
  const killClass = pick(KILL_CLASSES, rng);
  const delivery = missionType === MISSION_TYPES.DELIVERY ? deliveryItem(stationId, targetEntry.node.id, rng) : null;
  const reputationFaction = stationFaction(stationDef);
  const reward = buildReward(missionType, missionRoute, navGraph, required);

  return createMission({
    id,
    title,
    description: `${title}: ${getNodeName(navGraph, stationId)} -> ${targetName}.`,
    type: missionType,
    issuer: stationId,
    targetId: targetEntry.node.id,
    objective: {
      action: TYPE_ACTION[missionType],
      current: 0,
      required,
      targetName
    },
    reward,
    reputationReward: {
      faction: reputationFaction,
      amount: clamp(Math.round(reward / 250), 2, 8)
    },
    timeLimit: missionType === MISSION_TYPES.DELIVERY ? 300 : missionType === MISSION_TYPES.ESCORT ? 240 : null,
    status: 'AVAILABLE',
    killTarget: missionType === MISSION_TYPES.BOUNTY ? { classId: killClass, count: required, spawned: 0 } : null,
    deliveryItem: delivery,
    acceptedAt: null
  });
}

export function generateMissionsForStation(stationDef = {}, navGraphOrSeed, seedOrNavGraph = 0, traderState = {}) {
  let navGraph = navGraphOrSeed;
  let seed = seedOrNavGraph;
  if (typeof navGraphOrSeed === 'number') {
    seed = navGraphOrSeed;
    navGraph = seedOrNavGraph;
  }
  const stationId = stationDef.id;
  if (!stationId || !navGraph) return [];
  const rng = createRng(`${stationId}:${seed}`);
  const count = 3 + Math.floor(rng() * 3);
  const allowedTypes = stationTypes(stationDef);
  const hiddenIds = new Set([
    ...(traderState.completedMissionIds ?? []),
    ...(traderState.missionBoard?.declinedMissionIds ?? []),
    ...(traderState.missionBoard?.declinedIds ?? [])
  ]);
  const missions = [];
  for (let slot = 0; slot < count; slot += 1) {
    const type = allowedTypes[slot % allowedTypes.length];
    const mission = createGeneratedMission({ stationDef, seed, slot, type, navGraph });
    if (mission && !hiddenIds.has(mission.id)) missions.push(mission);
  }
  return missions;
}

function ensureMissionState(traderState = {}) {
  traderState.activeMissions ??= [];
  traderState.completedMissionIds ??= [];
  traderState.missionBoard ??= {};
  traderState.missionBoard.declinedMissionIds ??= [];
  return traderState;
}

function cloneMission(mission) {
  return typeof structuredClone === 'function' ? structuredClone(mission) : JSON.parse(JSON.stringify(mission));
}

export function acceptMission(traderState, mission, now = globalThis.performance?.now?.() ?? Date.now()) {
  ensureMissionState(traderState);
  const active = traderState.activeMissions.filter(item => item.status === 'ACTIVE');
  if (active.length >= ACTIVE_MISSION_LIMIT) return { ok: false, success: false, reason: 'ACTIVE_LIMIT' };
  if (!mission || mission.status !== 'AVAILABLE') return { ok: false, success: false, reason: 'UNAVAILABLE' };
  if (traderState.completedMissionIds.includes(mission.id)) return { ok: false, success: false, reason: 'COMPLETED' };
  const accepted = cloneMission(mission);
  accepted.status = 'ACTIVE';
  accepted.acceptedAt = now;
  traderState.activeMissions.push(accepted);
  return { ok: true, success: true, mission: accepted };
}

export function declineMission(traderState, missionOrId) {
  ensureMissionState(traderState);
  const id = typeof missionOrId === 'string' ? missionOrId : missionOrId?.id;
  if (!id) return { ok: false, success: false, reason: 'INVALID_MISSION' };
  if (!traderState.missionBoard.declinedMissionIds.includes(id)) traderState.missionBoard.declinedMissionIds.push(id);
  return { ok: true, success: true, id };
}

function arrivedAtTarget(mission, flightState = {}) {
  return flightState.autopilot?.state === 'ARRIVED' && flightState.autopilot?.targetId === mission.targetId;
}

function isAtMissionTarget(mission, flightState = {}, traderState = {}) {
  if (arrivedAtTarget(mission, flightState)) return true;
  const targetId = mission.targetId;
  if (!targetId) return false;
  if (traderState.docked && traderState.dockedStation === targetId) return true;
  if (flightState.landed && traderState.dockedStation === targetId) return true;
  if (flightState.landed && flightState.currentDockedProject?.id === targetId) return true;
  return flightState.surface?.state === 'SURFACE' && flightState.surface?.planetId === targetId;
}

function scanInRange(mission, flightState = {}, navGraph) {
  const target = getNavNode(navGraph, mission.targetId);
  return distance(flightState.pos, target?.pos) <= 500;
}

function countKillProgress(mission, combatState = {}) {
  if (!mission.killTarget || !combatState.lastKilledType) return false;
  if (mission.killTarget.classId && mission.killTarget.classId !== combatState.lastKilledType) return false;
  const killKey = combatState.lastKilledAt ?? combatState.lastKillTime ?? combatState.lastKilledId ?? combatState.lastKilledType;
  if (mission._lastCountedKillKey === killKey) return false;
  mission._lastCountedKillKey = killKey;
  mission.objective.current = Math.min(mission.objective.required, mission.objective.current + 1);
  return true;
}

export function checkMissionProgress(traderState, flightState = {}, combatState = {}, navGraph, now = globalThis.performance?.now?.() ?? Date.now()) {
  ensureMissionState(traderState);
  const changed = [];
  for (const mission of traderState.activeMissions) {
    if (mission.status !== 'ACTIVE') continue;
    if (mission.timeLimit !== null && mission.acceptedAt !== null && now > mission.acceptedAt + mission.timeLimit * 1000) {
      mission.status = 'FAILED';
      changed.push(mission);
      continue;
    }
    if (mission.objective.current >= mission.objective.required) continue;
    let progressed = false;
    if ([MISSION_TYPES.DELIVERY, MISSION_TYPES.PATROL, MISSION_TYPES.ESCORT].includes(mission.type) && isAtMissionTarget(mission, flightState, traderState)) {
      mission.objective.current = mission.objective.required;
      progressed = true;
    } else if (mission.type === MISSION_TYPES.SCAN && scanInRange(mission, flightState, navGraph)) {
      mission.objective.current = mission.objective.required;
      progressed = true;
    } else if (mission.type === MISSION_TYPES.BOUNTY) {
      progressed = countKillProgress(mission, combatState);
    }
    if (progressed) changed.push(mission);
  }
  return changed;
}

export function completeMission(traderState, missionOrId, { reputationState, gainReputation } = {}) {
  ensureMissionState(traderState);
  const id = typeof missionOrId === 'string' ? missionOrId : missionOrId?.id;
  const mission = traderState.activeMissions.find(item => item.id === id) ?? (typeof missionOrId === 'object' ? missionOrId : null);
  if (!mission) return { success: false, reason: 'NOT_FOUND' };
  if (mission.status !== 'ACTIVE' || mission.objective.current < mission.objective.required) return { success: false, reason: 'INCOMPLETE' };

  traderState.credits = Math.max(0, Math.round((traderState.credits ?? 0) + mission.reward));
  if (typeof gainReputation === 'function') {
    gainReputation(mission.reputationReward.faction, mission.reputationReward.amount);
  } else if (reputationState?.scores) {
    const faction = mission.reputationReward.faction;
    reputationState.scores[faction] = clamp((reputationState.scores[faction] ?? 0) + mission.reputationReward.amount, -100, 100);
  }
  mission.status = 'COMPLETE';
  traderState.activeMissions = traderState.activeMissions.filter(item => item.id !== mission.id);
  if (!traderState.completedMissionIds.includes(mission.id)) traderState.completedMissionIds.push(mission.id);
  return { success: true, mission };
}

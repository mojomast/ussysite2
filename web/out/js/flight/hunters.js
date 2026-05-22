import { disengage } from './autopilot.js';

export const HUNTER_FACTIONS = Object.freeze({
  VEGA_CORP: Object.freeze({
    id: 'VEGA_CORP', callsign: 'VEGA ENFORCEMENT',
    color: 0x0066ff, radarColor: '#0088ff',
    names: ['MARSHAL VANCE', 'AGENT CROSS', 'ENFORCER KAYNE']
  }),
  IRONCLAD_GUILD: Object.freeze({
    id: 'IRONCLAD_GUILD', callsign: 'IRONCLAD GUILD',
    color: 0xffaa00, radarColor: '#ffaa00',
    names: ['HUNTER SABLE', 'TRACKER VOSS', 'REAPER QUINN']
  }),
  RED_AXIS: Object.freeze({
    id: 'RED_AXIS', callsign: 'RED AXIS SYNDICATE',
    color: 0xff2200, radarColor: '#ff3322',
    names: ['COLLECTOR DREX', 'FANG UNIT 7', 'SYNDICATE ACE']
  })
});

export const HUNTER_TIERS = Object.freeze({
  SCOUT: Object.freeze({ id: 'SCOUT', shipCount: 1, hpMult: 1.8, accMult: 1.4, bountyThreshold: 500, chance: 0.4, cooldownMs: 5 * 60 * 1000, allowedNodeTypes: ['station', 'planet', 'jump'] }),
  WING: Object.freeze({ id: 'WING', shipCount: 2, hpMult: 2.2, accMult: 1.6, bountyThreshold: 1500, chance: 0.65, cooldownMs: 4 * 60 * 1000, allowedNodeTypes: ['station', 'planet', 'jump'] }),
  SQUADRON: Object.freeze({ id: 'SQUADRON', shipCount: 3, hpMult: 2.6, accMult: 1.8, bountyThreshold: 3000, chance: 0.9, cooldownMs: 2 * 60 * 1000, allowedNodeTypes: ['station', 'planet', 'jump', 'project'] })
});

const TIER_ORDER = [HUNTER_TIERS.SQUADRON, HUNTER_TIERS.WING, HUNTER_TIERS.SCOUT];
const FLEE_BOUNTY_DELTA = 200;
const DESTROY_BOUNTY_DELTA = 150;
const MAX_ENEMY_POOL = 24;

function nowMs() {
  return Date.now();
}

function choose(list, random = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function clampBounty(value) {
  return Math.max(0, Math.round(value || 0));
}

function getNodeId(node) {
  return node?.id ?? node?.nodeId ?? node?.targetId ?? null;
}

function getNodeType(node) {
  return node?.type ?? node?.nodeType ?? 'project';
}

function ensureTraderBountyFields(traderState = {}) {
  traderState.bountyLevel ??= 0;
  traderState.interceptCooldown ??= 0;
  return traderState;
}

export function getTierForBounty(bountyLevel = 0) {
  const bounty = clampBounty(bountyLevel);
  return TIER_ORDER.find(tier => bounty >= tier.bountyThreshold) || null;
}

export function shouldTriggerIntercept({ combatState, traderState, node, now = nowMs(), random = Math.random } = {}) {
  ensureTraderBountyFields(traderState);
  if (!combatState || !traderState || !node) return false;
  if (combatState.bossActive || combatState.activeIntercept) return false;

  const nodeId = getNodeId(node);
  if (!nodeId || combatState.lastNodeArrival === nodeId) return false;

  const tier = getTierForBounty(traderState.bountyLevel);
  if (!tier) return false;
  if ((traderState.interceptCooldown || 0) > now) return false;
  if (!tier.allowedNodeTypes.includes(getNodeType(node))) return false;

  const chance = tier.chance;
  const triggered = random() < chance;
  combatState.lastNodeArrival = nodeId;
  return triggered ? tier : false;
}

function classForHunter(tierId, index) {
  if (tierId === 'SQUADRON') return ['elite', 'gunboat', 'interceptor', 'phantom', 'elite'][index] || 'elite';
  if (tierId === 'WING') return ['elite', 'interceptor', 'gunboat'][index] || 'interceptor';
  return 'elite';
}

function hpForHunter(tierId, index) {
  if (tierId === 'SQUADRON') return index === 0 ? 8 : 6;
  if (tierId === 'WING') return index === 0 ? 6 : 5;
  return 4;
}

function makeFallbackEnemy(flightState, index) {
  const base = flightState?.pos || { x: 0, y: 0, z: 0 };
  return {
    visible: true,
    position: { x: (base.x ?? 0) + 120 + index * 8, y: base.y ?? 0, z: (base.z ?? 0) - 80 - index * 10 },
    userData: { active: true }
  };
}

function markHunter(enemy, { interceptId, tier, faction, callsign, index }) {
  const hp = hpForHunter(tier.id, index);
  enemy.userData ??= {};
  Object.assign(enemy.userData, {
    active: true,
    isHunter: true,
    faction: faction.id,
    factionName: faction.callsign,
    hunterName: callsign,
    tier: tier.id,
    bountyTier: tier.id,
    bountyInterceptId: interceptId,
    bountyFactionId: faction.id,
    hunterCallsign: callsign,
    label: `${callsign} HUNTER`,
    health: hp,
    maxHealth: hp,
    shieldHp: tier.id === 'SQUADRON' && index === 0 ? 2 : (tier.id === 'WING' && index === 0 ? 1 : 0),
    maxShieldHp: tier.id === 'SQUADRON' && index === 0 ? 2 : (tier.id === 'WING' && index === 0 ? 1 : 0),
    reward: tier.id === 'SQUADRON' ? 260 : (tier.id === 'WING' ? 180 : 120),
    creditReward: tier.id === 'SQUADRON' ? 260 : (tier.id === 'WING' ? 180 : 120),
    classId: enemy.userData.classId || classForHunter(tier.id, index),
    fleeing: false,
    bountyFleeApplied: false,
    bountyDestroyApplied: false
  });
  return enemy;
}

export function triggerIntercept({ combatState, traderState, flightState, enemyPool = [], spawnEnemy, buildEnemyHealthPips, addKillFeedEntry, status, node, tier, random = Math.random, now = nowMs() } = {}) {
  ensureTraderBountyFields(traderState);
  const resolvedTier = tier && tier.id ? tier : getTierForBounty(traderState?.bountyLevel);
  if (!combatState || !resolvedTier) return null;

  const faction = choose(Object.values(HUNTER_FACTIONS), random);
  const interceptId = `hunter-${Math.round(now)}-${Math.floor(random() * 100000)}`;
  const hunters = [];

  disengage(flightState, 'BOUNTY INTERDICTION');
  if (flightState?.autopilot) {
    flightState.autopilot.hyperspeedMult = 1;
    flightState.autopilot.hyperspeedTarget = 1;
  }

  for (let index = 0; index < resolvedTier.shipCount; index += 1) {
    const classId = classForHunter(resolvedTier.id, index);
    let enemy = enemyPool.find(item => !item?.userData?.active);
    if (enemy && typeof spawnEnemy === 'function') spawnEnemy(enemy, index * 1.15, index * 0.25, classId);
    if (!enemy) {
      const activeCount = enemyPool.filter(item => item?.userData?.active).length;
      if (activeCount >= MAX_ENEMY_POOL) {
        addKillFeedEntry?.('POOL FULL — HUNTER SPAWNING SKIPPED', '#ff4444');
        continue;
      }
      enemy = makeFallbackEnemy(flightState, index);
      enemyPool.push?.(enemy);
    }
    enemy.userData.classId = classId;
    markHunter(enemy, { interceptId, tier: resolvedTier, faction, callsign: faction.names[index % faction.names.length], index });
    buildEnemyHealthPips?.(enemy);
    hunters.push(enemy);
  }
  if (hunters.length === 0) return null;

  const lead = hunters[0]?.userData?.hunterName || faction.names[0];
  const message = `INCOMING TRANSMISSION — ${lead}: YOUR BOUNTY IS ${clampBounty(traderState.bountyLevel)}c. STAND DOWN.`;
  combatState.activeIntercept = { id: interceptId, tier: resolvedTier.id, faction: faction.id, nodeId: getNodeId(node), hunters };
  traderState.interceptCooldown = now + resolvedTier.cooldownMs;
  addKillFeedEntry?.(message, faction.radarColor);
  if (typeof status === 'function') status(message, { faction, tier: resolvedTier.id, interceptId });
  if (flightState) {
    flightState.status = typeof status === 'string' ? status : message;
    flightState.statusUntil = now + 2600;
  }
  return combatState.activeIntercept;
}

function activeHuntersForIntercept(enemies = [], interceptId) {
  return enemies.filter(enemy => enemy?.userData?.active && enemy.userData.isHunter && (!interceptId || enemy.userData.bountyInterceptId === interceptId));
}

export function checkHunterFlee(enemy, { combatState, traderState, enemies = [], addKillFeedEntry, deactivateCombatObject, now = nowMs() } = {}) {
  if (!enemy?.userData?.isHunter || enemy.userData.fleeing || enemy.userData.bountyFleeApplied) return false;
  const maxHp = Math.max(1, enemy.userData.maxHealth || 1);
  if ((enemy.userData.health || 0) / maxHp > 0.2) return false;

  ensureTraderBountyFields(traderState);
  enemy.userData.fleeing = true;
  enemy.userData.fleeStartedAt = now;
  enemy.userData.bountyFleeApplied = true;
  traderState.bountyLevel = clampBounty((traderState.bountyLevel || 0) + FLEE_BOUNTY_DELTA);
  addKillFeedEntry?.(`${enemy.userData.factionName || 'HUNTER'} // ${enemy.userData.hunterName || 'CONTACT'} BROKE CONTACT, BOUNTY +${FLEE_BOUNTY_DELTA}`, '#ffcc00');
  deactivateCombatObject?.(enemy);
  const activeHunters = combatState?.activeIntercept?.hunters;
  if (activeHunters) {
    const index = activeHunters.indexOf(enemy);
    if (index !== -1) activeHunters.splice(index, 1);
  }
  if (combatState?.activeIntercept && activeHuntersForIntercept(enemies, combatState.activeIntercept.id).length === 0) combatState.activeIntercept = null;
  return true;
}

export function checkHunterDestroyed(enemy, { combatState, traderState, enemies = [], addKillFeedEntry } = {}) {
  if (!enemy?.userData?.isHunter || enemy.userData.bountyDestroyApplied) return false;
  ensureTraderBountyFields(traderState);
  enemy.userData.bountyDestroyApplied = true;
  traderState.bountyLevel = clampBounty((traderState.bountyLevel || 0) - DESTROY_BOUNTY_DELTA);
  addKillFeedEntry?.(`HUNTER DESTROYED // BOUNTY -${DESTROY_BOUNTY_DELTA}`, '#44ff88');
  const interceptId = enemy.userData.bountyInterceptId;
  const activeHunters = combatState?.activeIntercept?.hunters;
  if (activeHunters) {
    const index = activeHunters.indexOf(enemy);
    if (index !== -1) activeHunters.splice(index, 1);
  }
  const remaining = activeHuntersForIntercept(enemies, interceptId).filter(item => item !== enemy);
  if (combatState?.activeIntercept?.id === interceptId && remaining.length === 0) combatState.activeIntercept = null;
  return true;
}

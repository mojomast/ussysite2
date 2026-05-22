import {
  SKILL_TREE_NODES,
  WEAPON_DEFS,
  WEAPON_PRICES,
  addCombatXp,
  applySkillEffects,
  getMaxShield
} from './combat-overhaul.js';

const defaultFlightState = {
  shield: 100,
  armor: 100,
  energy: 100,
  fuel: 100,
  fuelDepleted: false,
  combatPhase: 'IDLE'
};

let activeFlightState = defaultFlightState;

export const combatState = {
  xp: 0,
  xpToNextPoint: 100,
  skillPoints: 3,
  unlocked: new Set(),
  primaryWeapon: 'laser_mk1',
  secondaryWeapon: 'missile_rack',
  ownedWeapons: new Set(['laser_mk1', 'missile_rack']),
  heat: 0,
  maxHeat: 100,
  overheated: false,
  heatCoolRate: 12,
  lastHitAt: 0,
  shieldRegenRate: 4,
  shieldRegenDelay: 5000,
  armorMultiplier: 1,
  armorPiercing: false,
  adrenaline: 0,
  adrenalineDecay: 0.04,
  afterburnerActive: false,
  afterburnerUntil: 0,
  afterburnerCooldownUntil: 0,
  bountyPending: 0,
  overchargeUsed: false,
  lastAdrenalineBarkAt: 0,
  lastAdrenalineFrame: 0,
  resources: null
};

export const COMBAT_PHASES = {
  IDLE: 'IDLE',
  COMBAT: 'COMBAT',
  LANDED: 'LANDED',
  DEAD: 'DEAD'
};

export function transitionCombatPhase(currentPhase, event = {}) {
  if ((event.hull ?? event.armor ?? 1) <= 0) return COMBAT_PHASES.DEAD;
  if (event.type === 'dock') return COMBAT_PHASES.LANDED;
  if (event.type === 'enemyRange' && event.distance <= (event.range ?? 46)) return COMBAT_PHASES.COMBAT;
  return currentPhase;
}

export function isPlayerDead(state) {
  return (state.armor ?? state.hull ?? 0) <= 0;
}

export function respawnFlightState(state, base = {}) {
  const hull = base.hull ?? state.maxHull ?? base.armor ?? state.maxArmor ?? 100;
  if (Object.hasOwn(state, 'hull') || Object.hasOwn(base, 'hull') || Object.hasOwn(state, 'maxHull')) state.hull = hull;
  state.armor = base.armor ?? state.maxArmor ?? hull;
  state.shield = base.shield ?? state.maxShield ?? 100;
  state.fuel = base.fuel ?? state.maxFuel ?? 100;
  state.fuelDepleted = false;
  state.combatPhase = base.combatPhase ?? COMBAT_PHASES.IDLE;
  return state;
}

export function setCombatFlightState(flightState) {
  if (flightState) activeFlightState = flightState;
  reapplySkills();
}

export function reapplySkills() {
  applySkillEffects(combatState.unlocked, activeFlightState, combatState);
  combatState.armorMultiplier = combatState.unlocked.has('hull_3') ? 0.85 : 1;
  combatState.armorPiercing = combatState.unlocked.has('weap_4');
  activeFlightState.shield = Math.min(activeFlightState.shield, getMaxShield(combatState.unlocked));
}

export function unlockSkillNode(nodeId) {
  const node = SKILL_TREE_NODES.find(item => item.id === nodeId);
  if (!node) return { success: false, message: 'UNKNOWN SKILL NODE.' };
  if (combatState.unlocked.has(nodeId)) return { success: false, message: 'ALREADY UNLOCKED.' };
  if (node.requires && !combatState.unlocked.has(node.requires)) {
    return { success: false, message: `REQUIRES ${node.requires.toUpperCase()} FIRST.` };
  }
  if (combatState.skillPoints < node.cost) {
    return { success: false, message: `NEED ${node.cost} SP. HAVE ${combatState.skillPoints}.` };
  }
  combatState.skillPoints -= node.cost;
  combatState.unlocked.add(nodeId);
  reapplySkills();
  return { success: true, message: `${node.name} UNLOCKED. SP REMAINING: ${combatState.skillPoints}.` };
}

export function buyWeapon(weaponId, traderState) {
  const def = WEAPON_DEFS.find(weapon => weapon.id === weaponId);
  if (!def) return { success: false, message: 'UNKNOWN WEAPON ID.' };
  if (combatState.ownedWeapons.has(weaponId)) {
    return { success: false, message: `${def.name} ALREADY IN ARSENAL.` };
  }
  const price = WEAPON_PRICES[weaponId] ?? 0;
  if (!traderState || traderState.credits < price) {
    return { success: false, message: `INSUFFICIENT CREDITS. NEED ${price}cr.` };
  }
  traderState.credits -= price;
  combatState.ownedWeapons.add(weaponId);
  reapplySkills();
  return { success: true, message: `${def.name} PURCHASED. ${price}cr DEDUCTED.` };
}

export function equipWeapon(weaponId, slot = 'primary') {
  const def = WEAPON_DEFS.find(weapon => weapon.id === weaponId);
  if (!def) return { success: false, message: 'UNKNOWN WEAPON.' };
  if (!combatState.ownedWeapons.has(weaponId)) return { success: false, message: 'NOT IN ARSENAL.' };
  if (slot === 'primary') combatState.primaryWeapon = weaponId;
  else combatState.secondaryWeapon = weaponId;
  reapplySkills();
  return { success: true, message: `${def.name} EQUIPPED TO ${slot.toUpperCase()} SLOT.` };
}

export function awardXp(amount) {
  const spBefore = combatState.skillPoints;
  addCombatXp(combatState, amount);
  if (combatState.skillPoints > spBefore) reapplySkills();
}

export function serializeCombatState() {
  return btoa(JSON.stringify({
    v: 2,
    xp: combatState.xp,
    xpToNextPoint: combatState.xpToNextPoint,
    skillPoints: combatState.skillPoints,
    unlocked: [...combatState.unlocked],
    primaryWeapon: combatState.primaryWeapon,
    secondaryWeapon: combatState.secondaryWeapon,
    ownedWeapons: [...combatState.ownedWeapons],
    resources: {
      ammo: activeFlightState.ammo,
      missiles: activeFlightState.missiles,
      fuel: activeFlightState.fuel,
      fuelDepleted: Boolean(activeFlightState.fuelDepleted)
    }
  }));
}

function replaceSetContents(targetSet, values) {
  targetSet.clear();
  values.forEach(value => targetSet.add(value));
}

export function deserializeCombatState(encoded) {
  try {
    const data = JSON.parse(atob(encoded));
    if (Array.isArray(data.unlocked)) replaceSetContents(combatState.unlocked, data.unlocked);
    if (Array.isArray(data.ownedWeapons)) replaceSetContents(combatState.ownedWeapons, data.ownedWeapons);
    if (typeof data.xp === 'number') combatState.xp = data.xp;
    if (typeof data.xpToNextPoint === 'number') combatState.xpToNextPoint = data.xpToNextPoint;
    if (typeof data.skillPoints === 'number') combatState.skillPoints = data.skillPoints;
    if (data.primaryWeapon) combatState.primaryWeapon = data.primaryWeapon;
    if (data.secondaryWeapon) combatState.secondaryWeapon = data.secondaryWeapon;
    const resources = data.resources || data;
    const restoredResources = {};
    if (Number.isFinite(resources.ammo)) {
      restoredResources.ammo = Math.max(0, Math.floor(resources.ammo));
      activeFlightState.ammo = restoredResources.ammo;
    }
    if (Number.isFinite(resources.missiles)) {
      restoredResources.missiles = Math.max(0, Math.floor(resources.missiles));
      activeFlightState.missiles = restoredResources.missiles;
    }
    if (Number.isFinite(resources.fuel)) {
      restoredResources.fuel = Math.max(0, Math.min(activeFlightState.maxFuel ?? 100, resources.fuel));
      activeFlightState.fuel = restoredResources.fuel;
    }
    if (typeof resources.fuelDepleted === 'boolean') {
      restoredResources.fuelDepleted = resources.fuelDepleted;
      activeFlightState.fuelDepleted = resources.fuelDepleted;
    }
    combatState.resources = Object.keys(restoredResources).length ? restoredResources : null;
    reapplySkills();
    return true;
  } catch {
    return false;
  }
}

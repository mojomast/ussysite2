import {
  SKILL_TREE_NODES,
  WEAPON_DEFS,
  WEAPON_PRICES,
  addCombatXp,
  applySkillEffects,
  getMaxShield
} from './combat-overhaul.js';
import { flightState as defaultFlightState } from './state.js';

let activeFlightState = defaultFlightState;

export const combatState = {
  credits: 1000,
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
  lastAdrenalineFrame: 0
};

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
  combatState.credits = traderState.credits;
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
  addCombatXp(combatState, amount);
  reapplySkills();
}

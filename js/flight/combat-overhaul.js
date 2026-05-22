export const ENEMY_CLASSES = [
  {
    id: 'scout',
    label: 'AUDIT PROBE',
    lore: "Autonomous recon drones deployed by OPENCLAWSSY's deny-by-default policy layer.",
    color: 0xff3355,
    wingColor: 0xb8c4d8,
    health: 1,
    speed: 1.0,
    fireRate: 2200,
    accuracy: 0.55,
    burstCount: 1,
    burstDelay: 0,
    evasion: 0.0,
    creditReward: 40,
    xpReward: 8,
    approachSpeed: { far: 18, near: 4.2 },
    geometry: 'default'
  },
  {
    id: 'interceptor',
    label: 'SWARM SPECIALIST',
    lore: 'A single agent detached from a SWARMUSSY coding swarm, repurposed for combat.',
    color: 0xff8800,
    wingColor: 0xff4400,
    health: 2,
    speed: 1.65,
    fireRate: 750,
    accuracy: 0.80,
    burstCount: 2,
    burstDelay: 60,
    evasion: 0.012,
    creditReward: 140,
    xpReward: 28,
    approachSpeed: { far: 26, near: 6.0 },
    geometry: 'dart'
  },
  {
    id: 'gunboat',
    label: 'DEVPLAN ENFORCER',
    lore: 'A heavy enforcement platform running a DEVUSSY DevPlan as its engagement protocol.',
    color: 0x44aaff,
    wingColor: 0x2266cc,
    health: 5,
    speed: 0.45,
    fireRate: 700,
    accuracy: 0.72,
    burstCount: 4,
    burstDelay: 100,
    evasion: 0.0,
    creditReward: 320,
    xpReward: 70,
    approachSpeed: { far: 10, near: 2.8 },
    geometry: 'box'
  },
  {
    id: 'elite',
    label: 'NEXUSSY OPERATOR',
    lore: 'A fully sanctioned combat operator with a live session key issued by OPENCLAWSSY.',
    color: 0xcc44ff,
    wingColor: 0x8800cc,
    health: 3,
    speed: 1.35,
    fireRate: 520,
    accuracy: 0.95,
    burstCount: 3,
    burstDelay: 65,
    evasion: 0.035,
    creditReward: 520,
    xpReward: 120,
    approachSpeed: { far: 22, near: 5.5 },
    geometry: 'diamond'
  },
  {
    id: 'dreadnought',
    label: 'HERMES-DREADNOUGHT',
    lore: 'The HERMES-DASHBOARD given a weapons mandate with full telemetry on the player.',
    color: 0xff0000,
    wingColor: 0x880000,
    health: 15,
    speed: 0.3,
    fireRate: 420,
    accuracy: 0.78,
    burstCount: 6,
    burstDelay: 80,
    evasion: 0.0,
    creditReward: 1100,
    xpReward: 250,
    approachSpeed: { far: 6, near: 2.2 },
    geometry: 'cruiser'
  },
  {
    id: 'phantom',
    label: 'PHANTOM PROCESS',
    lore: "Orphaned agent tasks that were never ACK'd and never garbage-collected.",
    color: 0x00ffcc,
    wingColor: 0x006655,
    health: 2,
    speed: 1.8,
    fireRate: 1100,
    accuracy: 0.60,
    burstCount: 1,
    burstDelay: 0,
    evasion: 0.055,
    creditReward: 380,
    xpReward: 85,
    approachSpeed: { far: 30, near: 8.0 },
    geometry: 'phantom'
  }
];

export const FORMATION_ROLES = {
  AGGRESSOR: 'aggressor',
  FLANKER: 'flanker',
  SUPPORT: 'support'
};

const combatCallbacks = {
  onEnemyKill: null,
  onPlayerHit: null,
  onMissionComplete: null
};

export function configureCombat({ onEnemyKill, onPlayerHit, onMissionComplete } = {}) {
  if (typeof onEnemyKill === 'function') combatCallbacks.onEnemyKill = onEnemyKill;
  if (typeof onPlayerHit === 'function') combatCallbacks.onPlayerHit = onPlayerHit;
  if (typeof onMissionComplete === 'function') combatCallbacks.onMissionComplete = onMissionComplete;
}

export function emitCombatEnemyKill(payload = {}) {
  if (combatCallbacks.onEnemyKill) combatCallbacks.onEnemyKill(payload);
}

export function emitCombatPlayerHit(payload = {}) {
  if (combatCallbacks.onPlayerHit) combatCallbacks.onPlayerHit(payload);
}

export function emitCombatMissionComplete(payload = {}) {
  if (combatCallbacks.onMissionComplete) combatCallbacks.onMissionComplete(payload);
}

export const WEAPON_DEFS = [
  { id: 'laser_mk1', name: 'STANDARD PULSE', type: 'beam', damage: 10, cooldown: 120, energyCost: 2.5, ammoCost: 1, projectileSpeed: 155, projectileLife: 1800, color: 0x66ff44, overheatBuildup: 8, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'Fastest fire rate, lowest damage per shot. Good for probes.' },
  { id: 'laser_mk2', name: 'PHASE LANCE', type: 'beam', damage: 28, cooldown: 280, energyCost: 5.5, ammoCost: 1, projectileSpeed: 165, projectileLife: 2000, color: 0x00ffcc, overheatBuildup: 14, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'Hard-hitting single shot that rewards accuracy.' },
  { id: 'scatter_cannon', name: 'FRAG DISPERSAL', type: 'burst', damage: 10, cooldown: 320, energyCost: 7.0, ammoCost: 4, projectileSpeed: 130, projectileLife: 1200, color: 0xffaa00, overheatBuildup: 22, pellets: 5, spreadAngle: 0.10, missileCount: 0, aoeRadius: 0, description: 'Devastating up close against clusters, weak at range.' },
  { id: 'railgun', name: 'MASS DRIVER', type: 'beam', damage: 75, cooldown: 2200, energyCost: 28.0, ammoCost: 1, projectileSpeed: 500, projectileLife: 3500, color: 0xffffff, overheatBuildup: 45, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'Sniper weapon. High skill ceiling and heavy reload.' },
  { id: 'missile_rack', name: 'SEEKING PAYLOAD', type: 'missile', damage: 65, cooldown: 1100, energyCost: 20.0, ammoCost: 0, projectileSpeed: 55, projectileLife: 8000, color: 0xfff2cf, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 1, aoeRadius: 0, description: 'Reliable homing backup with a longer reload.' },
  { id: 'dual_missile', name: 'TWIN SEEKER', type: 'missile', damage: 60, cooldown: 1600, energyCost: 32.0, ammoCost: 0, projectileSpeed: 60, projectileLife: 8000, color: 0xfff2cf, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 2, aoeRadius: 0, description: 'Devastating burst for high-energy builds.' },
  { id: 'emp_burst', name: 'SYSTEM DISRUPTOR', type: 'area', damage: 8, cooldown: 3800, energyCost: 28.0, ammoCost: 0, projectileSpeed: 0, projectileLife: 0, color: 0x88ffff, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 0, aoeRadius: 22, stunDuration: 2200, description: 'Area denial and escape tool. Situationally powerful.' }
];

export const SKILL_TREE_NODES = [
  { id: 'hull_1', name: 'HULL PLATING I', branch: 'HULL', effect: 'armor base +20', cost: 1, requires: null, description: 'Reinforced armor lattice adds 20 base armor.' },
  { id: 'hull_2', name: 'HULL PLATING II', branch: 'HULL', effect: 'armor base +30', cost: 2, requires: 'hull_1', description: 'Second armor layer adds 30 more base armor.' },
  { id: 'hull_3', name: 'REACTIVE ARMOR', branch: 'HULL', effect: '15% armor dmg reduction', cost: 2, requires: 'hull_2', description: 'Reactive plates reduce armor damage by 15%.' },
  { id: 'hull_4', name: 'DAMAGE CONTROL', branch: 'HULL', effect: 'armor +1/s regen at dock', cost: 3, requires: 'hull_3', description: 'Dock crews repair armor slowly while landed.' },
  { id: 'hull_5', name: 'POINT DEFENSE GRID', branch: 'HULL', effect: '20% chance to block enemy bullets', cost: 3, requires: 'hull_4', description: 'A reactive grid fires micro-bursts to intercept incoming rounds.' },
  { id: 'shield_1', name: 'SHIELD BOOST I', branch: 'SHIELD', effect: 'maxShield +25', cost: 1, requires: null, description: 'Adds 25 maximum shield capacity.' },
  { id: 'shield_2', name: 'SHIELD BOOST II', branch: 'SHIELD', effect: 'maxShield +25', cost: 2, requires: 'shield_1', description: 'Adds another 25 maximum shield capacity.' },
  { id: 'shield_3', name: 'RAPID RECHARGE', branch: 'SHIELD', effect: 'regenDelay 5000->3000ms', cost: 2, requires: 'shield_2', description: 'Shield regen starts sooner after damage.' },
  { id: 'shield_4', name: 'OVERCHARGE', branch: 'SHIELD', effect: 'one-time 150% shield burst per dock', cost: 3, requires: 'shield_3', description: 'Docking briefly overcharges shields to 150% capacity.' },
  { id: 'shield_5', name: 'MIRROR PROTOCOL', branch: 'SHIELD', effect: 'Reflect 8% of blocked damage back as AOE', cost: 3, requires: 'shield_4', description: 'Excess shield energy is vectored back at the attacker.' },
  { id: 'weap_1', name: 'CAPACITOR I', branch: 'WEAPONS', effect: 'energy +20', cost: 1, requires: null, description: 'Expands energy storage to 120.' },
  { id: 'weap_2', name: 'HEAT SINKS', branch: 'WEAPONS', effect: 'maxHeat +30', cost: 1, requires: null, description: 'Raises maximum heat before overheat.' },
  { id: 'weap_3', name: 'OVERCLOCKED COILS', branch: 'WEAPONS', effect: 'fireCooldown x0.85', cost: 2, requires: 'weap_1', description: 'Primary weapons cycle 15% faster.' },
  { id: 'weap_4', name: 'ARMOR PIERCING', branch: 'WEAPONS', effect: '25% dmg bypasses enemy shieldHp', cost: 3, requires: 'weap_3', description: 'Part of each hit punches through enemy shield pips.' },
  { id: 'weap_5', name: 'GHOST ROUND', branch: 'WEAPONS', effect: '15% of shots ignore enemy evasion roll', cost: 3, requires: 'weap_4', description: 'Sensor-guided micro-adjustments override target evasion.' },
  { id: 'eng_1', name: 'THRUSTER BOOST I', branch: 'ENGINES', effect: 'thrust +3', cost: 1, requires: null, description: 'Adds 3 thrust.' },
  { id: 'eng_2', name: 'THRUSTER BOOST II', branch: 'ENGINES', effect: 'thrust +3', cost: 2, requires: 'eng_1', description: 'Adds 3 more thrust.' },
  { id: 'eng_3', name: 'AFTERBURNER', branch: 'ENGINES', effect: 'Shift: thrust x1.8 / 3s / 12s cd', cost: 2, requires: 'eng_2', description: 'Unlocks timed afterburner on Shift.' },
  { id: 'eng_4', name: 'INERTIAL DAMPENERS', branch: 'ENGINES', effect: 'damping 0.985->0.975', cost: 3, requires: 'eng_3', description: 'Tighter damping reduces drift.' },
  { id: 'eng_5', name: 'COLD JUMP', branch: 'ENGINES', effect: 'Emergency warp: teleport 40 units forward, 25s cooldown', cost: 3, requires: 'eng_4', description: 'A single-axis microjump. No FTL. Just distance.' }
];

export const STATION_EQUIPMENT = {
  core: ['laser_mk2', 'emp_burst'],
  infrastructure: ['scatter_cannon', 'railgun'],
  security: ['railgun', 'dual_missile'],
  creative: ['laser_mk1', 'missile_rack'],
  governance: ['emp_burst', 'laser_mk2'],
  tools: ['scatter_cannon', 'missile_rack'],
  default: ['laser_mk1', 'missile_rack']
};

export const WEAPON_PRICES = {
  laser_mk1: 0,
  missile_rack: 0,
  laser_mk2: 1800,
  scatter_cannon: 2200,
  railgun: 4500,
  dual_missile: 3200,
  emp_burst: 3800
};

const tierClassIds = [
  ['scout'],
  ['scout'],
  ['scout', 'interceptor'],
  ['scout', 'interceptor', 'gunboat', 'elite'],
  ['scout', 'interceptor', 'gunboat', 'elite', 'dreadnought', 'phantom']
];

const classWeights = {
  scout: 50,
  interceptor: 30,
  gunboat: 10,
  elite: 8,
  dreadnought: 2,
  phantom: 6
};

export function getDifficultyTier(score) {
  if (score < 1) return 0;
  if (score < 200) return 1;
  if (score < 800) return 2;
  if (score < 3000) return 3;
  return 4;
}

export function getDifficultyMultiplier(score) {
  if (score < 3000) return 1.0;
  return Math.min(2.0, 1.0 + (score - 3000) / 8000);
}

export function getEnemyClass(classId = 'scout') {
  return ENEMY_CLASSES.find(cls => cls.id === classId) || ENEMY_CLASSES[0];
}

export function getRandomClassForTier(tier, random = Math.random) {
  const allowed = tierClassIds[Math.max(0, Math.min(4, tier))] || tierClassIds[0];
  const total = allowed.reduce((sum, id) => sum + classWeights[id], 0);
  let roll = random() * total;
  for (const id of allowed) {
    roll -= classWeights[id];
    if (roll <= 0) return id;
  }
  return allowed[allowed.length - 1];
}

export function getWeaponDef(weaponId) {
  return WEAPON_DEFS.find(weapon => weapon.id === weaponId) || null;
}

export function normalizeStationCategory(category) {
  if (category === 'infra') return 'infrastructure';
  if (category === 'ai') return 'security';
  return category || 'default';
}

export function getStationEquipment(category) {
  return STATION_EQUIPMENT[normalizeStationCategory(category)] || STATION_EQUIPMENT.default;
}

export function applyDamageModel({ shield, armor }, amount, armorMultiplier = 1) {
  let nextShield = shield;
  let nextArmor = armor;
  if (nextShield > 25) {
    nextShield = Math.max(0, nextShield - amount);
  } else if (nextShield > 0) {
    nextShield = Math.max(0, nextShield - amount * 1.35);
    nextArmor = Math.max(0, nextArmor - amount * 0.35 * armorMultiplier);
  } else {
    nextArmor = Math.max(0, nextArmor - amount * armorMultiplier);
  }
  return { shield: nextShield, armor: nextArmor };
}

export function addCombatXp(state, xpReward) {
  state.xp += xpReward;
  while (state.xp >= state.xpToNextPoint) {
    state.skillPoints += 1;
    state.xp -= state.xpToNextPoint;
    state.xpToNextPoint = Math.round(state.xpToNextPoint * 1.35);
  }
  return state;
}

export function applyHeatShot(state, overheatBuildup) {
  state.heat += overheatBuildup;
  if (state.heat >= state.maxHeat) state.overheated = true;
  return state;
}

export function coolHeat(state, dt, coolRate = state.heatCoolRate ?? 12) {
  state.heat = Math.max(0, state.heat - coolRate * dt);
  if (state.overheated && state.heat <= 0) state.overheated = false;
  return state;
}

export function canFireWeapon(state) {
  return !state.overheated && state.heat < state.maxHeat;
}

export function applyBurstHeatSequence(state, weapon = {}) {
  const burstCount = Math.max(1, weapon.burstCount ?? 1);
  const heatPerShot = weapon.overheatBuildup ?? 0;
  const fired = [];

  for (let shot = 0; shot < burstCount; shot += 1) {
    if (!canFireWeapon(state)) break;
    applyHeatShot(state, heatPerShot);
    fired.push({ shot: shot + 1, heat: state.heat, overheated: state.overheated });
  }

  return { state, fired, skipped: burstCount - fired.length };
}

export function getAdrenalineState({ armor, maxArmor = 100 }, threshold = 0.25) {
  const ratio = maxArmor > 0 ? armor / maxArmor : 0;
  return { active: ratio <= threshold, ratio };
}

export function createEnemyStats(classId = 'scout') {
  const cls = getEnemyClass(classId);
  return {
    id: cls.id,
    hull: cls.health,
    shieldPips: cls.health > 2 ? cls.health - 1 : 0,
    weaponLoadout: {
      fireRate: cls.fireRate,
      burstCount: cls.burstCount,
      burstDelay: cls.burstDelay,
      accuracy: cls.accuracy
    },
    rewards: getEnemyKillReward(classId)
  };
}

export function getEnemyKillReward(classId = 'scout') {
  const cls = getEnemyClass(classId);
  return { credits: cls.creditReward, xp: cls.xpReward };
}

export function simulateBurstFire({ burstCount, burstDelay }, durationMs) {
  const firedAt = [];
  for (let i = 0; i < burstCount; i++) {
    const at = i * burstDelay;
    if (at <= durationMs) firedAt.push(at);
  }
  return firedAt;
}

export function applySkillEffects(unlocked, flightState, combatState) {
  const has = id => unlocked instanceof Set ? unlocked.has(id) : Boolean(unlocked?.includes?.(id));
  let thrust = 14;
  if (has('eng_1')) thrust += 3;
  if (has('eng_2')) thrust += 3;
  flightState.thrust = thrust;
  flightState.damping = has('eng_4') ? 0.975 : 0.985;
  flightState.energy = Math.max(flightState.energy, has('weap_1') ? 120 : 100);
  combatState.maxHeat = has('weap_2') ? 130 : 100;
  combatState.shieldRegenDelay = has('shield_3') ? 3000 : 5000;
  return { flightState, combatState };
}

export function getMaxShield(unlocked) {
  const has = id => unlocked instanceof Set ? unlocked.has(id) : Boolean(unlocked?.includes?.(id));
  let value = 100;
  if (has('shield_1')) value += 25;
  if (has('shield_2')) value += 25;
  return value;
}

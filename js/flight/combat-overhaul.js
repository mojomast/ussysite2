export const ENEMY_CLASSES = [
  {
    id: 'scout',
    label: 'SCOUT',
    color: 0xff3355,
    wingColor: 0xb8c4d8,
    health: 1,
    speed: 1.0,
    fireRate: 1500,
    accuracy: 0.72,
    burstCount: 1,
    burstDelay: 0,
    evasion: 0.0,
    creditReward: 50,
    xpReward: 10,
    approachSpeed: { far: 18, near: 4.2 },
    geometry: 'default'
  },
  {
    id: 'interceptor',
    label: 'INTERCEPTOR',
    color: 0xff8800,
    wingColor: 0xff4400,
    health: 2,
    speed: 1.45,
    fireRate: 900,
    accuracy: 0.85,
    burstCount: 1,
    burstDelay: 0,
    evasion: 0.012,
    creditReward: 120,
    xpReward: 25,
    approachSpeed: { far: 26, near: 6.0 },
    geometry: 'dart'
  },
  {
    id: 'gunboat',
    label: 'GUNBOAT',
    color: 0x44aaff,
    wingColor: 0x2266cc,
    health: 5,
    speed: 0.55,
    fireRate: 700,
    accuracy: 0.65,
    burstCount: 3,
    burstDelay: 120,
    evasion: 0.0,
    creditReward: 280,
    xpReward: 60,
    approachSpeed: { far: 10, near: 2.8 },
    geometry: 'box'
  },
  {
    id: 'elite',
    label: 'ELITE ACE',
    color: 0xcc44ff,
    wingColor: 0x8800cc,
    health: 3,
    speed: 1.2,
    fireRate: 600,
    accuracy: 0.92,
    burstCount: 2,
    burstDelay: 80,
    evasion: 0.025,
    creditReward: 450,
    xpReward: 100,
    approachSpeed: { far: 22, near: 5.5 },
    geometry: 'diamond'
  },
  {
    id: 'dreadnought',
    label: 'DREADNOUGHT',
    color: 0xff0000,
    wingColor: 0x880000,
    health: 12,
    speed: 0.3,
    fireRate: 500,
    accuracy: 0.70,
    burstCount: 5,
    burstDelay: 90,
    evasion: 0.0,
    creditReward: 900,
    xpReward: 200,
    approachSpeed: { far: 7, near: 2.0 },
    geometry: 'cruiser'
  }
];

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
  { id: 'laser_mk1', name: 'LASER Mk.I', type: 'beam', damage: 12, cooldown: 140, energyCost: 2.5, ammoCost: 1, projectileSpeed: 155, projectileLife: 1800, color: 0x66ff44, overheatBuildup: 8, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'Standard pulse laser.' },
  { id: 'laser_mk2', name: 'LASER Mk.II', type: 'beam', damage: 20, cooldown: 200, energyCost: 4.0, ammoCost: 1, projectileSpeed: 165, projectileLife: 2000, color: 0x00ffcc, overheatBuildup: 14, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'Upgraded laser. Runs hotter.' },
  { id: 'scatter_cannon', name: 'SCATTER CANNON', type: 'burst', damage: 8, cooldown: 380, energyCost: 6.0, ammoCost: 4, projectileSpeed: 130, projectileLife: 1200, color: 0xffaa00, overheatBuildup: 22, pellets: 4, spreadAngle: 0.08, missileCount: 0, aoeRadius: 0, description: 'Wide spread. Shreds shields.' },
  { id: 'railgun', name: 'RAILGUN', type: 'beam', damage: 55, cooldown: 1800, energyCost: 22.0, ammoCost: 1, projectileSpeed: 380, projectileLife: 3500, color: 0xffffff, overheatBuildup: 45, pellets: 1, spreadAngle: 0, missileCount: 0, aoeRadius: 0, description: 'One-shot power. Long cooldown.' },
  { id: 'missile_rack', name: 'MISSILE RACK', type: 'missile', damage: 60, cooldown: 900, energyCost: 18.0, ammoCost: 0, projectileSpeed: 55, projectileLife: 8000, color: 0xfff2cf, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 1, aoeRadius: 0, description: 'Standard homing missile.' },
  { id: 'dual_missile', name: 'DUAL RACK', type: 'missile', damage: 55, cooldown: 1400, energyCost: 30.0, ammoCost: 0, projectileSpeed: 60, projectileLife: 8000, color: 0xfff2cf, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 2, aoeRadius: 0, description: 'Twin launch. Expensive.' },
  { id: 'emp_burst', name: 'EMP BURST', type: 'area', damage: 5, cooldown: 4500, energyCost: 35.0, ammoCost: 0, projectileSpeed: 0, projectileLife: 0, color: 0x88ffff, overheatBuildup: 0, pellets: 0, spreadAngle: 0, missileCount: 0, aoeRadius: 18, description: 'Stuns all enemies in range.' }
];

export const SKILL_TREE_NODES = [
  { id: 'hull_1', name: 'HULL PLATING I', branch: 'HULL', effect: 'armor base +20', cost: 1, requires: null, description: 'Reinforced armor lattice adds 20 base armor.' },
  { id: 'hull_2', name: 'HULL PLATING II', branch: 'HULL', effect: 'armor base +30', cost: 2, requires: 'hull_1', description: 'Second armor layer adds 30 more base armor.' },
  { id: 'hull_3', name: 'REACTIVE ARMOR', branch: 'HULL', effect: '15% armor dmg reduction', cost: 2, requires: 'hull_2', description: 'Reactive plates reduce armor damage by 15%.' },
  { id: 'hull_4', name: 'DAMAGE CONTROL', branch: 'HULL', effect: 'armor +1/s regen at dock', cost: 3, requires: 'hull_3', description: 'Dock crews repair armor slowly while landed.' },
  { id: 'shield_1', name: 'SHIELD BOOST I', branch: 'SHIELD', effect: 'maxShield +25', cost: 1, requires: null, description: 'Adds 25 maximum shield capacity.' },
  { id: 'shield_2', name: 'SHIELD BOOST II', branch: 'SHIELD', effect: 'maxShield +25', cost: 2, requires: 'shield_1', description: 'Adds another 25 maximum shield capacity.' },
  { id: 'shield_3', name: 'RAPID RECHARGE', branch: 'SHIELD', effect: 'regenDelay 5000->3000ms', cost: 2, requires: 'shield_2', description: 'Shield regen starts sooner after damage.' },
  { id: 'shield_4', name: 'OVERCHARGE', branch: 'SHIELD', effect: 'one-time 150% shield burst per dock', cost: 3, requires: 'shield_3', description: 'Docking briefly overcharges shields to 150% capacity.' },
  { id: 'weap_1', name: 'CAPACITOR I', branch: 'WEAPONS', effect: 'energy +20', cost: 1, requires: null, description: 'Expands energy storage to 120.' },
  { id: 'weap_2', name: 'HEAT SINKS', branch: 'WEAPONS', effect: 'maxHeat +30', cost: 1, requires: null, description: 'Raises maximum heat before overheat.' },
  { id: 'weap_3', name: 'OVERCLOCKED COILS', branch: 'WEAPONS', effect: 'fireCooldown x0.85', cost: 2, requires: 'weap_1', description: 'Primary weapons cycle 15% faster.' },
  { id: 'weap_4', name: 'ARMOR PIERCING', branch: 'WEAPONS', effect: '25% dmg bypasses enemy shieldHp', cost: 3, requires: 'weap_3', description: 'Part of each hit punches through enemy shield pips.' },
  { id: 'eng_1', name: 'THRUSTER BOOST I', branch: 'ENGINES', effect: 'thrust +3', cost: 1, requires: null, description: 'Adds 3 thrust.' },
  { id: 'eng_2', name: 'THRUSTER BOOST II', branch: 'ENGINES', effect: 'thrust +3', cost: 2, requires: 'eng_1', description: 'Adds 3 more thrust.' },
  { id: 'eng_3', name: 'AFTERBURNER', branch: 'ENGINES', effect: 'Shift: thrust x1.8 / 3s / 12s cd', cost: 2, requires: 'eng_2', description: 'Unlocks timed afterburner on Shift.' },
  { id: 'eng_4', name: 'INERTIAL DAMPENERS', branch: 'ENGINES', effect: 'damping 0.985->0.975', cost: 3, requires: 'eng_3', description: 'Tighter damping reduces drift.' }
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
  ['scout', 'interceptor', 'gunboat', 'elite', 'dreadnought']
];

const classWeights = {
  scout: 50,
  interceptor: 30,
  gunboat: 10,
  elite: 8,
  dreadnought: 2
};

export function getDifficultyTier(score) {
  if (score < 1) return 0;
  if (score < 500) return 1;
  if (score < 1500) return 2;
  if (score < 4000) return 3;
  return 4;
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

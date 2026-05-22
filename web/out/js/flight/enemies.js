import { FORMATION_ROLES, getDifficultyMultiplier, getDifficultyTier, getEnemyClass, getRandomClassForTier, applyDamageModel } from './combat-overhaul.js';
import { BOSS_SCORE_THRESHOLDS, combatState, queueCombatDebrief, recordCombatHit } from './combat-state.js';
import { sfxEngine } from './sfx.js';
import {
  deactivateCombatObject,
  enemyBullets,
  fireBullet,
  playerBullets,
  playerMissiles,
  triggerImpactFlash,
  updateBullet,
  updateMissile,
  updateWeaponVfxPools
} from './weapons.js';
import { COMBAT_ZONE_RADIUS } from './world.js';
import { checkHunterFlee } from './hunters.js';

const THREE = globalThis.THREE;

export const enemies = [];

export const ENEMY_BASE_RADIUS = 0.62;
export const DREADNOUGHT_SCALE = 2.4;
export const BOSS_DREADNOUGHT_SCALE = 3.2;
const LOCAL_AGGRESSION_RADIUS = Math.min(46, COMBAT_ZONE_RADIUS);

let deps = null;
let combatWasActive = false;

function isHyperspeedCombatImmune(flightState) {
  const autopilot = flightState?.autopilot;
  return Boolean(autopilot && typeof autopilot === 'object' && (autopilot.hyperspeedMult ?? 1) > 5);
}

export function configureEnemies(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Enemies module not configured');
  return deps;
}

export function createEnemyPool({ THREE: ThreeRef = THREE, gameRoot, maxEnemies }) {
  for (let i = 0; i < maxEnemies; i++) {
    const enemy = new ThreeRef.Group();
    enemy.visible = false;
    enemy.userData = { active: false, health: 1, maxHealth: 1, cooldown: 500 + Math.random() * 1200, radius: ENEMY_BASE_RADIUS, classId: 'scout', baseRadius: ENEMY_BASE_RADIUS };
    const glow = new ThreeRef.PointLight(0xff3355, 0, 8, 2);
    glow.position.set(0, 0, 0.6);
    enemy.userData.engineGlow = glow;
    enemy.add(glow);
    gameRoot.add(enemy);
    enemies.push(enemy);
  }
}

export function buildEnemyMaterial(color, opacity = 0.88) {
  return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
}

export function buildEnemyGeometry(classId) {
  const cls = getEnemyClass(classId);
  const group = new THREE.Group();
  const bodyMat = buildEnemyMaterial(cls.color, cls.geometry === 'phantom' ? 0.55 : 0.95);
  group.userData.bodyMaterial = bodyMat;
  const wingMat = buildEnemyMaterial(cls.wingColor, 0.78);
  const accentMat = buildEnemyMaterial(0xffcc00, 0.65);
  const geometry = cls.geometry;

  if (geometry === 'dart') {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 8), bodyMat);
    body.rotation.x = -Math.PI / 2;
    body.userData.enemyBody = true;
    const wingGeo = new THREE.BoxGeometry(0.08, 0.72, 0.28);
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.42, 0, 0.16);
      wing.rotation.z = side * 0.42;
      group.add(wing);
    });
    group.add(body);
  } else if (geometry === 'box') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.9), bodyMat);
    body.userData.enemyBody = true;
    const podGeo = new THREE.BoxGeometry(0.18, 0.18, 0.74);
    [-1, 1].forEach(side => {
      const pod = new THREE.Mesh(podGeo, wingMat);
      pod.position.set(side * 0.48, 0, -0.05);
      group.add(pod);
    });
    group.add(body);
  } else if (geometry === 'diamond') {
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), bodyMat);
    body.userData.enemyBody = true;
    const finGeo = new THREE.BoxGeometry(0.08, 0.34, 0.08);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, y]) => {
      const fin = new THREE.Mesh(finGeo, wingMat);
      fin.position.set(x * 0.4, y * 0.4, 0);
      fin.rotation.z = Math.atan2(y, x);
      group.add(fin);
    });
    group.add(body);
  } else if (geometry === 'cruiser') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 1.45), bodyMat);
    const crossA = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.42), wingMat);
    const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.82, 0.52), wingMat);
    body.userData.enemyBody = true;
    group.add(body, crossA, crossB);
  } else if (geometry === 'phantom') {
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), bodyMat);
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.56, 0.12);
    body.userData.enemyBody = true;
    [-1, 1].forEach(side => {
      const blade = new THREE.Mesh(bladeGeo, wingMat);
      blade.position.set(side * 0.32, 0, 0);
      blade.rotation.z = Math.PI / 4;
      group.add(blade);
    });
    group.add(body);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bodyMat);
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.05), wingMat);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.05), wingMat);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, 0.05), accentMat);
    const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.48, 5), accentMat);
    body.userData.enemyBody = true;
    leftWing.position.x = -0.55;
    rightWing.position.x = 0.55;
    antenna.rotation.x = -Math.PI / 2;
    antenna.position.z = -0.42;
    group.add(body, leftWing, rightWing, strut, antenna);
  }

  return group;
}

/** Assigns class-specific idle tumble speed in radians per second. */
export function assignRotationRate(cls) {
  const rates = {
    scout: 0.9,
    interceptor: 0.45,
    gunboat: 0.08,
    elite: 0.65,
    dreadnought: 0.0,
    phantom: 1.4
  };
  const baseRate = rates[cls.id] ?? 0.3;
  return baseRate === 0 ? 0 : baseRate + (Math.random() - 0.5) * 0.12;
}

/** Assigns class-specific idle tumble axis. */
export function assignRotationAxis(cls) {
  const axes = {
    scout: new THREE.Vector3(0.3, 1, 0.2).normalize(),
    interceptor: new THREE.Vector3(0, 0, 1),
    gunboat: new THREE.Vector3(0, 1, 0),
    elite: new THREE.Vector3(0.5, 0.5, 0.5).normalize(),
    dreadnought: new THREE.Vector3(0, 1, 0),
    phantom: new THREE.Vector3(1, 0.6, 0.4).normalize()
  };
  return axes[cls.id] ?? new THREE.Vector3(0, 1, 0);
}

/** Applies pooled enemy visual scale and collision radius for the resolved class. */
export function applyEnemyScaleForClass(enemy, cls) {
  const scale = cls.id === 'dreadnought' ? DREADNOUGHT_SCALE : 1.0;
  enemy.scale?.setScalar?.(scale);
  enemy.userData.baseRadius = ENEMY_BASE_RADIUS;
  enemy.userData.radius = ENEMY_BASE_RADIUS * scale;
  return scale;
}

export function applyBossOverrides(enemy) {
  if (!enemy) return null;
  enemy.scale?.setScalar?.(BOSS_DREADNOUGHT_SCALE);
  enemy.userData.isBoss = true;
  enemy.userData.health = 18;
  enemy.userData.maxHealth = 18;
  enemy.userData.shieldHp = 6;
  enemy.userData.maxShieldHp = 6;
  enemy.userData.reward = 800;
  enemy.userData.radius = ENEMY_BASE_RADIUS * BOSS_DREADNOUGHT_SCALE;
  enemy.userData.bossPhase = 1;
  enemy.userData.bossLastPhase = 1;
  enemy.userData.bossBurstCount = 4;
  enemy.userData.bossFireCooldownMs = 900;
  enemy.userData.lastBossEscortAt = 0;
  buildEnemyHealthPips(enemy);
  return enemy;
}

/** Turns off an enemy engine glow without removing the pooled light. */
export function setEnemyEngineGlowInactive(enemy) {
  const glow = enemy?.userData?.engineGlow;
  if (!glow) return;
  glow.intensity = 0;
}

/** Pulses the pooled engine glow for one active enemy. */
export function updateEnemyEngineGlow(enemy, cls, time) {
  const glow = enemy?.userData?.engineGlow;
  if (!glow || !enemy.userData.active || !enemy.visible) {
    setEnemyEngineGlowInactive(enemy);
    return 0;
  }
  const baseIntensity = cls.id === 'dreadnought' ? 2.8 : 0.9;
  const pulse = Math.sin(time * 4.5 + (enemy.userData.phantomPhase ?? 0)) * 0.18;
  glow.intensity = baseIntensity + pulse;
  if (enemy.userData.burstRemaining > 0) glow.intensity *= 1.6;
  return glow.intensity;
}

/** Applies the one-frame delayed-spawn lunge toward the player. */
export function applySpawnApproachBurst(enemy, flightState, cls, dt = 0.016) {
  if (!enemy?.userData?.spawnApproach) return 0;
  enemy.userData.spawnApproach = false;
  if (!enemy.userData.velocity) enemy.userData.velocity = new THREE.Vector3();
  const toPlayer = flightState.pos.clone().sub(enemy.position);
  if (toPlayer.lengthSq() <= 0.000001) return 0;
  toPlayer.normalize();
  const burstSpeed = cls.approachSpeed.far * 2.2;
  enemy.userData.velocity.addScaledVector(toPlayer, burstSpeed);
  enemy.position.addScaledVector(toPlayer, burstSpeed * Math.min(Math.max(dt, 0.016), 0.08));
  return burstSpeed;
}

/** Adds the elite sidestep oscillation for aggressive/flanking roles. */
export function applyEliteStrafe(enemy, cls, role, flightRight, time, dt) {
  if (cls.id !== 'elite' || role === FORMATION_ROLES.SUPPORT) return 0;
  const strafeFreq = 2.2;
  const strafeAmp = 4.5;
  const strafeOffset = Math.sin(time * strafeFreq + (enemy.userData.phantomPhase ?? 0));
  const delta = strafeOffset * strafeAmp * dt;
  enemy.position.addScaledVector(flightRight, delta);
  return delta;
}

export function buildEnemyHealthPips(enemy) {
  const existing = enemy.userData.healthPips;
  if (existing) enemy.remove(existing);
  const total = (enemy.userData.maxHealth || 1) + (enemy.userData.maxShieldHp || 0);
  if (total <= 1) {
    enemy.userData.healthPips = null;
    return;
  }
  const pips = new THREE.Group();
  const pipGeo = new THREE.SphereGeometry(0.06, 6, 4);
  for (let i = 0; i < total; i++) {
    const pip = new THREE.Mesh(pipGeo, new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.9 }));
    pip.position.set((i - (total - 1) / 2) * 0.16, 1.2, 0);
    pips.add(pip);
  }
  enemy.add(pips);
  enemy.userData.healthPips = pips;
  enemy.userData.lastPipUpdate = 0;
}

export function updateEnemyHealthPips(enemy, now = performance.now()) {
  const pips = enemy.userData.healthPips;
  if (!pips || now - (enemy.userData.lastPipUpdate || 0) < 200) return;
  enemy.userData.lastPipUpdate = now;
  const shieldHp = Math.max(0, enemy.userData.shieldHp || 0);
  const health = Math.max(0, enemy.userData.health || 0);
  pips.children.forEach((pip, idx) => {
    if (idx < shieldHp) pip.material.color.setHex(0x88ffff);
    else if (idx < shieldHp + health) pip.material.color.setHex(0xff3355);
    else pip.material.color.setHex(0x334055);
  });
}

export function restoreEnemyOpacity(enemy) {
  if (!enemy?.userData) return;
  const cls = getEnemyClass(enemy.userData.classId || 'scout');
  const bodyOpacity = cls.geometry === 'phantom' ? 0.55 : 0.95;
  if (enemy.userData.bodyMaterial) enemy.userData.bodyMaterial.opacity = bodyOpacity;
  enemy.userData.modelRoot?.children?.forEach(child => {
    if (!child.material || child.userData?.isPip) return;
    child.material.opacity = child.userData?.enemyBody ? bodyOpacity : 0.78;
  });
}

export function checkBossSpawnThreshold(state = combatState, enemyPool = enemies, flightState = {}) {
  if (!state || state.bossActive) return false;
  const thresholdIdx = state.bossThresholdIdx || 0;
  const threshold = BOSS_SCORE_THRESHOLDS[thresholdIdx];
  if (!Number.isFinite(threshold) || (flightState.score || 0) < threshold) return false;
  state.bossThresholdIdx = thresholdIdx + 1;
  return triggerBossEncounter(state, enemyPool, flightState);
}

export function triggerBossEncounter(state = combatState, enemyPool = enemies, flightState = {}) {
  const { addKillFeedEntry, flightForward, showGameMessage, windowRef = globalThis } = requireDeps();
  if (!state || state.bossActive) return false;
  state.bossActive = true;
  state.bossEnemyRef = null;
  showGameMessage?.({
    type: 'BOSS SIGNAL DETECTED',
    source: 'USSYVERSE CONTROL',
    text: 'ANOMALOUS CAPITAL-SHIP SIGNATURE ON INTERCEPT VECTOR.',
    choices: []
  });
  windowRef.setTimeout?.(() => showGameMessage?.({
    type: 'THREAT LEVEL CRITICAL',
    source: 'TACTICAL',
    text: 'HERMES-DREADNOUGHT INBOUND. BRACE FOR BOSS ENCOUNTER.',
    choices: []
  }), 1000);
  addKillFeedEntry?.('DREADNOUGHT INBOUND');
  windowRef.setTimeout?.(() => {
    const boss = enemyPool.find(enemy => !enemy.userData?.active);
    if (!boss) {
      state.bossActive = false;
      return;
    }
    spawnEnemy(boss, 0, 0, 'dreadnought');
    const forward = flightForward?.clone?.() || new THREE.Vector3(0, 0, -1);
    if (forward.lengthSq() <= 0.000001) forward.set(0, 0, -1);
    forward.normalize();
    boss.position.copy(flightState.pos).addScaledVector(forward, 80);
    applyBossOverrides(boss);
    state.bossEnemyRef = boss;
    showGameMessage?.({
      type: 'BOSS ENCOUNTER',
      source: 'TACTICAL',
      text: 'HERMES-DREADNOUGHT HAS ENTERED WEAPONS RANGE.',
      choices: []
    });
    sfxEngine.playFlat('explosion_large', { volume: 0.3 });
  }, 2800);
  return true;
}

export function updateBossAttackPhase(boss, cls, state = combatState, now = performance.now()) {
  if (!boss?.userData?.isBoss) return 0;
  const maxHealth = Math.max(1, boss.userData.maxHealth || cls?.health || 1);
  const ratio = Math.max(0, boss.userData.health || 0) / maxHealth;
  const previousPhase = boss.userData.bossPhase || 1;
  let phase = 1;
  let burstCount = 4;
  let cooldownMs = 900;
  if (ratio <= 1 / 3) {
    phase = 3;
    burstCount = 8;
    cooldownMs = 500;
  } else if (ratio <= 2 / 3) {
    phase = 2;
    burstCount = 6;
    cooldownMs = 700;
  }
  boss.userData.bossPhase = phase;
  boss.userData.bossBurstCount = burstCount;
  boss.userData.bossFireCooldownMs = cooldownMs;
  boss.userData.bossPhaseChanged = phase !== previousPhase;
  boss.userData.bossPhaseChangedAt = boss.userData.bossPhaseChanged ? now : (boss.userData.bossPhaseChangedAt || 0);
  state.bossEnemyRef = boss;
  return phase;
}

export function handleBossDeath(state = combatState, boss, flightState = {}, options = {}) {
  if (!boss?.userData?.isBoss) return false;
  const { addCombatCredits, addKillFeedEntry, showGameMessage } = options;
  state.bossActive = false;
  state.bossEnemyRef = null;
  flightState.score = (flightState.score || 0) + 1200;
  addCombatCredits?.(1200);
  showGameMessage?.({
    type: 'BOSS DESTROYED',
    source: 'TACTICAL',
    text: 'HERMES-DREADNOUGHT DESTROYED. CAPITAL-SHIP THREAT CLEARED.',
    choices: []
  });
  addKillFeedEntry?.('DREADNOUGHT DESTROYED +1200CR');
  sfxEngine.playFlat('explosion_large', { volume: 1 });
  deactivateCombatObject(boss);
  return true;
}

export function buildEnemyFromClass(enemy, classId) {
  const cls = getEnemyClass(classId);
  const glow = enemy.userData.engineGlow;
  while (enemy.children.length) enemy.remove(enemy.children[0]);
  const geometry = buildEnemyGeometry(cls.id);
  enemy.add(geometry);
  if (glow) enemy.add(glow);
  enemy.userData.classId = cls.id;
  enemy.userData.modelRoot = geometry;
  enemy.userData.bodyMaterial = geometry.userData.bodyMaterial;
}

export function getEnemyDamageUnits(rawDamage = 12) {
  return Math.max(1, Math.round(rawDamage / 12));
}

export function applyEnemyHit(enemy, rawDamage = 12) {
  const { flightState, handleEnemyDestroyed, skillTree } = requireDeps();
  const cls = getEnemyClass(enemy.userData.classId);
  let damageUnits = getEnemyDamageUnits(rawDamage);
  if (skillTree.unlocked.has('weap_4') && enemy.userData.shieldHp > 0 && enemy.userData.health > 0) {
    enemy.userData.health = Math.max(0, enemy.userData.health - 1);
  }
  while (damageUnits > 0 && enemy.userData.shieldHp > 0) {
    enemy.userData.shieldHp -= 1;
    damageUnits -= 1;
    if (enemy.userData.bodyMaterial) {
      enemy.userData.bodyMaterial.color.setHex(0x88ffff);
      enemy.userData.flashUntil = performance.now() + 120;
    }
  }
  if (damageUnits > 0) {
    enemy.userData.health = Math.max(0, enemy.userData.health - damageUnits);
  }
  updateEnemyHealthPips(enemy, 0);
  if (tryEliteCloak(enemy, cls)) {
    flightState.status = `SIGNATURE FADE - ${cls.label}`;
    flightState.statusUntil = performance.now() + 1200;
  }
  if (enemy.userData.health <= 0) {
    if (tryPhantomSplit(enemy, enemies, cls, combatState)) return;
    handleEnemyDestroyed(enemy);
  } else {
    flightState.status = `HIT - ${cls.label} ${enemy.userData.health}/${enemy.userData.maxHealth}HP`;
    flightState.statusUntil = performance.now() + 1200;
  }
}

/** Applies the phantom body/wing opacity flicker for the current frame. */
export function applyPhantomOpacityFlicker(enemy, time) {
  if (!enemy.userData.bodyMaterial) return 0;
  const phase = enemy.userData.phantomPhase ?? 0;
  const flicker = Math.sin(time * 3.2 + phase) * 0.15
    + Math.sin(time * 7.1 + phase * 1.7) * 0.06;
  const bodyOpacity = Math.max(0.12, 0.52 + flicker);
  enemy.userData.bodyMaterial.opacity = bodyOpacity;
  enemy.children[0]?.children?.forEach((child, i) => {
    if (!child.material || child.userData?.enemyBody || child.userData?.isPip) return;
    child.material.opacity = Math.max(0.08, 0.38 + flicker * 0.7
      + Math.sin(time * 5.5 + phase + i * 0.9) * 0.05);
  });
  return bodyOpacity;
}

export function tryEliteCloak(enemy, cls) {
  if (!enemy?.userData || cls.id !== 'elite' || enemy.userData.cloakUsed || enemy.userData.health <= 0) return false;
  if (enemy.userData.health > enemy.userData.maxHealth * 0.5) return false;
  enemy.userData.cloakUsed = true;
  enemy.userData.cloakUntil = performance.now() + 2200;
  if (enemy.userData.bodyMaterial) enemy.userData.bodyMaterial.opacity = 0.04;
  enemy.userData.modelRoot?.children?.forEach(child => {
    if (child.material && !child.userData?.isPip) child.material.opacity = 0.04;
  });
  sfxEngine.playFlat('shield_hit', { volume: 0.4 });
  return true;
}

function activateEnemyLikePoolObject(enemy, cls, position) {
  buildEnemyFromClass(enemy, cls.id);
  applyEnemyScaleForClass(enemy, cls);
  enemy.position.copy(position);
  enemy.visible = true;
  enemy.userData.active = true;
  enemy.userData.velocity = new THREE.Vector3();
  enemy.userData._prevPos = null;
  enemy.userData.rotationRate = assignRotationRate(cls);
  enemy.userData.rotationAxis = assignRotationAxis(cls);
  enemy.userData.phantomPhase = Math.random() * Math.PI * 2;
  enemy.userData.classId = cls.id;
  enemy.userData.health = cls.health;
  enemy.userData.maxHealth = cls.health;
  enemy.userData.shieldHp = cls.health > 2 ? cls.health - 1 : 0;
  enemy.userData.maxShieldHp = enemy.userData.shieldHp;
  enemy.userData.burstRemaining = 0;
  enemy.userData.burstNextAt = 0;
  enemy.userData.evasionTimer = 0;
  enemy.userData.stunUntil = 0;
  enemy.userData.spawnDelay = 0;
  enemy.userData.spawnApproach = false;
  enemy.userData.cloakUsed = false;
  enemy.userData.cloakUntil = 0;
  enemy.userData.splitDone = false;
  enemy.userData.isSplitChild = false;
  enemy.userData.isTurret = false;
  enemy.userData.parentEnemy = null;
  enemy.userData.reward = undefined;
  enemy.userData.creditReward = undefined;
  enemy.userData.xpReward = undefined;
  if (enemy.userData.engineGlow) {
    enemy.userData.engineGlow.color.copy(new THREE.Color(cls.color));
    enemy.userData.engineGlow.intensity = 0;
  }
  buildEnemyHealthPips(enemy);
}

export function tryDeployGunboatTurret(enemy, enemyPool = enemies, state = combatState, flightState) {
  const cls = getEnemyClass(enemy?.userData?.classId || 'scout');
  if (!enemy?.userData?.active || cls.id !== 'gunboat' || enemy.userData.isTurret) return null;
  if (enemy.userData.burstRemaining !== cls.burstCount || enemy.userData.burstRemaining <= 0) return null;
  state.activeTurrets ??= [];
  state.activeTurrets = state.activeTurrets.filter(item => item?.userData?.active && item.userData.isTurret);
  if (state.activeTurrets.length >= 2 || Math.random() >= 0.25) return null;
  const turret = enemyPool.find(item => item !== enemy && !item.userData.active);
  if (!turret) return null;
  const turretPos = enemy.position.clone();
  turretPos.x += (Math.random() * 2 - 1) * 3;
  turretPos.y += (Math.random() * 2 - 1) * 3;
  activateEnemyLikePoolObject(turret, cls, turretPos);
  turret.userData.isTurret = true;
  turret.userData.parentEnemy = enemy;
  turret.userData.health = 1;
  turret.userData.maxHealth = 1;
  turret.userData.shieldHp = 0;
  turret.userData.maxShieldHp = 0;
  turret.userData.velocity.set(0, 0, 0);
  turret.userData.rotationRate = 0;
  turret.userData.cooldown = flightState ? 0 : cls.fireRate;
  state.activeTurrets.push(turret);
  buildEnemyHealthPips(turret);
  return turret;
}

export function tryPhantomSplit(enemy, enemyPool = enemies, cls = getEnemyClass(enemy?.userData?.classId || 'phantom'), state = combatState) {
  if (!enemy?.userData || cls.id !== 'phantom' || enemy.userData.isSplitChild || enemy.userData.splitDone) return false;
  enemy.userData.splitDone = true;
  const slots = enemyPool.filter(item => item !== enemy && !item.userData.active).slice(0, 2);
  if (slots.length < 2) return false;
  slots.forEach((child, index) => {
    const childPos = enemy.position.clone();
    childPos.x += index === 0 ? -1.5 : 1.5;
    activateEnemyLikePoolObject(child, cls, childPos);
    child.userData.health = 1;
    child.userData.maxHealth = 1;
    child.userData.shieldHp = 0;
    child.userData.maxShieldHp = 0;
    child.userData.isSplitChild = true;
    child.userData.splitDone = true;
    child.userData.reward = Math.floor((cls.reward ?? cls.creditReward ?? 0) / 2);
    child.userData.creditReward = Math.floor((cls.creditReward ?? cls.reward ?? 0) / 2);
    child.userData.xpReward = Math.floor((cls.xpReward ?? 0) / 2);
    buildEnemyHealthPips(child);
  });
  deactivateCombatObject(enemy);
  state.activeTurrets = (state.activeTurrets || []).filter(item => item !== enemy);
  return true;
}

function getScaledEnemyFireCooldown(enemy, cls, getEnemyFireCooldown) {
  const baseCooldown = getEnemyFireCooldown(enemy.position, cls);
  return baseCooldown / (enemy.userData.difficultyMultiplier || 1);
}

function shouldEnemyEvadeHit(enemy) {
  const cls = getEnemyClass(enemy.userData.classId);
  if (!cls.evasion) return false;
  if (combatState.unlocked.has('weap_5') && Math.random() < 0.15) return false;
  if (Math.random() >= cls.evasion) return false;
  enemy.userData.evasionTimer = Math.max(enemy.userData.evasionTimer || 0, 450);
  return true;
}

function findNearestEnemyToPosition(position, maxDistance) {
  let nearest = null;
  let nearestDistSq = maxDistance * maxDistance;
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0) return;
    const distSq = enemy.position.distanceToSquared(position);
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = enemy;
    }
  });
  return nearest;
}

function getSecurityReputation(reputationState) {
  return reputationState?.scores?.security ?? 0;
}

function setSecurityReputation(reputationState, value) {
  if (!reputationState?.scores) return;
  reputationState.scores.security = Math.max(-100, Math.min(100, value));
}

function getAvailableEnemy(pool) {
  return pool.find(enemy => !enemy?.userData?.active);
}

export function getFriendlyEscortOrbitPosition(playerPos, timeSeconds, radius = 12) {
  return new THREE.Vector3(
    playerPos.x + Math.cos(timeSeconds) * radius,
    playerPos.y + Math.sin(timeSeconds * 0.5) * 3,
    playerPos.z + Math.sin(timeSeconds) * radius
  );
}

function applyFriendlyVisuals(enemy) {
  enemy.traverse?.(child => {
    if (!child.material) return;
    child.material.color?.setHex?.(0x44ff88);
    child.material.wireframe = true;
    child.material.transparent = true;
    child.material.opacity = Math.min(child.material.opacity ?? 0.85, 0.85);
  });
  if (enemy.userData.engineGlow) {
    enemy.userData.engineGlow.color?.setHex?.(0x44ff88);
    enemy.userData.engineGlow.intensity = 0.8;
  }
}

function clearFactionReference(enemy, state = combatState) {
  if (state.activeBountyHunter === enemy) state.activeBountyHunter = null;
  if (state.activeFriendlyEscort === enemy) state.activeFriendlyEscort = null;
}

function findFriendlyTarget(friendly) {
  let target = null;
  let targetHealth = Infinity;
  let targetDistSq = Infinity;
  enemies.forEach(enemy => {
    if (enemy === friendly || !enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0 || enemy.userData.isFriendly) return;
    const health = enemy.userData.health ?? 1;
    const distSq = friendly.position.distanceToSquared(enemy.position);
    if (health < targetHealth || (health === targetHealth && distSq < targetDistSq)) {
      target = enemy;
      targetHealth = health;
      targetDistSq = distSq;
    }
  });
  return target;
}

function updateFriendlyEscort(enemy, flightState, now, dt) {
  const elapsed = Math.max(0, now - (enemy.userData.spawnedAt || now));
  const duration = enemy.userData.durationMs || 25000;
  if (elapsed >= duration + 1000) {
    clearFactionReference(enemy);
    deactivateCombatObject(enemy);
    return;
  }
  if (elapsed >= duration) {
    const fade = 1 - Math.min(1, (elapsed - duration) / 1000);
    enemy.traverse?.(child => {
      if (child.material) child.material.opacity = Math.max(0, fade * 0.85);
    });
  }

  const desired = getFriendlyEscortOrbitPosition(flightState.pos, now / 1000, 12);
  enemy.position.copy(desired);
  enemy.lookAt?.(flightState.pos);
  if (!enemy.userData.velocity) enemy.userData.velocity = new THREE.Vector3();
  if (!enemy.userData._prevPos) enemy.userData._prevPos = enemy.position.clone();
  enemy.userData.velocity.copy(enemy.position).sub(enemy.userData._prevPos).divideScalar(dt > 0 ? dt : 0.016);
  enemy.userData._prevPos.copy(enemy.position);

  if (now < (enemy.userData.nextFriendlyShotAt || 0)) return;
  const target = findFriendlyTarget(enemy);
  if (!target) return;
  const dir = target.position.clone().sub(enemy.position).normalize();
  if (fireBullet(playerBullets, enemy.position, dir, 110, 1.4, { damage: 12, color: 0x44ff88 })) {
    sfxEngine.playPositional('enemy_laser', enemy, { volume: 0.35 });
  }
  enemy.userData.nextFriendlyShotAt = now + 2500;
}

export function checkBountyHunterSpawn(reputationState, state = combatState, enemyPool = enemies, flightStateRef) {
  const { addKillFeedEntry, showGameMessage } = requireDeps();
  const security = getSecurityReputation(reputationState);
  if (security >= -30 || state.bossActive || state.activeBountyHunter || Math.random() > 0.08) return false;
  const enemy = getAvailableEnemy(enemyPool);
  if (!enemy) return false;
  spawnEnemy(enemy, flightStateRef?.score ?? 0, 0, 'elite');
  enemy.userData.isBountyHunter = true;
  enemy.userData.reward = 220;
  enemy.userData.health = 4;
  enemy.userData.maxHealth = 4;
  enemy.userData.shieldHp = 0;
  enemy.userData.maxShieldHp = 0;
  enemy.userData.label = 'BOUNTY HUNTER';
  buildEnemyHealthPips(enemy);
  state.activeBountyHunter = enemy;
  addKillFeedEntry?.('WARNING // SECURITY BOUNTY HUNTER INBOUND', '#ffcc00');
  showGameMessage?.({
    type: 'FACTION CONSEQUENCE',
    source: 'SECURITY DIRECTORATE',
    text: 'SECURITY REPUTATION CRITICAL. BOUNTY HUNTER DROPPING INTO YOUR VECTOR.',
    choices: [],
    ttsPriority: 'high'
  });
  return true;
}

export function checkFriendlyEscortSpawn(reputationState, state = combatState, enemyPool = enemies, flightStateRef) {
  const { addKillFeedEntry, showGameMessage } = requireDeps();
  const security = getSecurityReputation(reputationState);
  if (security <= 40 || state.activeFriendlyEscort || Math.random() > 0.12) return false;
  const enemy = getAvailableEnemy(enemyPool);
  if (!enemy) return false;
  spawnEnemy(enemy, flightStateRef?.score ?? 0, 0, 'scout');
  enemy.userData.isFriendly = true;
  enemy.userData.reward = 0;
  enemy.userData.health = 3;
  enemy.userData.maxHealth = 3;
  enemy.userData.shieldHp = 0;
  enemy.userData.maxShieldHp = 0;
  enemy.userData.teamColor = 0x44ff88;
  enemy.userData.spawnedAt = performance.now();
  enemy.userData.durationMs = 25000;
  enemy.userData.nextFriendlyShotAt = enemy.userData.spawnedAt + 500;
  enemy.userData.label = 'FRIENDLY ESCORT';
  applyFriendlyVisuals(enemy);
  buildEnemyHealthPips(enemy);
  state.activeFriendlyEscort = enemy;
  addKillFeedEntry?.('SECURITY ESCORT ONLINE // ALLIED SCOUT COVERING YOU', '#44ff88');
  showGameMessage?.({
    type: 'FACTION SUPPORT',
    source: 'SECURITY DIRECTORATE',
    text: 'POSITIVE SECURITY STANDING CONFIRMED. FRIENDLY ESCORT HAS JOINED YOUR FORMATION.',
    choices: [],
    ttsPriority: 'normal'
  });
  return true;
}

/** Assigns a formation role from the number of already-active enemies. */
export function assignFormationRole(activeCount, random = Math.random) {
  if (activeCount === 0) return FORMATION_ROLES.AGGRESSOR;
  if (activeCount === 1) return FORMATION_ROLES.FLANKER;
  return random() > 0.5 ? FORMATION_ROLES.SUPPORT : FORMATION_ROLES.FLANKER;
}

export function spawnEnemy(enemy, offset = 0, delay = 0, classId = null) {
  const { addKillFeedEntry, flightState, getEnemyFireCooldown, getVoicePersona, missionState, showGameMessage, ttsEngine } = requireDeps();
  if (!enemy) return;
  const resolvedClassId = missionState.step === 'killTutorialBogeys'
    ? 'scout'
    : (classId || getRandomClassForTier(getDifficultyTier(flightState.score)));
  const cls = getEnemyClass(resolvedClassId);
  if (cls.id === 'dreadnought') {
    addKillFeedEntry?.('DREADNOUGHT SPAWNED', 'var(--cyber-pink)');
    showGameMessage?.({
      type: 'THREAT LEVEL CRITICAL',
      source: 'USSYVERSE CONTROL',
      text: 'HERMES-DREADNOUGHT LOCKED ON. ALL PERSONNEL STAND CLEAR.',
      choices: []
    });
    ttsEngine?.speak?.('THREAT LEVEL CRITICAL. HERMES-DREADNOUGHT LOCKED ON.', getVoicePersona?.('USSYVERSE CONTROL'));
    const overlay = globalThis.document?.getElementById?.('cockpit-overlay');
    if (overlay) {
      overlay.classList.add('dreadnought-alert');
      globalThis.setTimeout?.(() => overlay.classList.remove('dreadnought-alert'), 1200);
    }
  }
  const difficultyMultiplier = getDifficultyMultiplier(flightState.score);
  buildEnemyFromClass(enemy, cls.id);
  applyEnemyScaleForClass(enemy, cls);
  if (enemy.userData.engineGlow) {
    const glowColor = new THREE.Color(cls.color);
    enemy.userData.engineGlow.color.copy(glowColor);
    enemy.userData.engineGlow.intensity = 0;
  }
  const angle = Math.random() * Math.PI * 2 + offset;
  const height = (Math.random() - 0.5) * 54;
  const radius = 92 + Math.random() * 58;
  enemy.position.set(
    flightState.pos.x + Math.cos(angle) * radius,
    flightState.pos.y + height,
    flightState.pos.z + Math.sin(angle) * radius
  );
  enemy.userData.active = true;
  const activeEnemyCount = enemies.filter(item => item !== enemy && item.userData.active).length;
  enemy.userData.role = assignFormationRole(activeEnemyCount);
  enemy.userData.flankDir = enemy.userData.role === FORMATION_ROLES.FLANKER && !enemy.userData.flankDir
    ? (Math.random() > 0.5 ? 1 : -1)
    : (enemy.userData.flankDir || 1);
  enemy.userData.velocity = new THREE.Vector3();
  enemy.userData._prevPos = null;
  enemy.userData.rotationRate = assignRotationRate(cls);
  enemy.userData.rotationAxis = assignRotationAxis(cls);
  enemy.userData.phantomPhase = Math.random() * Math.PI * 2;
  enemy.userData.health = cls.health;
  enemy.userData.maxHealth = cls.health;
  enemy.userData.isBoss = false;
  enemy.userData.isBountyHunter = false;
  enemy.userData.isFriendly = false;
  enemy.userData.reward = cls.creditReward;
  enemy.userData.classId = cls.id;
  enemy.userData.burstRemaining = 0;
  enemy.userData.burstNextAt = 0;
  enemy.userData.evasionTimer = 0;
  enemy.userData.stunUntil = 0;
  enemy.userData.difficultyMultiplier = difficultyMultiplier;
  enemy.userData.accuracy = Math.min(0.98, cls.accuracy * (0.85 + difficultyMultiplier * 0.15));
  enemy.userData.phantomPulseFrame = 0;
  enemy.userData.phantomOpacityTarget = cls.geometry === 'phantom' ? 0.55 : null;
  enemy.userData.cloakUsed = false;
  enemy.userData.cloakUntil = 0;
  enemy.userData.splitDone = false;
  enemy.userData.isSplitChild = false;
  enemy.userData.isTurret = false;
  enemy.userData.parentEnemy = null;
  enemy.userData.creditReward = undefined;
  enemy.userData.xpReward = undefined;
  enemy.userData.shieldHp = cls.health > 2 ? cls.health - 1 : 0;
  enemy.userData.maxShieldHp = enemy.userData.shieldHp;
  enemy.userData.spawnDelay = delay;
  enemy.userData.spawnApproach = delay > 0;
  const fireCooldown = getScaledEnemyFireCooldown(enemy, cls, getEnemyFireCooldown);
  enemy.userData.cooldown = fireCooldown + delay * 1000 + Math.random() * fireCooldown;
  enemy.visible = delay <= 0;
  buildEnemyHealthPips(enemy);
}

export function updateCombatObjects(dt) {
  const { addKillFeedEntry, flightRight, flightState, flightTempVec, flightTempVec2, flightUp, getEnemyFireCooldown, reputationState, showGameMessage, traderState } = requireDeps();
  checkBossSpawnThreshold(combatState, enemies, flightState);
  checkBountyHunterSpawn(reputationState, combatState, enemies, flightState);
  checkFriendlyEscortSpawn(reputationState, combatState, enemies, flightState);
  const activeAtFrameStart = enemies.some(enemy => enemy.userData.active && !enemy.userData.isFriendly);
  playerBullets.forEach(bullet => updateBullet(bullet, dt));
  enemyBullets.forEach(bullet => updateBullet(bullet, dt));
  playerMissiles.forEach(missile => updateMissile(missile, dt));
  updateWeaponVfxPools();

  enemies.forEach(enemy => {
    if (!enemy.userData.active) return;
    if (enemy.userData.spawnDelay > 0) {
      enemy.userData.spawnDelay -= dt;
      if (enemy.userData.spawnDelay <= 0) enemy.visible = true;
      else {
        setEnemyEngineGlowInactive(enemy);
        return;
      }
    }
    const now = performance.now();
    const cls = getEnemyClass(enemy.userData.classId);
    if (enemy.userData.isFriendly) {
      updateEnemyEngineGlow(enemy, cls, now / 1000);
      updateEnemyHealthPips(enemy, now);
      updateFriendlyEscort(enemy, flightState, now, dt);
      return;
    }
    // Hunter cooldown/flee timestamps are wall-clock based; do not pass performance.now().
    if (checkHunterFlee(enemy, { combatState, traderState, enemies, addKillFeedEntry, deactivateCombatObject, now: Date.now() })) return;
    const bossPhase = updateBossAttackPhase(enemy, cls, combatState, now);
    if (enemy.userData.bossPhaseChanged) {
      enemy.userData.bossPhaseChanged = false;
      const phaseText = bossPhase === 2
        ? 'DREADNOUGHT ARMOR BREACHED. WEAPONS CYCLING FASTER.'
        : 'DREADNOUGHT CORE EXPOSED. ELITE ESCORT PROTOCOL ACTIVE.';
      showGameMessage?.({ type: `BOSS PHASE ${bossPhase}`, source: 'TACTICAL', text: phaseText, choices: [] });
    }
    if (bossPhase === 3 && now - (enemy.userData.lastBossEscortAt || 0) >= 12000) {
      const eliteActive = enemies.some(item => item !== enemy && item.userData.active && item.userData.classId === 'elite');
      const escort = enemies.find(item => item !== enemy && !item.userData.active);
      if (!eliteActive && escort) {
        enemy.userData.lastBossEscortAt = now;
        spawnEnemy(escort, Math.PI * 0.5, 0.4, 'elite');
      }
    }
    applySpawnApproachBurst(enemy, flightState, cls, dt);
    updateEnemyEngineGlow(enemy, cls, now / 1000);
    if (enemy.userData.cloakUntil > now) {
      if (enemy.userData.bodyMaterial) enemy.userData.bodyMaterial.opacity = 0.04;
      enemy.userData.modelRoot?.children?.forEach(child => {
        if (child.material && !child.userData?.isPip) child.material.opacity = 0.04;
      });
    } else if (enemy.userData.cloakUntil) {
      enemy.userData.cloakUntil = 0;
      restoreEnemyOpacity(enemy);
    }
    if (cls.geometry === 'phantom' && !enemy.userData.cloakUntil) applyPhantomOpacityFlicker(enemy, now / 1000);
    if (enemy.userData.bodyMaterial && enemy.userData.flashUntil && now >= enemy.userData.flashUntil) {
      enemy.userData.bodyMaterial.color.setHex(cls.color);
      enemy.userData.flashUntil = 0;
    }
    updateEnemyHealthPips(enemy, now);
    flightTempVec.copy(flightState.pos).sub(enemy.position);
    const dist = flightTempVec.length();
    if (dist > 0.001) flightTempVec.multiplyScalar(1 / dist);
    const orbitRadius = LOCAL_AGGRESSION_RADIUS;
    const aggressionRadius = flightState.shield < 40 ? orbitRadius * 0.6 : orbitRadius;
    const approachSpeed = dist > aggressionRadius ? cls.approachSpeed.far : cls.approachSpeed.near;
    const role = enemy.userData.role || FORMATION_ROLES.AGGRESSOR;
    if (enemy.userData.isTurret) {
      enemy.userData.velocity?.set?.(0, 0, 0);
    } else if (role === FORMATION_ROLES.FLANKER) {
      flightTempVec2.copy(flightState.pos)
        .addScaledVector(flightRight, (enemy.userData.flankDir || 1) * orbitRadius)
        .sub(enemy.position);
      if (flightTempVec2.lengthSq() > 0.001) flightTempVec2.normalize();
      enemy.position.addScaledVector(flightTempVec2, approachSpeed * dt);
    } else if (role === FORMATION_ROLES.SUPPORT) {
      if (dist > 80) enemy.position.addScaledVector(flightTempVec, approachSpeed * dt);
      else if (dist < 45) enemy.position.addScaledVector(flightTempVec, -approachSpeed * dt);
    } else {
      enemy.position.addScaledVector(flightTempVec, approachSpeed * dt);
    }
    if (!enemy.userData.isTurret) applyEliteStrafe(enemy, cls, role, flightRight, now / 1000, dt);
    if (!enemy.userData.isTurret && cls.evasion > 0) {
      enemy.userData.evasionTimer = Math.max(0, (enemy.userData.evasionTimer || 0) - dt * 1000);
      if (enemy.userData.evasionTimer <= 0 && Math.random() < cls.evasion) {
        enemy.position
          .addScaledVector(flightRight, (Math.random() - 0.5) * 2.8)
          .addScaledVector(flightUp, (Math.random() - 0.5) * 2.8);
        enemy.userData.evasionTimer = 800 + Math.random() * 400;
      }
    }
    if (!enemy.userData.velocity) enemy.userData.velocity = new THREE.Vector3();
    if (enemy.userData.isTurret) {
      enemy.userData.velocity.set(0, 0, 0);
    } else {
      if (!enemy.userData._prevPos) enemy.userData._prevPos = enemy.position.clone();
      enemy.userData.velocity
        .copy(enemy.position)
        .sub(enemy.userData._prevPos)
        .divideScalar(dt > 0 ? dt : 0.016);
      enemy.userData._prevPos.copy(enemy.position);
    }
    if (cls.geometry !== 'phantom') enemy.lookAt(flightState.pos);
    if (enemy.userData.rotationRate > 0) {
      enemy.rotateOnAxis(enemy.userData.rotationAxis, enemy.userData.rotationRate * dt);
    }
    if (now < (enemy.userData.stunUntil || 0)) return;
    enemy.userData.cooldown -= dt * 1000;

    if (enemy.userData.cooldown <= 0 && dist < aggressionRadius) {
      enemy.userData.burstRemaining = enemy.userData.isBoss ? enemy.userData.bossBurstCount : cls.burstCount;
      enemy.userData.burstNextAt = now;
      enemy.userData.cooldown = Infinity;
    }

    if (enemy.userData.burstRemaining > 0 && now >= enemy.userData.burstNextAt) {
      tryDeployGunboatTurret(enemy, enemies, combatState, flightState);
      flightTempVec2.copy(flightState.pos).sub(enemy.position).normalize();
      const jitter = Math.max(0, 1 - (enemy.userData.accuracy ?? cls.accuracy));
      flightTempVec2
        .addScaledVector(flightRight, (Math.random() - 0.5) * jitter)
        .addScaledVector(flightUp, (Math.random() - 0.5) * jitter)
        .normalize();
      if (fireBullet(enemyBullets, enemy.position, flightTempVec2, 18, 2.1, { damage: 8, color: cls.color })) {
        sfxEngine.playPositional('enemy_laser', enemy, { volume: 0.5 });
      }
      enemy.userData.burstRemaining -= 1;
      enemy.userData.burstNextAt = now + cls.burstDelay;
      if (enemy.userData.burstRemaining <= 0) {
        const fireCooldown = enemy.userData.isBoss ? enemy.userData.bossFireCooldownMs : getScaledEnemyFireCooldown(enemy, cls, getEnemyFireCooldown);
        enemy.userData.cooldown = fireCooldown + Math.random() * fireCooldown * 0.45;
      }
    }

    if (!isHyperspeedCombatImmune(flightState) && dist < 1.15) {
      applyPlayerDamage(14);
      spawnEnemy(enemy, flightState.score, 1.4 + Math.random() * 2);
    }
  });

  playerBullets.forEach(bullet => {
    if (!bullet.userData.active) return;
    enemies.forEach(enemy => {
      if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0 || !bullet.userData.active) return;
      const radius = enemy.userData.radius + bullet.userData.radius;
      if (bullet.position.distanceToSquared(enemy.position) < radius * radius) {
        triggerImpactFlash(bullet.position);
        deactivateCombatObject(bullet);
        if (shouldEnemyEvadeHit(enemy)) return;
        recordCombatHit();
        applyEnemyHit(enemy, bullet.userData.damage || 12);
      }
    });
  });

  enemyBullets.forEach(bullet => {
    if (!bullet.userData.active) return;
    if (isHyperspeedCombatImmune(flightState)) return;
    if (bullet.position.distanceToSquared(flightState.pos) < 0.55) {
      deactivateCombatObject(bullet);
      if (combatState.unlocked.has('hull_5') && Math.random() < 0.20) {
        triggerImpactFlash(flightState.pos);
        flightState.status = 'POINT DEFENSE INTERCEPT';
        flightState.statusUntil = performance.now() + 900;
        return;
      }
      applyPlayerDamage(8);
    }
  });

  playerMissiles.forEach(missile => {
    if (!missile.userData.active) return;
    enemies.forEach(enemy => {
      if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0 || !missile.userData.active) return;
      const radius = enemy.userData.radius + missile.userData.radius;
      if (missile.position.distanceToSquared(enemy.position) < radius * radius) {
        triggerImpactFlash(missile.position);
        deactivateCombatObject(missile);
        if (shouldEnemyEvadeHit(enemy)) return;
        recordCombatHit();
        applyEnemyHit(enemy, missile.userData.damage || 60);
      }
    });
  });

  if (flightState.armor <= 0) {
    flightState.status = 'HULL BREACH // LAND FOR REPAIRS';
    flightState.armor = 25;
    flightState.shield = 0;
    flightState.score = Math.max(0, flightState.score - 4);
    flightState.vel.set(0, 0, 0);
    flightState.pos.set(0, 2.2, 16);
    enemies.forEach((enemy, idx) => spawnEnemy(enemy, idx * 1.7, idx * 0.9));
  }
  const activeAtFrameEnd = enemies.some(enemy => enemy.userData.active && !enemy.userData.isFriendly);
  if ((combatWasActive || activeAtFrameStart) && !activeAtFrameEnd && !combatState.debriefPending) {
    queueCombatDebrief(combatState);
    requireDeps().addKillFeedEntry?.('WAVE CLEARED', 'var(--cyber-green)');
    requireDeps().onWaveComplete?.();
  }
  combatWasActive = activeAtFrameEnd;
}

export function applyPlayerDamage(amount) {
  const { addKillFeedEntry, combatAudio, flightHud, flightState, getVoicePersona, skillTree, windowRef } = requireDeps();
  const shieldBefore = flightState.shield;
  const armorBefore = flightState.armor;
  const { emitCombatPlayerHit } = requireDeps();
  emitCombatPlayerHit({ amount });
  triggerImpactFlash(flightState.pos);
  combatState.lastHitAt = performance.now();
  combatState.adrenaline = Math.min(1.0, combatState.adrenaline + 0.15);
  const damage = applyDamageModel({ shield: flightState.shield, armor: flightState.armor }, amount, skillTree.getArmorDamageMultiplier());
  flightState.shield = damage.shield;
  flightState.armor = damage.armor;
  const shieldDrop = shieldBefore - flightState.shield;
  if (combatState.unlocked.has('shield_5') && shieldBefore > 25 && shieldDrop > 0) {
    sfxEngine.playFlat('shield_hit');
    triggerImpactFlash(flightState.pos);
    const nearest = findNearestEnemyToPosition(flightState.pos, 12);
    if (nearest) applyEnemyHit(nearest, Math.max(1, amount * 0.2));
  }
  if (flightHud) {
    flightHud.classList.remove('hud-hit');
    void flightHud.offsetWidth;
    flightHud.classList.add('hud-hit');
    windowRef.setTimeout(() => flightHud.classList.remove('hud-hit'), 180);
  }
  if (shieldDrop > 15) {
    combatAudio.bark('TAKING FIRE', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' });
  }
  if (flightState.shield < 25 && !flightState.shieldCriticalSpoken) {
    flightState.shieldCriticalSpoken = true;
    addKillFeedEntry?.('SHIELDS CRITICAL', 'var(--cyber-yellow)');
    windowRef.setTimeout(() => combatAudio.bark('SHIELDS CRITICAL', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' }), shieldDrop > 15 ? 450 : 0);
  }
  if (armorBefore >= 40 && flightState.armor < 40 && !flightState.hullCriticalLogged) {
    flightState.hullCriticalLogged = true;
    addKillFeedEntry?.('HULL BELOW 40%', 'var(--cyber-pink)');
  }
}

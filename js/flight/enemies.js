import { getDifficultyTier, getEnemyClass, getRandomClassForTier, applyDamageModel } from './combat-overhaul.js';
import { combatState } from './combat-state.js';
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

const THREE = globalThis.THREE;

export const enemies = [];

let deps = null;

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
    enemy.userData = { active: false, health: 1, maxHealth: 1, cooldown: 500 + Math.random() * 1200, radius: 0.62, classId: 'scout' };
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
  const bodyMat = buildEnemyMaterial(cls.color, 0.95);
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

  group.userData.bodyMaterial = bodyMat;
  return group;
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

export function buildEnemyFromClass(enemy, classId) {
  const cls = getEnemyClass(classId);
  while (enemy.children.length) enemy.remove(enemy.children[0]);
  const geometry = buildEnemyGeometry(cls.id);
  enemy.add(geometry);
  enemy.userData.classId = cls.id;
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
  if (enemy.userData.health <= 0) {
    handleEnemyDestroyed(enemy);
  } else {
    flightState.status = `HIT - ${cls.label} ${enemy.userData.health}/${enemy.userData.maxHealth}HP`;
    flightState.statusUntil = performance.now() + 1200;
  }
}

export function spawnEnemy(enemy, offset = 0, delay = 0, classId = null) {
  const { flightState, getEnemyFireCooldown, missionState } = requireDeps();
  if (!enemy) return;
  const resolvedClassId = missionState.step === 'killTutorialBogeys'
    ? 'scout'
    : (classId || getRandomClassForTier(getDifficultyTier(flightState.score)));
  const cls = getEnemyClass(resolvedClassId);
  buildEnemyFromClass(enemy, cls.id);
  const angle = Math.random() * Math.PI * 2 + offset;
  const height = (Math.random() - 0.5) * 54;
  const radius = 92 + Math.random() * 58;
  enemy.position.set(
    flightState.pos.x + Math.cos(angle) * radius,
    flightState.pos.y + height,
    flightState.pos.z + Math.sin(angle) * radius
  );
  enemy.userData.active = true;
  enemy.userData.health = cls.health;
  enemy.userData.maxHealth = cls.health;
  enemy.userData.classId = cls.id;
  enemy.userData.burstRemaining = 0;
  enemy.userData.burstNextAt = 0;
  enemy.userData.evasionTimer = 0;
  enemy.userData.stunUntil = 0;
  enemy.userData.shieldHp = cls.health > 2 ? cls.health - 1 : 0;
  enemy.userData.maxShieldHp = enemy.userData.shieldHp;
  enemy.userData.spawnDelay = delay;
  const fireCooldown = getEnemyFireCooldown(enemy.position, cls);
  enemy.userData.cooldown = fireCooldown + delay * 1000 + Math.random() * fireCooldown;
  enemy.visible = delay <= 0;
  buildEnemyHealthPips(enemy);
}

export function updateCombatObjects(dt) {
  const { flightRight, flightState, flightTempVec, flightTempVec2, flightUp, getEnemyFireCooldown } = requireDeps();
  playerBullets.forEach(bullet => updateBullet(bullet, dt));
  enemyBullets.forEach(bullet => updateBullet(bullet, dt));
  playerMissiles.forEach(missile => updateMissile(missile, dt));
  updateWeaponVfxPools();

  enemies.forEach(enemy => {
    if (!enemy.userData.active) return;
    if (enemy.userData.spawnDelay > 0) {
      enemy.userData.spawnDelay -= dt;
      if (enemy.userData.spawnDelay <= 0) enemy.visible = true;
      return;
    }
    const now = performance.now();
    const cls = getEnemyClass(enemy.userData.classId);
    if (enemy.userData.bodyMaterial && enemy.userData.flashUntil && now >= enemy.userData.flashUntil) {
      enemy.userData.bodyMaterial.color.setHex(cls.color);
      enemy.userData.flashUntil = 0;
    }
    updateEnemyHealthPips(enemy, now);
    flightTempVec.copy(flightState.pos).sub(enemy.position);
    const dist = flightTempVec.length();
    if (dist > 0.001) flightTempVec.multiplyScalar(1 / dist);
    const approachSpeed = dist > 46 ? cls.approachSpeed.far : cls.approachSpeed.near;
    enemy.position.addScaledVector(flightTempVec, approachSpeed * dt);
    if (cls.evasion > 0) {
      enemy.userData.evasionTimer = Math.max(0, (enemy.userData.evasionTimer || 0) - dt * 1000);
      if (enemy.userData.evasionTimer <= 0 && Math.random() < cls.evasion) {
        enemy.position
          .addScaledVector(flightRight, (Math.random() - 0.5) * 2.8)
          .addScaledVector(flightUp, (Math.random() - 0.5) * 2.8);
        enemy.userData.evasionTimer = 800 + Math.random() * 400;
      }
    }
    enemy.lookAt(flightState.pos);
    if (now < (enemy.userData.stunUntil || 0)) return;
    enemy.userData.cooldown -= dt * 1000;

    if (enemy.userData.cooldown <= 0 && dist < 46) {
      enemy.userData.burstRemaining = cls.burstCount;
      enemy.userData.burstNextAt = now;
      enemy.userData.cooldown = Infinity;
    }

    if (enemy.userData.burstRemaining > 0 && now >= enemy.userData.burstNextAt) {
      flightTempVec2.copy(flightState.pos).sub(enemy.position).normalize();
      const jitter = Math.max(0, 1 - cls.accuracy);
      flightTempVec2
        .addScaledVector(flightRight, (Math.random() - 0.5) * jitter)
        .addScaledVector(flightUp, (Math.random() - 0.5) * jitter)
        .normalize();
      fireBullet(enemyBullets, enemy.position, flightTempVec2, 18, 2.1, { damage: 8, color: cls.color });
      enemy.userData.burstRemaining -= 1;
      enemy.userData.burstNextAt = now + cls.burstDelay;
      if (enemy.userData.burstRemaining <= 0) {
        const fireCooldown = getEnemyFireCooldown(enemy.position, cls);
        enemy.userData.cooldown = fireCooldown + Math.random() * fireCooldown * 0.45;
      }
    }

    if (dist < 1.15) {
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
        applyEnemyHit(enemy, bullet.userData.damage || 12);
      }
    });
  });

  enemyBullets.forEach(bullet => {
    if (!bullet.userData.active) return;
    if (bullet.position.distanceToSquared(flightState.pos) < 0.55) {
      deactivateCombatObject(bullet);
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
}

export function applyPlayerDamage(amount) {
  const { combatAudio, flightHud, flightState, getVoicePersona, skillTree, windowRef } = requireDeps();
  const shieldBefore = flightState.shield;
  const { emitCombatPlayerHit } = requireDeps();
  emitCombatPlayerHit({ amount });
  triggerImpactFlash(flightState.pos);
  combatState.lastHitAt = performance.now();
  combatState.adrenaline = Math.min(1.0, combatState.adrenaline + 0.15);
  const damage = applyDamageModel({ shield: flightState.shield, armor: flightState.armor }, amount, skillTree.getArmorDamageMultiplier());
  flightState.shield = damage.shield;
  flightState.armor = damage.armor;
  if (flightHud) {
    flightHud.classList.remove('hud-hit');
    void flightHud.offsetWidth;
    flightHud.classList.add('hud-hit');
    windowRef.setTimeout(() => flightHud.classList.remove('hud-hit'), 180);
  }
  const shieldDrop = shieldBefore - flightState.shield;
  if (shieldDrop > 15) {
    combatAudio.bark('TAKING FIRE', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' });
  }
  if (flightState.shield < 25 && !flightState.shieldCriticalSpoken) {
    flightState.shieldCriticalSpoken = true;
    windowRef.setTimeout(() => combatAudio.bark('SHIELDS CRITICAL', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' }), shieldDrop > 15 ? 450 : 0);
  }
}

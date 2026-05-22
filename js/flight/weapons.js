import { applyHeatShot, getWeaponDef } from './combat-overhaul.js';
import { combatState } from './combat-state.js';
import { sfxEngine } from './sfx.js';

const THREE = globalThis.THREE;

export const playerBullets = [];
export const enemyBullets = [];
export const playerMissiles = [];
export const muzzleFlashPool = [];
export const impactFlashPool = [];
export const deathExplosionPool = [];

const flightBeamAxis = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
const bulletTrailTemp = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;

let deps = null;

export function configureWeapons(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Weapons module not configured');
  return deps;
}

export function deactivateCombatObject(object) {
  if (!object) return;
  object.visible = false;
  object.userData.active = false;
  object.userData.life = 0;
  if (object.userData.trail) object.userData.trail.visible = false;
  if (object.userData.exhaust) object.userData.exhaust.visible = false;
}

export function createWeaponProjectilePools({ THREE: ThreeRef = THREE, gameRoot, maxPlayerBullets, maxEnemyBullets, maxPlayerMissiles, playerLaserStreakLength, playerLaserTrailPoints, playerLaserMaxDistanceSq }) {
  const playerBulletGeo = new ThreeRef.CylinderGeometry(0.026, 0.026, playerLaserStreakLength, 6);
  const playerBulletMat = new ThreeRef.MeshBasicMaterial({ color: 0x66ff44, transparent: true, opacity: 0.98, blending: ThreeRef.AdditiveBlending, depthWrite: false });
  const tracerMat = new ThreeRef.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.72, blending: ThreeRef.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < maxPlayerBullets; i++) {
    const bullet = new ThreeRef.Mesh(playerBulletGeo, playerBulletMat.clone());
    bullet.visible = false;
    const trailGeometry = new ThreeRef.BufferGeometry();
    trailGeometry.setAttribute('position', new ThreeRef.BufferAttribute(new Float32Array(playerLaserTrailPoints * 3), 3));
    const trail = new ThreeRef.Line(trailGeometry, tracerMat.clone());
    trail.visible = false;
    bullet.userData = {
      active: false,
      velocity: new ThreeRef.Vector3(),
      life: 0,
      radius: 0.22,
      maxDistanceSq: playerLaserMaxDistanceSq,
      trail,
      trailPositions: Array.from({ length: playerLaserTrailPoints }, () => new ThreeRef.Vector3()),
      trailCursor: 0,
      trailPrimed: false
    };
    gameRoot.add(bullet);
    gameRoot.add(trail);
    playerBullets.push(bullet);
  }

  const enemyBulletGeo = new ThreeRef.CylinderGeometry(0.026, 0.026, 1.55, 6);
  const enemyBulletMat = new ThreeRef.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.9, blending: ThreeRef.AdditiveBlending });
  for (let i = 0; i < maxEnemyBullets; i++) {
    const bullet = new ThreeRef.Mesh(enemyBulletGeo, enemyBulletMat.clone());
    bullet.visible = false;
    bullet.userData = { active: false, velocity: new ThreeRef.Vector3(), life: 0, radius: 0.2 };
    gameRoot.add(bullet);
    enemyBullets.push(bullet);
  }

  const missileGeo = new ThreeRef.ConeGeometry(0.09, 0.72, 8);
  const missileMat = new ThreeRef.MeshBasicMaterial({ color: 0xfff2cf, wireframe: true, transparent: true, opacity: 0.95 });
  for (let i = 0; i < maxPlayerMissiles; i++) {
    const missile = new ThreeRef.Mesh(missileGeo, missileMat.clone());
    missile.visible = false;
    missile.userData = { active: false, velocity: new ThreeRef.Vector3(), life: 0, radius: 0.36, target: null };
    createMissileExhaust(missile, ThreeRef);
    gameRoot.add(missile);
    playerMissiles.push(missile);
  }
}

export function createMissileExhaust(missile, ThreeRef = THREE) {
  const exhaustGeo = new ThreeRef.BufferGeometry();
  const positions = new Float32Array(24 * 3);
  const speeds = new Float32Array(24);
  for (let i = 0; i < 24; i += 1) {
    const offset = i * 3;
    positions[offset] = (Math.random() - 0.5) * 0.08;
    positions[offset + 1] = -0.28 - Math.random() * 0.9;
    positions[offset + 2] = (Math.random() - 0.5) * 0.08;
    speeds[i] = 0.6 + Math.random() * 1.2;
  }
  exhaustGeo.setAttribute('position', new ThreeRef.BufferAttribute(positions, 3));
  const exhaust = new ThreeRef.Points(exhaustGeo, new ThreeRef.PointsMaterial({
    color: 0xff6600,
    size: 0.08,
    transparent: true,
    opacity: 0.78,
    blending: ThreeRef.AdditiveBlending,
    depthWrite: false
  }));
  exhaust.userData = { positions, speeds };
  missile.add(exhaust);
  missile.userData.exhaust = exhaust;
}

export function createWeaponVfxPools({ THREE: ThreeRef = THREE, gameRoot }) {
  for (let i = 0; i < 4; i += 1) {
    const light = new ThreeRef.PointLight(0xffcc00, 0, 6, 2);
    light.visible = false;
    light.userData = { active: false, frames: 0, maxFrames: 3 };
    gameRoot.add(light);
    muzzleFlashPool.push(light);
  }

  const impactGeo = new ThreeRef.TorusGeometry(0.1, 0.02, 4, 12);
  for (let i = 0; i < 6; i += 1) {
    const impact = new ThreeRef.Mesh(impactGeo, new ThreeRef.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0,
      blending: ThreeRef.AdditiveBlending,
      depthWrite: false
    }));
    impact.visible = false;
    impact.userData = { active: false, frames: 0, maxFrames: 8 };
    gameRoot.add(impact);
    impactFlashPool.push(impact);
  }

  const deathGeo = new ThreeRef.SphereGeometry(0.4, 6, 6);
  for (let i = 0; i < 4; i += 1) {
    const explosion = new ThreeRef.Mesh(deathGeo, new ThreeRef.MeshBasicMaterial({
      color: 0xff2200,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: ThreeRef.AdditiveBlending,
      depthWrite: false
    }));
    explosion.visible = false;
    explosion.userData = { active: false, frames: 0, maxFrames: 18 };
    gameRoot.add(explosion);
    deathExplosionPool.push(explosion);
  }
}

function warnVfxPoolExhausted(name) {
  console.warn(`VFX pool exhausted: ${name}`);
}

export function triggerMuzzleFlash(position) {
  const light = muzzleFlashPool.find(item => !item.userData.active);
  if (!light) {
    warnVfxPoolExhausted('muzzle flashes');
    return;
  }
  light.position.copy(position);
  light.intensity = 2.2;
  light.userData.frames = light.userData.maxFrames;
  light.userData.active = true;
  light.visible = true;
}

export function triggerImpactFlash(position) {
  const { camera } = requireDeps();
  const impact = impactFlashPool.find(item => !item.userData.active);
  if (!impact) {
    warnVfxPoolExhausted('impact flashes');
    return;
  }
  impact.position.copy(position);
  impact.lookAt(camera.position);
  impact.scale.setScalar(0.1);
  impact.material.opacity = 1;
  impact.userData.frames = impact.userData.maxFrames;
  impact.userData.active = true;
  impact.visible = true;
}

export function triggerDeathExplosion(position) {
  const { gameRoot } = requireDeps();
  if (!position || !gameRoot) return;
  const explosion = deathExplosionPool.find(item => !item.userData.active);
  if (!explosion) {
    warnVfxPoolExhausted('death explosions');
    return;
  }
  explosion.position.copy(position);
  explosion.scale.setScalar(0.4);
  explosion.material.opacity = 1;
  explosion.userData.frames = explosion.userData.maxFrames;
  explosion.userData.active = true;
  explosion.visible = true;
}

export function updateWeaponVfxPools() {
  muzzleFlashPool.forEach(light => {
    if (!light.userData.active) return;
    light.userData.frames -= 1;
    light.intensity = 2.2 * Math.max(0, light.userData.frames / light.userData.maxFrames);
    if (light.userData.frames <= 0) {
      light.visible = false;
      light.userData.active = false;
      light.intensity = 0;
    }
  });

  impactFlashPool.forEach(impact => {
    if (!impact.userData.active) return;
    const age = impact.userData.maxFrames - impact.userData.frames;
    const t = age / impact.userData.maxFrames;
    impact.scale.setScalar(0.1 + 1.7 * t);
    impact.material.opacity = Math.max(0, 1 - t);
    impact.userData.frames -= 1;
    if (impact.userData.frames <= 0) {
      impact.visible = false;
      impact.userData.active = false;
      impact.material.opacity = 0;
    }
  });

  deathExplosionPool.forEach(explosion => {
    if (!explosion.userData.active) return;
    const age = explosion.userData.maxFrames - explosion.userData.frames;
    const t = age / explosion.userData.maxFrames;
    explosion.scale.setScalar(0.4 + 3.1 * t);
    explosion.material.opacity = Math.max(0, 1 - t);
    explosion.userData.frames -= 1;
    if (explosion.userData.frames <= 0) {
      explosion.visible = false;
      explosion.userData.active = false;
      explosion.material.opacity = 0;
    }
  });
}

export function resetWeaponVfxPools() {
  muzzleFlashPool.forEach(light => { light.visible = false; light.userData.active = false; light.intensity = 0; });
  impactFlashPool.forEach(impact => { impact.visible = false; impact.userData.active = false; impact.material.opacity = 0; });
  deathExplosionPool.forEach(explosion => { explosion.visible = false; explosion.userData.active = false; explosion.material.opacity = 0; });
}

export function getWeaponDirection(spreadAngle = 0) {
  const { flightForward, flightRight, flightUp, flightTempVec2 } = requireDeps();
  flightTempVec2.copy(flightForward);
  if (spreadAngle > 0) {
    flightTempVec2
      .addScaledVector(flightRight, (Math.random() - 0.5) * spreadAngle)
      .addScaledVector(flightUp, (Math.random() - 0.5) * spreadAngle)
      .normalize();
  }
  return flightTempVec2;
}

export function fireBullet(pool, origin, direction, speed, life, options = {}) {
  const { playerLaserMaxDistanceSq } = requireDeps();
  const bullet = pool.find(item => !item.userData.active);
  if (!bullet) return false;
  bullet.position.copy(origin);
  bullet.userData.velocity.copy(direction).multiplyScalar(speed);
  bullet.userData.life = life;
  bullet.userData.damage = options.damage ?? 12;
  bullet.userData.maxDistanceSq = options.maxDistanceSq ?? (pool === playerBullets ? playerLaserMaxDistanceSq : 3600);
  bullet.userData.active = true;
  if (bullet.userData.trailPositions) {
    bullet.userData.trailPositions.forEach((point, idx) => {
      point.copy(origin).addScaledVector(direction, -idx * 2.2);
    });
    bullet.userData.trailCursor = 0;
    bullet.userData.trailPrimed = true;
    bullet.userData.trail.visible = pool === playerBullets;
    updateBulletTrail(bullet);
  }
  if (options.color && bullet.material?.color) bullet.material.color.setHex(options.color);
  bullet.quaternion.setFromUnitVectors(flightBeamAxis, direction);
  bullet.visible = true;
  if (pool === playerBullets) triggerMuzzleFlash(origin);
  return true;
}

export function fireMissile(origin, direction, options = {}) {
  const missile = playerMissiles.find(item => !item.userData.active);
  if (!missile) return false;
  missile.position.copy(origin);
  missile.userData.velocity.copy(direction).multiplyScalar(options.speed ?? 17);
  missile.userData.life = options.life ?? 4.2;
  missile.userData.damage = options.damage ?? 60;
  missile.userData.target = findNearestEnemy();
  missile.userData.active = true;
  if (missile.userData.exhaust) missile.userData.exhaust.visible = true;
  if (options.color && missile.material?.color) missile.material.color.setHex(options.color);
  missile.quaternion.setFromUnitVectors(flightBeamAxis, direction);
  missile.visible = true;
  triggerMuzzleFlash(origin);
  return true;
}

export function findNearestEnemy() {
  const { enemies, flightState } = requireDeps();
  let nearest = null;
  let nearestDist = Infinity;
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0) return;
    const dist = enemy.position.distanceToSquared(flightState.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  });
  return nearest;
}

export function applyEmpBurst(origin, weapon) {
  const { enemies, flightState, applyEnemyHit } = requireDeps();
  let hitCount = 0;
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0) return;
    if (enemy.position.distanceTo(origin) > weapon.aoeRadius) return;
    enemy.userData.stunUntil = performance.now() + (weapon.stunDuration ?? 1200);
    applyEnemyHit(enemy, weapon.damage);
    hitCount += 1;
  });
  flightState.status = hitCount ? `EMP BURST - ${hitCount} CONTACTS STUNNED` : 'EMP BURST - NO CONTACTS';
  flightState.statusUntil = performance.now() + 1600;
  return true;
}

export function firePrimaryWeapon(time) {
  const { flightForward, flightHeatBar, flightState, flightTempVec, loadoutState, skillTree } = requireDeps();
  const weapon = loadoutState.getWeapon('primary') || getWeaponDef('laser_mk1');
  if (time - flightState.lastShot <= skillTree.getPrimaryCooldown(weapon)) return;
  if (combatState.overheated) {
    flightState.status = 'WEAPONS OFFLINE - COOLING';
    if (flightHeatBar) flightHeatBar.classList.add('heat-over');
    flightState.lastShot = time;
    return;
  }
  if (flightState.ammo < weapon.ammoCost) {
    flightState.status = 'LASER AMMO EMPTY // LAND TO RESTOCK';
  } else if (flightState.energy < weapon.energyCost) {
    flightState.status = 'ENERGY LOW';
  } else if (weapon.type === 'area') {
    flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.2);
    if (applyEmpBurst(flightTempVec, weapon)) {
      flightState.energy = Math.max(0, flightState.energy - weapon.energyCost);
      applyHeatShot(combatState, weapon.overheatBuildup);
    }
  } else {
    const pellets = Math.max(1, weapon.pellets || 1);
    let fired = 0;
    for (let i = 0; i < pellets; i++) {
      flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 0.85);
      const direction = getWeaponDirection(weapon.spreadAngle);
      if (fireBullet(playerBullets, flightTempVec, direction, weapon.projectileSpeed, weapon.projectileLife / 1000, { damage: weapon.damage, color: weapon.color })) fired += 1;
    }
    if (fired > 0) {
      sfxEngine.playFlat('laser', { volume: 0.6 });
      flightState.ammo = Math.max(0, flightState.ammo - weapon.ammoCost);
      flightState.energy = Math.max(0, flightState.energy - weapon.energyCost);
      applyHeatShot(combatState, weapon.overheatBuildup);
    }
  }
  flightState.lastShot = time;
}

export function fireSecondaryWeapon(time) {
  const { combatAudio, flightForward, flightState, flightTempVec, getVoicePersona, loadoutState } = requireDeps();
  const weapon = loadoutState.getWeapon('secondary') || getWeaponDef('missile_rack');
  if (time - flightState.lastMissile <= weapon.cooldown) return;
  if (weapon.type === 'area') {
    if (flightState.energy < weapon.energyCost) {
      flightState.status = 'EMP ENERGY LOW';
    } else {
      flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.2);
      if (applyEmpBurst(flightTempVec, weapon)) flightState.energy = Math.max(0, flightState.energy - weapon.energyCost);
    }
    flightState.lastMissile = time;
    return;
  }
  if (flightState.missiles <= 0) {
    flightState.status = 'MISSILES EMPTY // LAND TO RESTOCK';
  } else if (flightState.energy < weapon.energyCost) {
    flightState.status = 'MISSILE ENERGY LOW';
  } else {
    const count = Math.max(1, weapon.missileCount || 1);
    let fired = 0;
    for (let i = 0; i < count && flightState.missiles > 0; i++) {
      flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.05 + i * 0.08);
      const direction = getWeaponDirection(count > 1 ? 0.045 : 0);
      if (fireMissile(flightTempVec, direction, { speed: weapon.projectileSpeed, life: weapon.projectileLife / 1000, damage: weapon.damage, color: weapon.color })) {
        fired += 1;
        flightState.missiles -= 1;
      }
    }
    if (fired > 0) {
      sfxEngine.playFlat('missile', { volume: 0.7 });
      flightState.energy = Math.max(0, flightState.energy - weapon.energyCost);
      flightState.status = count > 1 ? 'MISSILES AWAY' : 'MISSILE AWAY';
      combatAudio.bark('FOX TWO', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' });
    }
  }
  flightState.lastMissile = time;
}

export function updateBullet(bullet, dt) {
  const { flightState } = requireDeps();
  if (!bullet.userData.active) return;
  bullet.position.addScaledVector(bullet.userData.velocity, dt);
  updateBulletTrail(bullet);
  bullet.userData.life -= dt;
  if (bullet.userData.life <= 0 || bullet.position.distanceToSquared(flightState.pos) > (bullet.userData.maxDistanceSq ?? 3600)) {
    deactivateCombatObject(bullet);
  }
}

export function updateBulletTrail(bullet) {
  const trail = bullet.userData.trail;
  const points = bullet.userData.trailPositions;
  if (!trail || !points || !bullet.userData.trailPrimed) return;
  bullet.userData.trailCursor = (bullet.userData.trailCursor + 1) % points.length;
  points[bullet.userData.trailCursor].copy(bullet.position);
  const positionArray = trail.geometry.attributes.position.array;
  for (let i = 0; i < points.length; i += 1) {
    const source = points[(bullet.userData.trailCursor + 1 + i) % points.length];
    const offset = i * 3;
    bulletTrailTemp.copy(source);
    positionArray[offset] = bulletTrailTemp.x;
    positionArray[offset + 1] = bulletTrailTemp.y;
    positionArray[offset + 2] = bulletTrailTemp.z;
  }
  trail.geometry.attributes.position.needsUpdate = true;
}

export function updateMissile(missile, dt) {
  const { flightState, flightTempVec } = requireDeps();
  if (!missile.userData.active) return;
  const target = missile.userData.target && missile.userData.target.userData.active ? missile.userData.target : findNearestEnemy();
  missile.userData.target = target;
  if (target) {
    flightTempVec.copy(target.position).sub(missile.position).normalize();
    missile.userData.velocity.lerp(flightTempVec.multiplyScalar(24), 0.045);
  }
  missile.position.addScaledVector(missile.userData.velocity, dt);
  updateMissileExhaust(missile, dt);
  if (missile.userData.velocity.lengthSq() > 0.001) {
    flightTempVec.copy(missile.userData.velocity).normalize();
    missile.quaternion.setFromUnitVectors(flightBeamAxis, flightTempVec);
  }
  missile.userData.life -= dt;
  if (missile.userData.life <= 0 || missile.position.distanceToSquared(flightState.pos) > 4900) {
    deactivateCombatObject(missile);
  }
}

export function updateMissileExhaust(missile, dt) {
  const exhaust = missile.userData.exhaust;
  if (!exhaust) return;
  const positions = exhaust.userData.positions;
  const speeds = exhaust.userData.speeds;
  for (let i = 0; i < 24; i += 1) {
    const offset = i * 3;
    positions[offset + 1] -= speeds[i] * dt;
    positions[offset] *= 1.015;
    positions[offset + 2] *= 1.015;
    if (positions[offset + 1] < -1.2) {
      positions[offset] = (Math.random() - 0.5) * 0.08;
      positions[offset + 1] = -0.28;
      positions[offset + 2] = (Math.random() - 0.5) * 0.08;
    }
  }
  exhaust.geometry.attributes.position.needsUpdate = true;
}

export {
  applyEnemyHit,
  applyPlayerDamage,
  buildEnemyFromClass,
  buildEnemyGeometry,
  buildEnemyHealthPips,
  buildEnemyMaterial,
  checkBossSpawnThreshold,
  configureEnemies,
  createEnemyPool,
  enemies,
  getEnemyDamageUnits,
  handleBossDeath,
  spawnEnemy,
  triggerBossEncounter,
  updateCombatObjects,
  updateBossAttackPhase,
  updateEnemyHealthPips
} from './enemies.js';

export {
  applyEmpBurst,
  configureWeapons,
  createMissileExhaust,
  createWeaponProjectilePools,
  createWeaponVfxPools,
  deactivateCombatObject,
  deathExplosionPool,
  enemyBullets,
  findNearestEnemy,
  fireBullet,
  fireMissile,
  firePrimaryWeapon,
  fireSecondaryWeapon,
  getWeaponDirection,
  impactFlashPool,
  muzzleFlashPool,
  playerBullets,
  playerMissiles,
  resetWeaponVfxPools,
  triggerDeathExplosion,
  triggerImpactFlash,
  triggerMuzzleFlash,
  updateBullet,
  updateBulletTrail,
  updateMissile,
  updateMissileExhaust,
  updateWeaponVfxPools
} from './weapons.js';

import { createEnemyPool } from './enemies.js';
import { createWeaponProjectilePools, createWeaponVfxPools } from './weapons.js';

let combatSceneDeps = null;

export function configureCombatScene(options = {}) {
  combatSceneDeps = options;
}

function requireSceneDeps() {
  if (!combatSceneDeps) throw new Error('Combat scene module not configured');
  return combatSceneDeps;
}

export function createFlightGameObjects(options = {}) {
  const deps = { ...requireSceneDeps(), ...options };
  const {
    THREE,
    scene,
    maxEnemies,
    maxPlayerBullets,
    maxEnemyBullets,
    maxPlayerMissiles,
    playerLaserStreakLength,
    playerLaserTrailPoints,
    playerLaserMaxDistanceSq
  } = deps;

  const gameRoot = new THREE.Group();
  gameRoot.visible = false;
  scene.add(gameRoot);

  const playerShip = new THREE.Group();
  const hullMat = new THREE.MeshBasicMaterial({ color: 0xdce7ff, wireframe: true, transparent: true, opacity: 0.92 });
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.72 });
  const engineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.72 });
  const weaponMat = new THREE.MeshBasicMaterial({ color: 0xff3355, wireframe: true, transparent: true, opacity: 0.82 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.45, 6), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = -0.05;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.72, 6), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.92;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.2), hullMat);
  tail.position.z = 0.68;
  playerShip.add(fuselage, nose, tail);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), engineMat);
  cockpit.scale.set(0.85, 0.48, 1.25);
  cockpit.position.set(0, 0.13, -0.42);
  playerShip.add(cockpit);

  const foilGeo = new THREE.BoxGeometry(0.92, 0.035, 0.25);
  const engineGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.36, 8);
  const cannonGeo = new THREE.BoxGeometry(0.025, 0.025, 0.82);
  [-1, 1].forEach(side => {
    [-1, 1].forEach(layer => {
      const foil = new THREE.Mesh(foilGeo, wingMat);
      foil.position.set(side * 0.52, layer * 0.13, 0.04);
      foil.rotation.z = side * layer * 0.24;
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.38, layer * 0.11, 0.31);
      const cannon = new THREE.Mesh(cannonGeo, weaponMat);
      cannon.position.set(side * 0.93, layer * 0.22, -0.12);
      playerShip.add(foil, engine, cannon);
    });
  });
  gameRoot.add(playerShip);

  createEnemyPool({ THREE, gameRoot, maxEnemies });
  createWeaponProjectilePools({
    THREE,
    gameRoot,
    maxPlayerBullets,
    maxEnemyBullets,
    maxPlayerMissiles,
    playerLaserStreakLength,
    playerLaserTrailPoints,
    playerLaserMaxDistanceSq
  });

  const navLineGeo = new THREE.BufferGeometry();
  navLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const flightNavLine = new THREE.Line(
    navLineGeo,
    new THREE.LineBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    })
  );
  flightNavLine.visible = false;
  gameRoot.add(flightNavLine);
  createWeaponVfxPools({ THREE, gameRoot });

  return { gameRoot, playerShip, flightNavLine };
}

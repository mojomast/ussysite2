import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= {};
globalThis.document ??= { getElementById: () => null };
class TestObject3D {
  constructor() {
    this.children = [];
    this.position = new globalThis.THREE.Vector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1, setScalar: value => { this.scale.x = value; this.scale.y = value; this.scale.z = value; } };
    this.userData = {};
    this.visible = true;
  }
  add(...children) { this.children.push(...children); }
  remove(child) { this.children = this.children.filter(item => item !== child); }
  lookAt() {}
  rotateOnAxis(axis, angle) { this.userData.lastRotation = { axis, angle }; }
}

class TestMaterial {
  constructor(options = {}) {
    this.opacity = options.opacity ?? 1;
    this.transparent = options.transparent;
    this.wireframe = options.wireframe;
    this.color = { value: options.color, setHex: value => { this.color.value = value; }, copy: color => { this.color.value = color.value ?? color; } };
  }
  clone() { return new TestMaterial({ opacity: this.opacity, transparent: this.transparent, wireframe: this.wireframe, color: this.color.value }); }
}

globalThis.THREE = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    copy(vec) { this.x = vec.x; this.y = vec.y; this.z = vec.z; return this; }
    clone() { return new globalThis.THREE.Vector3(this.x, this.y, this.z); }
    sub(vec) { this.x -= vec.x; this.y -= vec.y; this.z -= vec.z; return this; }
    addScaledVector(vec, scale) { this.x += vec.x * scale; this.y += vec.y * scale; this.z += vec.z * scale; return this; }
    multiplyScalar(scale) { this.x *= scale; this.y *= scale; this.z *= scale; return this; }
    distanceToSquared(vec) { const x = this.x - vec.x; const y = this.y - vec.y; const z = this.z - vec.z; return x * x + y * y + z * z; }
    normalize() {
      const len = this.length() || 1;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    }
  },
  Group: class extends TestObject3D {},
  Mesh: class extends TestObject3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  PointLight: class extends TestObject3D { constructor(color, intensity = 0) { super(); this.color = { value: color, copy: next => { this.color.value = next.value ?? next; } }; this.intensity = intensity; } },
  MeshBasicMaterial: TestMaterial,
  Color: class { constructor(value) { this.value = value; } },
  ConeGeometry: class {},
  BoxGeometry: class {},
  OctahedronGeometry: class {},
  SphereGeometry: class {}
};

const { FORMATION_ROLES } = await import('../js/flight/combat-overhaul.js');
const {
  DREADNOUGHT_SCALE,
  ENEMY_BASE_RADIUS,
  applyBossOverrides,
  applyEliteStrafe,
  applyEnemyScaleForClass,
  applyPhantomOpacityFlicker,
  applySpawnApproachBurst,
  assignFormationRole,
  assignRotationAxis,
  assignRotationRate,
  checkBossSpawnThreshold,
  checkBountyHunterSpawn,
  checkFriendlyEscortSpawn,
  configureEnemies,
  getFriendlyEscortOrbitPosition,
  handleBossDeath,
  restoreEnemyOpacity,
  setEnemyEngineGlowInactive,
  spawnEnemy,
  tryDeployGunboatTurret,
  tryEliteCloak,
  tryPhantomSplit,
  updateBossAttackPhase,
  updateEnemyEngineGlow
} = await import('../js/flight/enemies.js');
const { getEnemyClass } = await import('../js/flight/combat-overhaul.js');
const { BOSS_SCORE_THRESHOLDS, combatState, reset: resetCombatState } = await import('../js/flight/combat-state.js');
const { sfxEngine } = await import('../js/flight/sfx.js');
const { deactivateCombatObject } = await import('../js/flight/weapons.js');

test('assignFormationRole returns the expected first wave roles', () => {
  assert.equal(assignFormationRole(0), FORMATION_ROLES.AGGRESSOR);
  assert.equal(assignFormationRole(1), FORMATION_ROLES.FLANKER);
});

test('assignFormationRole picks support or flanker for later enemies', () => {
  assert.equal(assignFormationRole(2, () => 0.6), FORMATION_ROLES.SUPPORT);
  assert.equal(assignFormationRole(2, () => 0.5), FORMATION_ROLES.FLANKER);
});

test('assignRotationRate returns class-appropriate idle tumble rates', () => {
  const scoutRate = assignRotationRate({ id: 'scout' });
  assert.ok(scoutRate >= 0.84 && scoutRate <= 0.96);
  assert.equal(assignRotationRate({ id: 'dreadnought' }), 0);
});

test('assignRotationAxis returns normalized class axes', () => {
  ['scout', 'interceptor', 'gunboat', 'elite', 'dreadnought', 'phantom', 'unknown'].forEach(id => {
    const axis = assignRotationAxis({ id });
    assert.ok(Math.abs(axis.length() - 1) < 0.000001);
  });
});

test('applyEnemyScaleForClass scales dreadnoughts and resets regular enemies', () => {
  const enemy = new globalThis.THREE.Group();
  applyEnemyScaleForClass(enemy, { id: 'dreadnought' });
  assert.equal(enemy.scale.x, DREADNOUGHT_SCALE);
  assert.equal(enemy.userData.radius, ENEMY_BASE_RADIUS * DREADNOUGHT_SCALE);

  applyEnemyScaleForClass(enemy, { id: 'scout' });
  assert.equal(enemy.scale.x, 1);
  assert.equal(enemy.userData.radius, ENEMY_BASE_RADIUS);
});

test('spawnEnemy applies dreadnought scale and deactivation resets it', () => {
  const enemy = new globalThis.THREE.Group();
  configureEnemies({
    flightState: { pos: new globalThis.THREE.Vector3(), score: 0 },
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: () => {},
    ttsEngine: { speak: () => {} }
  });

  spawnEnemy(enemy, 0, 0, 'dreadnought');
  assert.equal(enemy.userData.classId, 'dreadnought');
  assert.equal(enemy.scale.x, DREADNOUGHT_SCALE);
  assert.equal(enemy.userData.radius, ENEMY_BASE_RADIUS * DREADNOUGHT_SCALE);

  deactivateCombatObject(enemy);
  assert.equal(enemy.scale.x, 1);
  assert.equal(enemy.userData.radius, ENEMY_BASE_RADIUS);
  assert.equal(enemy.userData.active, false);
});

test('checkBossSpawnThreshold increments threshold and spawns boss encounter', () => {
  const boss = new globalThis.THREE.Group();
  const messages = [];
  const killFeed = [];
  configureEnemies({
    addKillFeedEntry: entry => killFeed.push(entry),
    flightForward: new globalThis.THREE.Vector3(0, 0, -1),
    flightState: { pos: new globalThis.THREE.Vector3(), score: BOSS_SCORE_THRESHOLDS[0] },
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: message => messages.push(message.text),
    ttsEngine: { speak: () => {} },
    windowRef: { setTimeout: fn => fn() }
  });
  const state = { bossActive: false, bossEnemyRef: null, bossThresholdIdx: 0 };
  assert.equal(checkBossSpawnThreshold(state, [boss], { pos: new globalThis.THREE.Vector3(), score: BOSS_SCORE_THRESHOLDS[0] }), true);
  assert.equal(state.bossThresholdIdx, 1);
  assert.equal(state.bossEnemyRef, boss);
  assert.equal(boss.userData.isBoss, true);
  assert.equal(boss.userData.maxHealth, 18);
  assert.equal(boss.userData.maxShieldHp, 6);
  assert.equal(boss.scale.x, 3.2);
  assert.equal(boss.position.z, -80);
  assert.ok(messages.some(text => text.includes('HERMES-DREADNOUGHT')));
  assert.deepEqual(killFeed, ['DREADNOUGHT INBOUND', 'DREADNOUGHT SPAWNED']);
});

test('pending boss spawn is cancelled when combat state resets', () => {
  const boss = new globalThis.THREE.Group();
  const timers = [];
  configureEnemies({
    addKillFeedEntry: () => {},
    flightForward: new globalThis.THREE.Vector3(0, 0, -1),
    flightState: { pos: new globalThis.THREE.Vector3(), score: BOSS_SCORE_THRESHOLDS[0] },
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: () => {},
    ttsEngine: { speak: () => {} },
    windowRef: { setTimeout: fn => { timers.push(fn); } }
  });
  const state = { bossActive: false, bossEnemyRef: null, bossThresholdIdx: 0, bossSpawnGeneration: 0 };

  assert.equal(checkBossSpawnThreshold(state, [boss], { pos: new globalThis.THREE.Vector3(), score: BOSS_SCORE_THRESHOLDS[0] }), true);
  assert.equal(state.bossActive, true);
  resetCombatState(state);
  timers.forEach(fn => fn());

  assert.equal(state.bossActive, false);
  assert.equal(state.bossEnemyRef, null);
  assert.equal(boss.userData.isBoss, undefined);
  assert.equal(boss.userData.active, undefined);
});

test('updateBossAttackPhase changes boss burst pattern by hull ratio', () => {
  const boss = new globalThis.THREE.Group();
  applyBossOverrides(boss);
  boss.userData.health = 12;
  assert.equal(updateBossAttackPhase(boss, { health: 18 }, {}, 1000), 2);
  assert.equal(boss.userData.bossBurstCount, 6);
  assert.equal(boss.userData.bossFireCooldownMs, 700);
  assert.equal(boss.userData.bossPhaseChanged, true);

  boss.userData.bossPhaseChanged = false;
  boss.userData.health = 5;
  assert.equal(updateBossAttackPhase(boss, { health: 18 }, {}, 2000), 3);
  assert.equal(boss.userData.bossBurstCount, 8);
  assert.equal(boss.userData.bossFireCooldownMs, 500);
});

test('handleBossDeath clears boss state and awards score', () => {
  const boss = new globalThis.THREE.Group();
  applyBossOverrides(boss);
  boss.userData.active = true;
  const state = { bossActive: true, bossEnemyRef: boss };
  const flightState = { score: 20 };
  let credits = 0;
  const killFeed = [];
  assert.equal(handleBossDeath(state, boss, flightState, { addCombatCredits: value => { credits += value; }, addKillFeedEntry: entry => killFeed.push(entry), showGameMessage: () => {} }), true);
  assert.equal(state.bossActive, false);
  assert.equal(state.bossEnemyRef, null);
  assert.equal(flightState.score, 1220);
  assert.equal(credits, 1200);
  assert.deepEqual(killFeed, ['DREADNOUGHT DESTROYED +1200CR']);
  assert.equal(boss.userData.active, false);
});

test('engine glow remains dark while inactive and pulses when active', () => {
  const enemy = new globalThis.THREE.Group();
  enemy.userData.active = false;
  enemy.userData.engineGlow = { intensity: 4 };
  setEnemyEngineGlowInactive(enemy);
  assert.equal(enemy.userData.engineGlow.intensity, 0);

  enemy.userData.active = true;
  enemy.visible = true;
  enemy.userData.phantomPhase = 0;
  const intensity = updateEnemyEngineGlow(enemy, { id: 'scout' }, 0.25);
  assert.ok(intensity > 0);
  assert.equal(enemy.userData.engineGlow.intensity, intensity);
});

test('phantom opacity flicker clamps body opacity at or above 0.12', () => {
  const bodyMaterial = { opacity: 0 };
  const wingMaterial = { opacity: 0 };
  const enemy = new globalThis.THREE.Group();
  const modelRoot = new globalThis.THREE.Group();
  const wing = new globalThis.THREE.Mesh(null, wingMaterial);
  modelRoot.add(wing);
  enemy.add(modelRoot);
  enemy.userData.bodyMaterial = bodyMaterial;
  enemy.userData.phantomPhase = Math.PI;

  for (let i = 0; i < 200; i += 1) {
    const opacity = applyPhantomOpacityFlicker(enemy, i * 0.1);
    assert.ok(opacity >= 0.12);
    assert.ok(bodyMaterial.opacity >= 0.12);
    assert.ok(wingMaterial.opacity >= 0.08);
  }
});

test('spawn approach burst clears state and lunges toward the player', () => {
  const enemy = new globalThis.THREE.Group();
  enemy.position.set(10, 0, 0);
  enemy.userData.spawnApproach = true;
  enemy.userData.velocity = new globalThis.THREE.Vector3();
  const speed = applySpawnApproachBurst(enemy, { pos: new globalThis.THREE.Vector3(0, 0, 0) }, { approachSpeed: { far: 20 } }, 0.016);

  assert.equal(speed, 44);
  assert.equal(enemy.userData.spawnApproach, false);
  assert.ok(enemy.userData.velocity.x < 0);
  assert.ok(enemy.position.x < 10);
});

test('elite strafe moves non-support elites along flightRight only', () => {
  const enemy = new globalThis.THREE.Group();
  enemy.userData.phantomPhase = Math.PI / 2;
  const delta = applyEliteStrafe(
    enemy,
    { id: 'elite' },
    FORMATION_ROLES.AGGRESSOR,
    new globalThis.THREE.Vector3(1, 0, 0),
    0,
    1
  );

  assert.equal(delta, 4.5);
  assert.equal(enemy.position.x, 4.5);

  const supportDelta = applyEliteStrafe(enemy, { id: 'elite' }, FORMATION_ROLES.SUPPORT, new globalThis.THREE.Vector3(1, 0, 0), 0, 1);
  assert.equal(supportDelta, 0);
});

test('bounty hunter spawn respects security, boss, active, and random guards', () => {
  const enemy = new globalThis.THREE.Group();
  const rep = { scores: { security: -31 } };
  const state = { bossActive: false, activeBountyHunter: null };
  const flightState = { pos: new globalThis.THREE.Vector3(), score: 0 };
  const originalRandom = Math.random;
  configureEnemies({
    flightState,
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: () => {},
    ttsEngine: { speak: () => {} },
    addKillFeedEntry: () => {}
  });

  try {
    Math.random = () => 0.5;
    assert.equal(checkBountyHunterSpawn(rep, state, [enemy], flightState), false);
    Math.random = () => 0;
    assert.equal(checkBountyHunterSpawn({ scores: { security: -30 } }, state, [enemy], flightState), false);
    assert.equal(checkBountyHunterSpawn(rep, { ...state, bossActive: true }, [enemy], flightState), false);
    assert.equal(checkBountyHunterSpawn(rep, { ...state, activeBountyHunter: enemy }, [enemy], flightState), false);

    assert.equal(checkBountyHunterSpawn(rep, state, [enemy], flightState), true);
    assert.equal(state.activeBountyHunter, enemy);
    assert.equal(enemy.userData.isBountyHunter, true);
    assert.equal(enemy.userData.health, 4);
    assert.equal(enemy.userData.reward, 220);
  } finally {
    Math.random = originalRandom;
  }
});

test('friendly escort spawn respects security, active, and random guards', () => {
  const enemy = new globalThis.THREE.Group();
  const rep = { scores: { security: 41 } };
  const state = { activeFriendlyEscort: null };
  const flightState = { pos: new globalThis.THREE.Vector3(), score: 0 };
  const originalRandom = Math.random;
  configureEnemies({
    flightState,
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: () => {},
    ttsEngine: { speak: () => {} },
    addKillFeedEntry: () => {}
  });

  try {
    Math.random = () => 0.5;
    assert.equal(checkFriendlyEscortSpawn(rep, state, [enemy], flightState), false);
    Math.random = () => 0;
    assert.equal(checkFriendlyEscortSpawn({ scores: { security: 40 } }, state, [enemy], flightState), false);
    assert.equal(checkFriendlyEscortSpawn(rep, { activeFriendlyEscort: enemy }, [enemy], flightState), false);

    assert.equal(checkFriendlyEscortSpawn(rep, state, [enemy], flightState), true);
    assert.equal(state.activeFriendlyEscort, enemy);
    assert.equal(enemy.userData.isFriendly, true);
    assert.equal(enemy.userData.teamColor, 0x44ff88);
    assert.equal(enemy.userData.health, 3);
  } finally {
    Math.random = originalRandom;
  }
});

test('friendly escort orbit helper returns expected quarter positions', () => {
  const player = new globalThis.THREE.Vector3(1, 2, 3);
  const start = getFriendlyEscortOrbitPosition(player, 0, 12);
  assert.equal(start.x, 13);
  assert.equal(start.y, 2);
  assert.equal(start.z, 3);

  const quarter = getFriendlyEscortOrbitPosition(player, Math.PI / 2, 12);
  assert.ok(Math.abs(quarter.x - 1) < 0.000001);
  assert.ok(Math.abs(quarter.y - (2 + Math.sin(Math.PI / 4) * 3)) < 0.000001);
  assert.equal(quarter.z, 15);
});

test('combat reset clears active turrets', () => {
  combatState.activeTurrets.push(new globalThis.THREE.Group());
  resetCombatState(combatState);
  assert.deepEqual(combatState.activeTurrets, []);
});

test('gunboat deploys an inactive pooled turret on first burst only', () => {
  const gunboat = new globalThis.THREE.Group();
  const turret = new globalThis.THREE.Group();
  const other = new globalThis.THREE.Group();
  const cls = getEnemyClass('gunboat');
  gunboat.position.set(10, 20, 30);
  gunboat.userData = { active: true, classId: 'gunboat', burstRemaining: cls.burstCount };
  turret.userData = { active: false };
  other.userData = { active: false };
  const state = { activeTurrets: [] };
  const random = Math.random;
  Math.random = () => 0;
  try {
    const deployed = tryDeployGunboatTurret(gunboat, [gunboat, turret, other], state, { pos: new globalThis.THREE.Vector3() });
    assert.equal(deployed, turret);
    assert.equal(turret.userData.active, true);
    assert.equal(turret.userData.classId, 'gunboat');
    assert.equal(turret.userData.isTurret, true);
    assert.equal(turret.userData.health, 1);
    assert.equal(turret.userData.maxHealth, 1);
    assert.equal(turret.userData.rotationRate, 0);
    assert.equal(turret.userData.velocity.length(), 0);
    assert.equal(state.activeTurrets.length, 1);
    assert.notEqual(deployed, gunboat);

    gunboat.userData.burstRemaining = cls.burstCount - 1;
    assert.equal(tryDeployGunboatTurret(gunboat, [gunboat, turret, other], state), null);
  } finally {
    Math.random = random;
  }
});

test('gunboat turret deployment respects max active turret cap', () => {
  const gunboat = new globalThis.THREE.Group();
  const spare = new globalThis.THREE.Group();
  const activeA = new globalThis.THREE.Group();
  const activeB = new globalThis.THREE.Group();
  const cls = getEnemyClass('gunboat');
  gunboat.userData = { active: true, classId: 'gunboat', burstRemaining: cls.burstCount };
  spare.userData = { active: false };
  activeA.userData = { active: true, isTurret: true };
  activeB.userData = { active: true, isTurret: true };
  const random = Math.random;
  Math.random = () => 0;
  try {
    assert.equal(tryDeployGunboatTurret(gunboat, [gunboat, spare], { activeTurrets: [activeA, activeB] }), null);
  } finally {
    Math.random = random;
  }
});

test('deactivating a turret removes it from activeTurrets', () => {
  const turret = new globalThis.THREE.Group();
  turret.userData = { active: true, isTurret: true, classId: 'gunboat' };
  combatState.activeTurrets.push(turret);
  deactivateCombatObject(turret);
  assert.equal(combatState.activeTurrets.includes(turret), false);
});

test('elite cloak triggers once below half health and restore resets material opacity', () => {
  const previousPlayFlat = sfxEngine.playFlat;
  let played = null;
  sfxEngine.playFlat = (type, options) => { played = { type, options }; return true; };
  try {
    const enemy = new globalThis.THREE.Group();
    const modelRoot = new globalThis.THREE.Group();
    const wing = new globalThis.THREE.Mesh(null, new globalThis.THREE.MeshBasicMaterial({ opacity: 0.78 }));
    const body = new globalThis.THREE.Mesh(null, new globalThis.THREE.MeshBasicMaterial({ opacity: 0.95 }));
    body.userData.enemyBody = true;
    modelRoot.add(wing, body);
    enemy.userData = {
      classId: 'elite',
      health: 1.5,
      maxHealth: 3,
      cloakUsed: false,
      bodyMaterial: body.material,
      modelRoot
    };

    assert.equal(tryEliteCloak(enemy, getEnemyClass('elite')), true);
    assert.equal(enemy.userData.cloakUsed, true);
    assert.ok(enemy.userData.cloakUntil > performance.now());
    assert.equal(body.material.opacity, 0.04);
    assert.equal(wing.material.opacity, 0.04);
    assert.deepEqual(played, { type: 'shield_hit', options: { volume: 0.4 } });
    assert.equal(tryEliteCloak(enemy, getEnemyClass('elite')), false);

    restoreEnemyOpacity(enemy);
    assert.equal(body.material.opacity, 0.95);
    assert.equal(wing.material.opacity, 0.78);
  } finally {
    sfxEngine.playFlat = previousPlayFlat;
  }
});

test('spawnEnemy initializes elite cloak state', () => {
  const enemy = new globalThis.THREE.Group();
  configureEnemies({
    flightState: { pos: new globalThis.THREE.Vector3(), score: 0 },
    getEnemyFireCooldown: () => 1000,
    getVoicePersona: () => ({}),
    missionState: { step: 'freeRoam' },
    showGameMessage: () => {},
    ttsEngine: { speak: () => {} }
  });

  spawnEnemy(enemy, 0, 0, 'elite');
  assert.equal(enemy.userData.cloakUsed, false);
  assert.equal(enemy.userData.cloakUntil, 0);
});

test('phantom split replaces first death with two non-chain child phantoms', () => {
  const parent = new globalThis.THREE.Group();
  const childA = new globalThis.THREE.Group();
  const childB = new globalThis.THREE.Group();
  const cls = getEnemyClass('phantom');
  parent.position.set(4, 5, 6);
  parent.userData = { active: true, classId: 'phantom', health: 0, maxHealth: 2 };
  childA.userData = { active: false };
  childB.userData = { active: false };

  assert.equal(tryPhantomSplit(parent, [parent, childA, childB], cls, { activeTurrets: [] }), true);
  assert.equal(parent.userData.active, false);
  [childA, childB].forEach(child => {
    assert.equal(child.userData.active, true);
    assert.equal(child.userData.classId, 'phantom');
    assert.equal(child.userData.health, 1);
    assert.equal(child.userData.maxHealth, 1);
    assert.equal(child.userData.isSplitChild, true);
    assert.equal(child.userData.splitDone, true);
    assert.equal(child.userData.reward, Math.floor(cls.creditReward / 2));
  });
  assert.equal(childA.position.x, 2.5);
  assert.equal(childB.position.x, 5.5);
  assert.equal(tryPhantomSplit(childA, [parent, childA, childB], cls, { activeTurrets: [] }), false);
});

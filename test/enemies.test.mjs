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
  applyEliteStrafe,
  applyEnemyScaleForClass,
  applyPhantomOpacityFlicker,
  applySpawnApproachBurst,
  assignFormationRole,
  assignRotationAxis,
  assignRotationRate,
  configureEnemies,
  setEnemyEngineGlowInactive,
  spawnEnemy,
  updateEnemyEngineGlow
} = await import('../js/flight/enemies.js');
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

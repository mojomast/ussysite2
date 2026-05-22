import test from 'node:test';
import assert from 'node:assert/strict';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  divideScalar(s) { this.x /= s; this.y /= s; this.z /= s; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  distanceToSquared(v) { const x = this.x - v.x; const y = this.y - v.y; const z = this.z - v.z; return x * x + y * y + z * z; }
  normalize() { return this.divideScalar(this.length() || 1); }
}

class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.userData = {};
    this.visible = true;
  }
  add(...children) { this.children.push(...children); }
  remove(child) { this.children = this.children.filter(item => item !== child); }
  lookAt(pos) { this.userData.lookAt = pos; }
}

class Material {
  constructor(options = {}) { Object.assign(this, options); }
}

class Geometry {}

globalThis.THREE = {
  Vector3,
  Group: class extends Object3D {},
  Mesh: class extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  PointLight: class extends Object3D { constructor(color, intensity = 0) { super(); this.color = color; this.intensity = intensity; } },
  MeshBasicMaterial: Material,
  BoxGeometry: Geometry,
  CylinderGeometry: Geometry,
  ConeGeometry: Geometry,
  OctahedronGeometry: Geometry
};

const {
  CIVILIAN_MAX,
  MAX_CIVILIAN_POOL,
  CIVILIAN_TYPES,
  buildCivilianMesh,
  createCivilianShip,
  disposeCivilians,
  getCivilianMapData,
  spawnCivilianFleet,
  updateCivilians
} = await import('../js/flight/civilians.js');
const { renderSystemMap } = await import('../js/flight/autopilot.js');

function navGraph() {
  return new Map([
    ['a', { id: 'a', type: 'station', pos: new Vector3(0, 0, 0), edges: [{ targetId: 'b', dist: 1000 }] }],
    ['b', { id: 'b', type: 'planet', pos: new Vector3(1000, 0, 0), edges: [{ targetId: 'a', dist: 1000 }, { targetId: 'c', dist: 1000 }] }],
    ['c', { id: 'c', type: 'jump', pos: new Vector3(2000, 0, 0), edges: [{ targetId: 'b', dist: 1000 }] }]
  ]);
}

function flightState() {
  return { pos: new Vector3(500, 0, 120), autopilot: { hyperspeedMult: 1 }, landed: false };
}

test('civilian type constants use requested cap and speeds', () => {
  assert.equal(CIVILIAN_MAX, 6);
  assert.equal(CIVILIAN_TYPES.FREIGHTER, 'FREIGHTER');
  assert.equal(createCivilianShip(CIVILIAN_TYPES.FREIGHTER, { THREE: globalThis.THREE }).speed, 80);
  assert.equal(createCivilianShip(CIVILIAN_TYPES.SHUTTLE, { THREE: globalThis.THREE }).speed, 140);
  assert.equal(createCivilianShip(CIVILIAN_TYPES.COURIER, { THREE: globalThis.THREE }).speed, 200);
});

test('buildCivilianMesh creates distinct primitive compositions', () => {
  assert.ok(buildCivilianMesh('freighter', { THREE: globalThis.THREE }).children.length > buildCivilianMesh('courier', { THREE: globalThis.THREE }).children.length);
  assert.equal(buildCivilianMesh('shuttle', { THREE: globalThis.THREE }).userData.civilianType, 'SHUTTLE');
  assert.equal(buildCivilianMesh('shuttle', { THREE: globalThis.THREE }).userData.isCivilian, true);
});

test('createCivilianShip exposes requested public object shape', () => {
  const ship = createCivilianShip(CIVILIAN_TYPES.COURIER, 'a', navGraph(), globalThis.THREE);
  assert.equal(ship.type, 'COURIER');
  assert.equal(ship.cruiseSpeed, 200);
  assert.equal(ship.faction, 'civilian');
  assert.equal(ship.combatant, false);
  assert.equal(ship.mesh, ship.object);
  assert.equal(ship.pos, ship.position);
  assert.equal(ship.vel, ship.velocity);
  assert.ok(Array.isArray(ship.route));
  assert.equal(ship.homeNodeId, 'a');
  assert.equal(ship.destNodeId, 'b');
  assert.equal(ship.currentLeg, 0);
  assert.equal(ship.object.userData.civilianShip, ship);
});

test('spawnCivilianFleet caps active civilian ships at six', () => {
  const root = new globalThis.THREE.Group();
  const state = flightState();
  const ships = spawnCivilianFleet({ THREE: globalThis.THREE, gameRoot: root, navGraph: navGraph(), flightState: state, random: () => 0.1 });
  assert.equal(ships.length, CIVILIAN_MAX);
  assert.equal(root.children.length, CIVILIAN_MAX);
  assert.equal(state.civilianTraffic.ships, ships);
});

test('fleet cap: active count enforced, not array length', () => {
  const root = new globalThis.THREE.Group();
  const state = flightState();
  const inactiveShips = Array.from({ length: CIVILIAN_MAX }, () => {
    const ship = createCivilianShip('freighter', { THREE: globalThis.THREE, dockedUntil: 0, state: 'TRANSIT' });
    ship.active = false;
    ship.visible = false;
    ship.object.visible = false;
    return ship;
  });
  state.civilianTraffic = { enabled: true, ships: inactiveShips, maxActive: CIVILIAN_MAX, mapContacts: [] };

  const ships = spawnCivilianFleet({ THREE: globalThis.THREE, gameRoot: root, navGraph: navGraph(), flightState: state, random: () => 0.1 });

  assert.equal(ships.length, CIVILIAN_MAX);
  assert.equal(ships.filter(ship => ship.active && ship.state !== 'DESTROYED').length, CIVILIAN_MAX);
  assert.equal(root.children.length, CIVILIAN_MAX);
});

test('spawnCivilianFleet reuses inactive pool slots and stops at hard pool cap', () => {
  const state = flightState();
  const ships = Array.from({ length: MAX_CIVILIAN_POOL }, () => {
    const ship = createCivilianShip('shuttle', { THREE: globalThis.THREE, dockedUntil: 0, state: 'TRANSIT' });
    ship.active = false;
    ship.visible = false;
    return ship;
  });
  state.civilianTraffic = { enabled: true, ships, maxActive: CIVILIAN_MAX, mapContacts: [] };

  spawnCivilianFleet({ THREE: globalThis.THREE, navGraph: navGraph(), flightState: state, random: () => 0.2 });

  assert.equal(state.civilianTraffic.ships.length, MAX_CIVILIAN_POOL);
  assert.equal(state.civilianTraffic.ships.filter(ship => ship.active && ship.state !== 'DESTROYED').length, CIVILIAN_MAX);
});

test('spawnCivilianFleet reduces cap during combat or hyperspeed', () => {
  const combatState = flightState();
  const ships = spawnCivilianFleet({
    THREE: globalThis.THREE,
    gameRoot: new globalThis.THREE.Group(),
    navGraph: navGraph(),
    flightState: combatState,
    enemies: [{ userData: { active: true }, position: new Vector3() }],
    random: () => 0.2
  });
  assert.equal(ships.length, 3);

  const hyperState = flightState();
  hyperState.autopilot.hyperspeedMult = 10;
  assert.equal(spawnCivilianFleet({ THREE: globalThis.THREE, navGraph: navGraph(), flightState: hyperState, random: () => 0.2 }).length, 3);
});

test('updateCivilians advances docked countdown into departure and transit movement', () => {
  const state = flightState();
  const graph = navGraph();
  const ship = createCivilianShip('freighter', { THREE: globalThis.THREE, dockedUntil: 0.1 });
  ship.route = { fromId: 'a', toId: 'b', nodeIds: ['a', 'b'], segmentIndex: 0, progress: 0.1 };
  ship.position.set(100, 0, 0);
  state.civilianTraffic = { enabled: true, ships: [ship], mapContacts: [] };

  updateCivilians(0.2, { THREE: globalThis.THREE, flightState: state, navGraph: graph, now: 200 });
  assert.equal(ship.state, 'DEPARTING');
  const x = ship.position.x;
  updateCivilians(1, { THREE: globalThis.THREE, flightState: state, navGraph: graph, now: 1200 });
  assert.ok(ship.position.x > x);
  assert.ok(ship.velocity.length() > 0);
});

test('dock timer: advances with dt, not wall clock', () => {
  const state = flightState();
  const graph = navGraph();
  const ship = createCivilianShip('freighter', { THREE: globalThis.THREE, dockedUntil: 1, state: 'DOCKED' });
  ship.route = { fromId: 'a', toId: 'b', nodeIds: ['a', 'b'], segmentIndex: 0, progress: 0.1 };
  ship.position.set(100, 0, 0);
  state.civilianTraffic = { enabled: true, ships: [ship], mapContacts: [] };

  updateCivilians(0.25, { THREE: globalThis.THREE, flightState: state, navGraph: graph, now: 10_000 });
  assert.equal(ship.state, 'DOCKED');
  assert.equal(ship.dockedUntil, 0.75);

  updateCivilians(0.75, { THREE: globalThis.THREE, flightState: state, navGraph: graph, now: 10_001 });
  assert.equal(ship.state, 'DEPARTING');
  assert.ok(ship.dockedUntil <= 0);
});

test('updateCivilians enters flee state near enemies without marking combatant', () => {
  const state = flightState();
  const ship = createCivilianShip('shuttle', { THREE: globalThis.THREE, dockedUntil: 0, state: 'TRANSIT' });
  ship.route = { fromId: 'a', toId: 'b', nodeIds: ['a', 'b'], segmentIndex: 0, progress: 0.5 };
  ship.position.set(500, 0, 0);
  state.civilianTraffic = { enabled: true, ships: [ship], mapContacts: [] };

  updateCivilians(0.5, { THREE: globalThis.THREE, flightState: state, navGraph: navGraph(), enemies: [{ userData: { active: true }, position: new Vector3(520, 0, 0) }], now: 1000 });
  assert.equal(ship.state, 'FLEE');
  assert.equal(ship.combatant, false);
  assert.equal(getCivilianMapData([ship])[0].color, 0xffcc66);
});

test('heavy combat destroys civilian and records kill feed event only', () => {
  const root = new globalThis.THREE.Group();
  const state = flightState();
  const feed = [];
  const ship = createCivilianShip('freighter', { THREE: globalThis.THREE, dockedUntil: 0, state: 'TRANSIT' });
  ship.route = { fromId: 'a', toId: 'b', nodeIds: ['a', 'b'], segmentIndex: 0, progress: 0.5 };
  ship.position.set(500, 0, 0);
  root.add(ship.object);
  state.civilianTraffic = { enabled: true, ships: [ship], mapContacts: [] };
  const enemies = Array.from({ length: 3 }, () => ({ userData: { active: true }, position: new Vector3(505, 0, 0) }));

  const events = updateCivilians(0.2, { THREE: globalThis.THREE, gameRoot: root, flightState: state, navGraph: navGraph(), enemies, addKillFeedEntry: text => feed.push(text), now: 1000 });
  assert.equal(ship.state, 'DESTROYED');
  assert.equal(ship.active, false);
  assert.equal(state.civilianTraffic.ships.length, 1);
  assert.deepEqual(events.map(event => event.type), ['CIVILIAN_DESTROYED']);
  assert.deepEqual(feed, ['CIVILIAN TRANSPORT DESTROYED']);
});

test('distance cull removes civilians beyond LOD_FAR', () => {
  const root = new globalThis.THREE.Group();
  const state = flightState();
  const ship = createCivilianShip('courier', { THREE: globalThis.THREE, dockedUntil: 0, state: 'TRANSIT' });
  ship.position.set(41000, 0, 0);
  root.add(ship.object);
  state.civilianTraffic = { enabled: true, ships: [ship], mapContacts: [] };
  updateCivilians(0.1, { THREE: globalThis.THREE, gameRoot: root, flightState: state, navGraph: navGraph(), now: 100 });
  assert.equal(ship.active, false);
  assert.equal(root.children.length, 0);
});

test('disposeCivilians clears traffic arrays', () => {
  const state = flightState();
  state.civilianTraffic = { ships: [createCivilianShip('shuttle', { THREE: globalThis.THREE })], mapContacts: [{ id: 'x' }] };
  disposeCivilians(state);
  assert.deepEqual(state.civilianTraffic.ships, []);
  assert.deepEqual(state.civilianTraffic.mapContacts, []);
});

test('renderSystemMap draws civilian dots by ship type', () => {
  const calls = [];
  const ctx = ['clearRect', 'fillRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke', 'closePath'].reduce((obj, name) => {
    obj[name] = (...args) => calls.push([name, ...args]);
    return obj;
  }, {});
  const canvas = { width: 400, height: 400, getContext: () => ctx };
  const contacts = [
    { id: 'frg', kind: 'freighter', pos: new Vector3(420, 0, 0), size: 3, color: 0x66ccff },
    { id: 'sht', kind: 'shuttle', pos: new Vector3(500, 0, 0), size: 2, color: 0x88e6ff },
    { id: 'cou', kind: 'courier', pos: new Vector3(580, 0, 0), size: 2, color: 0x44bbff }
  ];

  assert.equal(renderSystemMap(canvas, navGraph(), flightState(), [], [], contacts), true);
  assert.ok(calls.some(call => call[0] === 'fillRect' && call[3] === 6 && call[4] === 6));
  assert.ok(calls.some(call => call[0] === 'arc' && call[3] === 2));
  assert.ok(calls.some(call => call[0] === 'closePath'));
});

test('renderSystemMap draws active intercept hunters as red triangles', () => {
  const calls = [];
  const ctx = ['clearRect', 'fillRect', 'beginPath', 'arc', 'fill', 'moveTo', 'lineTo', 'stroke', 'closePath', 'save', 'restore'].reduce((obj, name) => {
    obj[name] = (...args) => calls.push([name, ...args]);
    return obj;
  }, {});
  const canvas = { width: 400, height: 400, getContext: () => ctx };
  const intercept = { hunters: [{ position: new Vector3(500, 0, 0), userData: { active: true, tier: 'SCOUT' } }] };

  assert.equal(renderSystemMap(canvas, navGraph(), flightState(), [], [], [], intercept, 0), true);
  assert.equal(ctx.fillStyle, '#ff2233');
  assert.ok(calls.some(call => call[0] === 'closePath'));
});

import test from 'node:test';
import assert from 'node:assert/strict';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

globalThis.THREE = { Vector3 };

const {
  AUTOPILOT_STATES,
  appendCourse,
  canEngageAutopilot,
  createAutopilotState,
  disengage,
  getSystemMapNodeHitTargets,
  hitTestSystemMapNode,
  plotCourse,
  updateAutopilot,
  updateStarfieldWarp
} = await import('../js/flight/autopilot.js');
const { COMBAT_ZONE_RADIUS, HYPERSPEED_MULTIPLIER_MAX } = await import('../js/flight/world.js');

function graph() {
  const nodes = new Map([
    ['a', { id: 'a', type: 'planet', pos: new Vector3(0, 0, 0), edges: [{ targetId: 'b', dist: 1000 }] }],
    ['b', { id: 'b', type: 'planet', pos: new Vector3(1000, 0, 0), edges: [{ targetId: 'a', dist: 1000 }, { targetId: 'c', dist: 1000 }] }],
    ['c', { id: 'c', type: 'station', pos: new Vector3(2000, 0, 0), edges: [{ targetId: 'b', dist: 1000 }] }]
  ]);
  return nodes;
}

function state(pos = new Vector3(0, 0, 0)) {
  return { pos, vel: new Vector3(), thrust: 14, armor: 100, autopilot: createAutopilotState() };
}

test('plotCourse sets PLOTTING and populates route', () => {
  const flightState = state();
  assert.equal(plotCourse(flightState, graph(), 'c'), true);
  assert.equal(flightState.autopilot.state, 'PLOTTING');
  assert.deepEqual(flightState.autopilot.route, ['a', 'b', 'c']);
});

test('plotCourse returns false and sets blockedReason when no route found', () => {
  const flightState = state();
  const navGraph = graph();
  navGraph.get('a').edges = [];
  assert.equal(plotCourse(flightState, navGraph, 'c'), false);
  assert.equal(flightState.autopilot.blockedReason, 'NO ROUTE FOUND');
});

test('appendCourse extends an existing plotted route without duplicating the seam', () => {
  const flightState = state();
  assert.equal(plotCourse(flightState, graph(), 'b'), true);
  assert.deepEqual(flightState.autopilot.route, ['a', 'b']);
  assert.equal(appendCourse(flightState, graph(), 'c'), true);
  assert.deepEqual(flightState.autopilot.route, ['a', 'b', 'c']);
  assert.equal(flightState.autopilot.targetId, 'c');
  assert.equal(flightState.autopilot.routeModeLabel, 'MULTI-STOP ROUTE');
});

test('appendCourse falls back to plotCourse when no route exists', () => {
  const flightState = state();
  assert.equal(appendCourse(flightState, graph(), 'c'), true);
  assert.deepEqual(flightState.autopilot.route, ['a', 'b', 'c']);
});

test('appendCourse leaves the current route intact when extension is unreachable', () => {
  const flightState = state();
  const navGraph = graph();
  assert.equal(plotCourse(flightState, navGraph, 'b'), true);
  navGraph.get('b').edges = [];
  assert.equal(appendCourse(flightState, navGraph, 'c'), false);
  assert.deepEqual(flightState.autopilot.route, ['a', 'b']);
  assert.equal(flightState.autopilot.blockedReason, 'NO ROUTE FOUND');
});

test('disengage sets IDLE and clears route', () => {
  const flightState = state();
  flightState.autopilot.state = AUTOPILOT_STATES.ENGAGED;
  flightState.autopilot.route = ['a', 'b'];
  disengage(flightState);
  assert.equal(flightState.autopilot.state, 'IDLE');
  assert.deepEqual(flightState.autopilot.route, []);
});

test('canEngageAutopilot blocks bossActive', () => {
  assert.deepEqual(canEngageAutopilot(state(), { bossActive: true }), { ok: false, reason: 'BOSS ACTIVE' });
});

test('canEngageAutopilot blocks hull or armor below 15%', () => {
  assert.equal(canEngageAutopilot({ ...state(), armor: 14 }, {}).ok, false);
  assert.equal(canEngageAutopilot(state(), { hull: 10, maxHull: 100 }).ok, false);
});

test('updateAutopilot in ENGAGED moves player toward waypoint', () => {
  const flightState = state();
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'b', route: ['a', 'b'], routeIndex: 1 };
  updateAutopilot(flightState, {}, 1, graph());
  assert.ok(flightState.pos.x > 0);
});

test('updateAutopilot disengages when enemy enters combat radius half', () => {
  const flightState = state();
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'b', route: ['a', 'b'], routeIndex: 1 };
  updateAutopilot(flightState, { enemies: [{ userData: { active: true }, position: new Vector3(COMBAT_ZONE_RADIUS * 0.25, 0, 0) }] }, 0.1, graph());
  assert.equal(flightState.autopilot.state, 'IDLE');
});

test('hyperspeed lerp after 2s approaches max multiplier', () => {
  const flightState = state();
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'c', route: ['a', 'b', 'c'], routeIndex: 1 };
  updateAutopilot(flightState, {}, 2, graph());
  assert.equal(flightState.autopilot.hyperspeedMult, HYPERSPEED_MULTIPLIER_MAX);
});

test('gate waypoints wait for activation range before jumping', () => {
  const navGraph = new Map([
    ['start', { id: 'start', type: 'station', pos: new Vector3(0, 0, 0), edges: [] }],
    ['gate-a', { id: 'gate-a', type: 'gate', pos: new Vector3(1000, 0, 0), activationRange: 12, edges: [] }],
    ['gate-b', { id: 'gate-b', type: 'gate', pos: new Vector3(5000, 0, 0), activationRange: 12, edges: [] }],
    ['end', { id: 'end', type: 'station', pos: new Vector3(5100, 0, 0), activationRange: 120, edges: [] }]
  ]);
  const flightState = state(new Vector3(850, 0, 0));
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'end', route: ['start', 'gate-a', 'gate-b', 'end'], routeIndex: 1 };

  updateAutopilot(flightState, {}, 0.1, navGraph);
  assert.equal(flightState.autopilot.routeIndex, 1);
  assert.ok(flightState.pos.x > 850 && flightState.pos.x < 1000);

  flightState.pos = new Vector3(989, 0, 0);
  updateAutopilot(flightState, {}, 0.1, navGraph);
  assert.equal(flightState.autopilot.routeIndex, 3);
  assert.equal(flightState.pos.x, 5000);
});

test('station destinations do not arrive outside docking range', () => {
  const navGraph = graph();
  navGraph.get('c').activationRange = 120;
  const flightState = state(new Vector3(1850, 0, 0));
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'c', route: ['b', 'c'], routeIndex: 1 };

  updateAutopilot(flightState, {}, 0.1, navGraph);
  assert.notEqual(flightState.autopilot.state, AUTOPILOT_STATES.ARRIVED);
});

test('final station arrival stops velocity and shows arrival status', () => {
  const navGraph = graph();
  navGraph.get('c').activationRange = 120;
  navGraph.get('c').name = 'Hub Alpha';
  const flightState = state(new Vector3(1900, 0, 0));
  flightState.vel = new Vector3(9, 0, 0);
  flightState.autopilot = { ...createAutopilotState(), state: 'ENGAGED', targetId: 'c', route: ['b', 'c'], routeIndex: 1, hyperspeedMult: 5 };

  updateAutopilot(flightState, {}, 0.1, navGraph);

  assert.equal(flightState.autopilot.state, AUTOPILOT_STATES.ARRIVED);
  assert.equal(flightState.autopilot.hyperspeedMult, 1);
  assert.deepEqual({ x: flightState.vel.x, y: flightState.vel.y, z: flightState.vel.z }, { x: 0, y: 0, z: 0 });
  assert.equal(flightState.status, 'ARRIVED: Hub Alpha');
  assert.equal(flightState.autopilot.arrivalNodeId, 'c');
});

test('updateStarfieldWarp drives shader uniform and streak opacity', () => {
  const starfield = {
    material: { uniforms: { uWarp: { value: 0 } } },
    scale: { z: 1 },
    streaks: { visible: false, material: { opacity: 0 } },
    updateStreaksCalled: false,
    updateStreaks() { this.updateStreaksCalled = true; }
  };

  updateStarfieldWarp(starfield, new Vector3(0, 0, -1), HYPERSPEED_MULTIPLIER_MAX);

  assert.equal(starfield.material.uniforms.uWarp.value, 1);
  assert.equal(starfield.streaks.visible, true);
  assert.ok(starfield.streaks.material.opacity > 0.8);
  assert.equal(starfield.updateStreaksCalled, true);
});

test('system map hit targets use rendered node projection', () => {
  const canvas = { width: 600, height: 600 };
  const targets = getSystemMapNodeHitTargets(canvas, graph());
  assert.deepEqual(targets.map(target => target.node.id), ['a', 'b', 'c']);
  assert.equal(targets[0].x, 300);
  assert.equal(targets[0].y, 300);
  assert.equal(targets[2].x, 528);
});

test('system map hit test converts client coordinates through canvas bounds', () => {
  const canvas = {
    width: 600,
    height: 600,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 300 })
  };
  assert.equal(hitTestSystemMapNode(canvas, graph(), 274, 170)?.id, 'c');
  assert.equal(hitTestSystemMapNode(canvas, graph(), 25, 35), null);
});

test('system map projection respects zoom and pan viewport', () => {
  const canvas = { width: 600, height: 600 };
  const targets = getSystemMapNodeHitTargets(canvas, graph(), { zoom: 2, offsetX: -20, offsetY: 10 });

  assert.equal(targets[0].x, 280);
  assert.equal(targets[0].y, 310);
  assert.equal(targets[2].x, 736);
});

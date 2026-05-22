import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SURFACE_STATES,
  beginDeparture,
  beginLanding,
  checkPlanetProximity,
  enterApproach,
  enterOrbital,
  getSurfaceServices,
  onSurface,
  updateLanding,
  updateSurface
} from '../js/flight/surface.js';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
}

function flightState(pos = new Vector3(0, 0, 2100)) {
  return {
    pos,
    vel: new Vector3(10, 0, 0),
    keys: new Set(['KeyW']),
    landed: false,
    currentDockedProject: { id: 'project' },
    thrust: 14,
    strafe: 8,
    matchSpeedActive: true,
    matchSpeedTarget: { id: 'target' },
    autopilot: {
      state: 'ENGAGED',
      route: ['a', 'b'],
      hyperspeedMult: 80,
      hyperspeedTarget: 80,
      blockedReason: null
    },
    surface: {
      state: SURFACE_STATES.NONE,
      planetId: null,
      approachDist: 0,
      orbitAltitude: 0,
      landingProgress: 0,
      surfaceY: 0,
      exitQueued: false
    }
  };
}

const planet = {
  id: 'devussy',
  type: 'core',
  hasStation: true,
  pos: [5800, 187, 0],
  radius: 852
};

test('checkPlanetProximity enters approach inside planet radius times 1.6', () => {
  const state = flightState(new Vector3(5800, 187, 1362));
  checkPlanetProximity(state, [planet]);
  assert.equal(state.surface.state, SURFACE_STATES.APPROACH);
  assert.equal(state.surface.planetId, 'devussy');
  assert.equal(state.surface.approachDist, 1363.2);
});

test('checkPlanetProximity does not enter approach outside planet radius times 1.6', () => {
  const state = flightState(new Vector3(5800, 187, 1365));
  checkPlanetProximity(state, [planet]);
  assert.equal(state.surface.state, SURFACE_STATES.NONE);
});

test('checkPlanetProximity does not retrigger when surface state is not NONE', () => {
  const state = flightState(new Vector3(5800, 187, 1362));
  state.surface.state = SURFACE_STATES.ORBITAL;
  checkPlanetProximity(state, [planet]);
  assert.equal(state.surface.state, SURFACE_STATES.ORBITAL);
  assert.equal(state.surface.planetId, null);
});

test('enterApproach idles route autopilot without UI dependencies', () => {
  const state = flightState();
  enterApproach(state, planet);
  assert.equal(state.autopilot.state, 'IDLE');
  assert.deepEqual(state.autopilot.route, []);
  assert.equal(state.autopilot.hyperspeedMult, 1);
  assert.equal(state.autopilot.blockedReason, 'PLANET APPROACH');
});

test('APPROACH transitions to ORBITAL within planet radius times 1.2', () => {
  const state = flightState(new Vector3(5800, 187, 1022));
  enterApproach(state, planet);
  assert.equal(state.surface.state, SURFACE_STATES.ORBITAL);
  assert.equal(state.surface.orbitAltitude, 1022.4);
});

test('beginLanding and updateLanding lerp progress over 3 seconds then surface', () => {
  const state = flightState(new Vector3(0, 1500, 1100));
  enterOrbital(state, planet);
  beginLanding(state, planet);
  updateLanding(state, planet, 1.5);
  assert.equal(state.surface.state, SURFACE_STATES.LANDING);
  assert.equal(state.surface.landingProgress, 0.5);
  assert.equal(state.pos.y, 1269.5);
  updateLanding(state, planet, 1.5);
  assert.equal(state.surface.state, SURFACE_STATES.SURFACE);
  assert.equal(state.surface.landingProgress, 1);
  assert.equal(state.landed, true);
});

test('updateSurface: full NONE → SURFACE → NONE round-trip', () => {
  const localPlanet = { ...planet, pos: [0, 0, 0], radius: 100 };
  const state = flightState(new Vector3(0, 500, 0));
  state.thrust = 18;

  enterApproach(state, localPlanet);
  enterOrbital(state, localPlanet);
  beginLanding(state, localPlanet);

  for (let guard = 0; state.surface.state !== SURFACE_STATES.SURFACE && guard < 10; guard += 1) {
    updateLanding(state, localPlanet, 0.5);
  }

  assert.equal(state.surface.state, SURFACE_STATES.SURFACE);
  assert.ok(Math.abs(state.pos.y - state.surface.surfaceY) < 1e-9);

  beginDeparture(state);
  assert.equal(state.thrust, 18);

  for (let guard = 0; state.surface.state !== SURFACE_STATES.NONE && guard < 10; guard += 1) {
    updateSurface(state, [localPlanet], 0.5);
  }

  assert.equal(state.surface.state, SURFACE_STATES.NONE);
  assert.equal(state.surface.landingProgress, 0);
  assert.equal(state.surface.planetId, null);
});

test('getSurfaceServices returns combat encounter for hostile planet', () => {
  const hostile = { ...planet, id: 'battlebussy', type: 'hostile' };
  const state = flightState();
  onSurface(state, hostile);
  assert.equal(state.surface.state, SURFACE_STATES.SURFACE);
  assert.equal(state.surface.exitQueued, true);
  assert.equal(state.landed, true);
  assert.deepEqual(getSurfaceServices(hostile), [{ id: 'combat_encounter', label: 'Combat Encounter', available: true }]);
});

test('getSurfaceServices returns special event for anomaly planet', () => {
  const anomaly = { ...planet, id: 'nexussy', type: 'anomaly' };
  assert.deepEqual(getSurfaceServices(anomaly), [{ id: 'special_event', label: 'Special Event', available: true }]);
});

test('hostile surface auto-departs using exitQueued', () => {
  const hostile = { ...planet, id: 'battlebussy', type: 'hostile' };
  const state = flightState();
  onSurface(state, hostile);
  updateSurface(state, [hostile], 0.1);
  assert.equal(state.surface.state, SURFACE_STATES.DEPARTURE);
  assert.equal(state.surface.exitQueued, false);
  assert.equal(state.landed, false);
});

test('departure reverses progress to NONE and restores movement locks', () => {
  const state = flightState();
  state.thrust = 0;
  state.strafe = 0;
  onSurface(state, planet);
  beginDeparture(state);
  updateSurface(state, [planet], 3);
  assert.equal(state.surface.state, SURFACE_STATES.NONE);
  assert.equal(state.surface.planetId, null);
  assert.equal(state.landed, false);
  assert.equal(state.thrust, 14);
  assert.equal(state.strafe, 0);
  assert.equal(state.keys.size, 0);
});

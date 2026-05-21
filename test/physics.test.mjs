import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  addScaledVector(vec, scale) {
    this.x += vec.x * scale;
    this.y += vec.y * scale;
    this.z += vec.z * scale;
    return this;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
}

globalThis.window ??= { USSY_PROJECTS: [] };
globalThis.document ??= { getElementById: () => null };
globalThis.THREE = { Vector3, Quaternion: class {}, Matrix4: class {} };

const {
  applyForwardThrust,
  applyReverseThrust,
  applyRoll,
  applyStrafe,
  canApplyThrust,
  drainFuelForThrust
} = await import('../js/flight/physics.js');

function makeState() {
  return { vel: new Vector3(), pos: new Vector3(), thrust: 14, strafe: 8, fuel: 100, fuelDepleted: false, roll: 0 };
}

describe('flight physics helpers', () => {
  it('forward thrust increases velocity along the facing direction', () => {
    const state = makeState();
    applyForwardThrust(state, new Vector3(0, 0, -1), 1);
    assert.equal(state.vel.z, -14, 'forward thrust should add thrust along forward vector');
    assert.equal(state.vel.x, 0, 'forward thrust should not add lateral velocity');
  });

  it('reverse thrust decelerates opposite the facing direction', () => {
    const state = makeState();
    state.vel.z = -14;
    applyReverseThrust(state, new Vector3(0, 0, -1), 1);
    assert.ok(Math.abs(state.vel.z - -5.88) < 1e-9, 'reverse thrust should add 58% thrust opposite forward motion');
  });

  it('strafe applies lateral delta without affecting forward velocity', () => {
    const state = makeState();
    state.vel.z = -3;
    applyStrafe(state, new Vector3(1, 0, 0), 1, 1);
    assert.equal(state.vel.x, 8, 'strafe should add lateral velocity');
    assert.equal(state.vel.z, -3, 'strafe should not change forward velocity');
  });

  it('roll changes orientation value without translating position', () => {
    const state = makeState();
    const before = state.pos.clone();
    applyRoll(state, 0.5);
    assert.equal(state.roll, 0.5, 'roll should update roll accumulator');
    assert.deepEqual(state.pos, before, 'roll should not translate position');
  });

  it('fuel drains while thrusting and not while drifting', () => {
    const fuelState = { fuel: 10, fuelPerSecond: 0.5, fuelDepleted: false };
    drainFuelForThrust(fuelState, 4, true);
    assert.equal(fuelState.fuel, 8, 'thrusting should drain fuel by rate * dt');
    drainFuelForThrust(fuelState, 4, false);
    assert.equal(fuelState.fuel, 8, 'drifting should not drain fuel');
  });

  it('empty fuel prevents thrust from changing velocity', () => {
    const state = makeState();
    state.fuel = 0;
    assert.equal(canApplyThrust(state), false, 'zero fuel should disable thrust');
    applyForwardThrust(state, new Vector3(0, 0, -1), 1);
    assert.equal(state.vel.z, 0, 'forward thrust should no-op at zero fuel');
  });
});

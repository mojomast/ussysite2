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

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  setLength(length) {
    const current = this.length();
    if (current === 0) return this;
    return this.multiplyScalar(length / current);
  }

  multiplyScalar(scale) {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
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
  BASE_MAX_VELOCITY,
  applyVelocityCapAndDrag,
  applyForwardThrust,
  applyReverseThrust,
  applyRoll,
  applyStrafe,
  canApplyThrust,
  drainFuelForThrust,
  triggerEvasionCameraRoll,
  updateEvasionCameraRoll
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
    assert.equal(state.vel.x, 9.2, 'strafe should add the tuned lateral velocity');
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

describe('velocity cap and drag', () => {
  it('keeps repeated forward thrust ticks at or below max velocity', () => {
    const state = makeState();
    state.damping = 1;

    for (let tick = 0; tick < 100; tick += 1) {
      applyForwardThrust(state, new Vector3(0, 0, -1), 1 / 10);
      applyVelocityCapAndDrag(state, 1 / 60);
    }

    assert.ok(state.vel.length() <= BASE_MAX_VELOCITY, 'velocity magnitude should not exceed the base max velocity');
  });

  it('reduces velocity monotonically under drag when no thrust is applied', () => {
    const state = makeState();
    state.damping = 0.985;
    applyForwardThrust(state, new Vector3(0, 0, -1), 1);

    let previous = state.vel.length();
    for (let tick = 0; tick < 5; tick += 1) {
      applyVelocityCapAndDrag(state, 1 / 60);
      const current = state.vel.length();
      assert.ok(current < previous, 'drag should reduce speed on every tick');
      previous = current;
    }
  });

  it('does not push near-zero positive velocity negative', () => {
    const state = makeState();
    state.damping = 0.985;
    state.vel.x = 1e-9;

    for (let tick = 0; tick < 5; tick += 1) applyVelocityCapAndDrag(state, 1 / 60);

    assert.ok(state.vel.x >= 0, 'positive near-zero velocity should not flip sign under drag');
    assert.ok(state.vel.length() <= 1e-9, 'drag should keep near-zero velocity moving toward zero');
  });
});

describe('evasion camera roll', () => {
  it('sets cameraRollTarget to a signed 28 degree roll', () => {
    const state = { cameraRollTarget: 0, cameraRollCurrent: 0 };
    triggerEvasionCameraRoll(state, 1);
    assert.equal(state.cameraRollTarget, 28);
    triggerEvasionCameraRoll(state, -1);
    assert.equal(state.cameraRollTarget, -28);
  });

  it('lerps current roll and decays target toward zero', () => {
    const state = { cameraRollTarget: 28, cameraRollCurrent: 0 };
    updateEvasionCameraRoll(state, 0.1);
    assert.ok(state.cameraRollCurrent > 0, 'current roll should move toward target');
    assert.ok(state.cameraRollTarget < 28, 'target roll should decay');
  });
});

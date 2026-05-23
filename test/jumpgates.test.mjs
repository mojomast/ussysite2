import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GATE_PROXIMITY, JUMP_GATES, createJumpGate, getNearestGate, isInJumpRange, updateJumpGateRotations } from '../js/flight/jumpgates.js';

class TestVector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(other) { return this.set(other.x, other.y, other.z); }
  distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z); }
}

class TestObject3D {
  constructor() { this.children = []; this.position = new TestVector3(); this.rotation = new TestVector3(); this.userData = {}; }
  add(child) { this.children.push(child); return this; }
}

class TestGroup extends TestObject3D {}
class TestMesh extends TestObject3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class TestMaterial { constructor(options = {}) { Object.assign(this, options); } clone() { return new TestMaterial({ ...this }); } }
class TestGeometry { constructor(type, args) { this.type = type; this.args = args; } }

const TestTHREE = {
  Vector3: TestVector3,
  Group: TestGroup,
  Mesh: TestMesh,
  MeshBasicMaterial: TestMaterial,
  AdditiveBlending: 'AdditiveBlending',
  TorusGeometry: class extends TestGeometry { constructor(...args) { super('TorusGeometry', args); } },
  CircleGeometry: class extends TestGeometry { constructor(...args) { super('CircleGeometry', args); } }
};

describe('jump gates', () => {
  it('defines a connected gate network', () => {
    assert.ok(JUMP_GATES.length >= 4);
    for (const gate of JUMP_GATES) assert.ok(gate.connectsTo.length >= 1);
  });

  it('creates a physical gate with range metadata', () => {
    const gate = createJumpGate(JUMP_GATES[0], TestTHREE, 1);

    assert.equal(gate.userData.isJumpGate, true);
    assert.equal(gate.userData.activationRange, GATE_PROXIMITY);
    assert.equal(gate.children.length, 3);
  });

  it('detects nearest and in-range gates', () => {
    const gate = createJumpGate(JUMP_GATES[0], TestTHREE, 1);
    const near = gate.position;

    assert.equal(getNearestGate(near, [gate]).gate, gate);
    assert.equal(isInJumpRange(near, [gate]), gate);
    assert.equal(isInJumpRange(new TestVector3(999999, 0, 0), [gate]), null);
  });

  it('rotates gate rings', () => {
    const gate = createJumpGate(JUMP_GATES[0], TestTHREE, 1);

    updateJumpGateRotations([gate], 2);
    assert.equal(gate.rotation.z, 1.4);
  });
});

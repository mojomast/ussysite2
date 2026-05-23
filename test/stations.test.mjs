import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DOCK_PROXIMITY, createStation, updateStationRotations } from '../js/flight/stations.js';

class TestVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copy(other) {
    return this.set(other.x, other.y, other.z);
  }
}

class TestObject3D {
  constructor() {
    this.children = [];
    this.position = new TestVector3();
    this.rotation = new TestVector3();
    this.userData = {};
  }
  add(child) {
    this.children.push(child);
    return this;
  }
}

class TestGroup extends TestObject3D {}

class TestGeometry {
  constructor(type, args) {
    this.type = type;
    this.args = args;
  }
}

class TestMaterial {
  constructor(options = {}) {
    Object.assign(this, options);
  }
}

class TestMesh extends TestObject3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

const TestTHREE = {
  Vector3: TestVector3,
  Group: TestGroup,
  Mesh: TestMesh,
  MeshBasicMaterial: TestMaterial,
  BoxGeometry: class extends TestGeometry {
    constructor(...args) { super('BoxGeometry', args); }
  },
  CylinderGeometry: class extends TestGeometry {
    constructor(...args) { super('CylinderGeometry', args); }
  },
  TorusGeometry: class extends TestGeometry {
    constructor(...args) { super('TorusGeometry', args); }
  }
};

function stationDef(type) {
  return {
    id: `test-${type}`,
    pos: [10, 20, 30],
    type,
    hasTrading: type === 'hub',
    hasMissions: true
  };
}

describe('flight stations', () => {
  it('createStation returns group with userData.isStation = true', () => {
    const station = createStation(stationDef('outpost'), TestTHREE);

    assert.equal(station.userData.isStation, true);
    assert.equal(station.userData.stationId, 'test-outpost');
    assert.equal(station.position.x, 10);
    assert.equal(station.position.y, 20);
    assert.equal(station.position.z, 30);
  });

  it('station types have correct geometry count', () => {
    assert.equal(createStation(stationDef('outpost'), TestTHREE).children.length, 7);
    assert.equal(createStation(stationDef('hub'), TestTHREE).children.length, 9);
    assert.equal(createStation(stationDef('military'), TestTHREE).children.length, 8);
  });

  it('supports flight-only position scaling without changing geometry', () => {
    const station = createStation(stationDef('outpost'), TestTHREE, 1.35);

    assert.equal(station.position.x, 13.5);
    assert.equal(station.position.y, 27);
    assert.equal(station.position.z, 40.5);
    assert.equal(station.children.length, 7);
  });

  it('updateStationRotations increments rotation.y by type speed delta', () => {
    const outpost = createStation(stationDef('outpost'), TestTHREE);
    const hub = createStation(stationDef('hub'), TestTHREE);
    const military = createStation(stationDef('military'), TestTHREE);

    updateStationRotations([outpost, hub, military], 2);

    assert.equal(outpost.rotation.y, 0.08);
    assert.equal(hub.rotation.y, 0.08);
    assert.equal(military.rotation.y, 0.03);
  });

  it('DOCK_PROXIMITY is exported as a number', () => {
    assert.equal(typeof DOCK_PROXIMITY, 'number');
  });
});

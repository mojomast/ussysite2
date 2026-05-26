import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createPlanet, getNearestBody, updatePlanetLOD } from '../js/flight/planets.js';

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
  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
  }
}

class TestScale extends TestVector3 {
  constructor() {
    super(1, 1, 1);
  }
  setScalar(value) {
    return this.set(value, value, value);
  }
}

class TestObject3D {
  constructor() {
    this.children = [];
    this.position = new TestVector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = new TestScale();
    this.userData = {};
    this.name = '';
  }
  add(child) {
    this.children.push(child);
    return this;
  }
}

class TestLOD extends TestObject3D {
  constructor() {
    super();
    this.levels = [];
    this.updateCalls = [];
  }
  addLevel(object, distance) {
    this.levels.push({ object, distance });
    this.add(object);
  }
  update(camera) {
    this.updateCalls.push(camera);
  }
}

class TestSphereGeometry {
  constructor(radius, widthSegments, heightSegments) {
    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
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
  LOD: TestLOD,
  Mesh: TestMesh,
  SphereGeometry: TestSphereGeometry,
  MeshStandardMaterial: TestMaterial,
  MeshBasicMaterial: TestMaterial,
  ShaderMaterial: TestMaterial,
  AdditiveBlending: 'AdditiveBlending',
  FrontSide: 'FrontSide',
  BackSide: 'BackSide',
  Color: class {
    constructor(value) { this.value = value; }
  }
};

const planetDef = {
  id: 'test-planet',
  type: 'homeworld',
  pos: [10, 20, 30],
  radius: 100,
  color: 0x112233,
  atmosphereColor: 0x445566
};

describe('flight planets', () => {
  it('createPlanet returns object with userData.isPlanet = true', () => {
    const planet = createPlanet(planetDef, TestTHREE);

    assert.equal(planet.userData.isPlanet, true);
    assert.equal(planet.userData.planetId, planetDef.id);
    assert.equal(planet.position.x, 10);
    assert.equal(planet.levels.length, 3);
  });

  it('creates an atmosphere mesh with rim shader settings', () => {
    const planet = createPlanet(planetDef, TestTHREE);
    const atmosphere = planet.children.find(child => child.userData?.isPlanetAtmosphere);

    assert.ok(atmosphere);
    assert.equal(atmosphere.material.uniforms.uOpacity.value, 0.16);
    assert.equal(atmosphere.material.uniforms.uGlowStrength.value, 1.15);
    assert.equal(atmosphere.material.uniforms.uHorizonBoost.value, 0.28);
    assert.equal(atmosphere.material.uniforms.uTime.value, 0);
    assert.equal(atmosphere.material.side, TestTHREE.FrontSide);
    assert.equal(atmosphere.material.transparent, true);
    assert.equal(atmosphere.material.depthWrite, false);
  });

  it('creates a transparent cloud shell tagged with planet id', () => {
    const planet = createPlanet(planetDef, TestTHREE);
    const clouds = planet.children.find(child => child.userData?.isPlanetClouds);

    assert.ok(clouds);
    assert.equal(clouds.userData.planetId, planetDef.id);
    assert.equal(clouds.material.transparent, true);
    assert.equal(clouds.material.depthWrite, false);
    assert.equal(clouds.material.opacity, 0.18);
    assert.equal(clouds.geometry.radius, planetDef.radius * 1.012);
  });

  it('supports flight-only position scaling without changing radius', () => {
    const planet = createPlanet(planetDef, TestTHREE, 1.35);

    assert.equal(planet.position.x, 13.5);
    assert.equal(planet.levels[0].object.geometry.radius, 100);
  });

  it('getNearestBody returns closest body within maxDist', () => {
    const close = { id: 'close', pos: [5, 0, 0] };
    const closer = { id: 'closer', position: { x: 2, y: 0, z: 0 } };
    const result = getNearestBody({ x: 0, y: 0, z: 0 }, [close, closer], 10);

    assert.equal(result.body, closer);
    assert.equal(result.dist, 2);
  });

  it('getNearestBody returns null when nothing is within maxDist', () => {
    const result = getNearestBody([10, 0, 0], [{ id: 'far', pos: [30, 0, 0] }], 10);

    assert.equal(result, null);
  });

  it('updatePlanetLOD calls lod.update(camera) for each planet', () => {
    const camera = { id: 'camera' };
    const planets = [new TestLOD(), new TestLOD()];

    updatePlanetLOD(planets, camera);

    assert.deepEqual(planets[0].updateCalls, [camera]);
    assert.deepEqual(planets[1].updateCalls, [camera]);
  });

  it('updatePlanetLOD rotates planets, clouds, and advances atmosphere time', () => {
    const camera = { id: 'camera' };
    const planet = createPlanet(planetDef, TestTHREE);
    const clouds = planet.children.find(child => child.userData?.isPlanetClouds);
    const atmosphere = planet.children.find(child => child.userData?.isPlanetAtmosphere);

    updatePlanetLOD([planet], camera, 0.5);

    assert.ok(planet.rotation.y > 0);
    assert.ok(clouds.rotation.y > 0);
    assert.equal(atmosphere.material.uniforms.uTime.value, 0.2);
  });

  it('creates one expensive surface texture per planet and shares it across LODs', async () => {
    const source = await readFile(new URL('../js/flight/planets.js', import.meta.url), 'utf8');

    assert.match(source, /const surfaceTexture = createPlanetSurfaceTexture\(planetDef, THREE\);/);
    assert.match(source, /createPlanetMesh\(planetDef, THREE, 48, 32, surfaceTexture\)/);
    const meshBody = source.match(/function createPlanetMesh[\s\S]*?\n\}/)?.[0] || '';
    assert.doesNotMatch(meshBody, /createPlanetSurfaceTexture\(planetDef, THREE\)/);
  });
});

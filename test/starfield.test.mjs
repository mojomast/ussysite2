import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createStarfield } from '../js/flight/starfield.js';
import { PLANETS } from '../js/flight/world.js';

class TestScene {
  constructor() { this.children = []; }
  add(child) { this.children.push(child); }
  remove(child) { this.children = this.children.filter(item => item !== child); }
}

class TestBufferGeometry {
  constructor() {
    this.attributes = {};
    this.disposed = false;
  }
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;
    return this;
  }
  dispose() { this.disposed = true; }
}

class TestMaterial {
  constructor(options = {}) {
    Object.assign(this, options);
    this.disposed = false;
  }
  dispose() { this.disposed = true; }
}

const TestTHREE = {
  BufferGeometry: TestBufferGeometry,
  BufferAttribute: class {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
  },
  ShaderMaterial: TestMaterial,
  Points: class {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.userData = {};
      this.name = '';
    }
  },
  Color: class {
    constructor(value = 0xffffff) { this.set(value); }
    set(value) {
      this.r = ((value >> 16) & 255) / 255;
      this.g = ((value >> 8) & 255) / 255;
      this.b = (value & 255) / 255;
      return this;
    }
  }
};

describe('flight starfield', () => {
  it('createStarfield returns an object with a dispose method', () => {
    const scene = new TestScene();
    const starfield = createStarfield(scene, TestTHREE);

    assert.equal(typeof starfield.dispose, 'function');
    assert.equal(scene.children.length, 1);

    starfield.dispose();
    assert.equal(scene.children.length, 0);
    assert.equal(starfield.geometry.disposed, true);
    assert.equal(starfield.material.disposed, true);
  });

  it('creates 8000 stars', () => {
    const starfield = createStarfield(new TestScene(), TestTHREE);

    assert.equal(starfield.count, 8000);
    assert.equal(starfield.positions.length / 3, 8000);
    assert.equal(starfield.points.geometry.attributes.position.count, 8000);
  });

  it('does not place stars within planet exclusion zones', () => {
    const starfield = createStarfield(new TestScene(), TestTHREE);

    for (let i = 0; i < starfield.positions.length; i += 3) {
      for (const planet of PLANETS) {
        const [px, py, pz] = planet.pos;
        const minDistance = planet.radius * 2;
        const dx = starfield.positions[i] - px;
        const dy = starfield.positions[i + 1] - py;
        const dz = starfield.positions[i + 2] - pz;
        assert.ok(
          (dx * dx + dy * dy + dz * dz) >= minDistance * minDistance,
          `star ${i / 3} should not be inside ${planet.id} exclusion zone`
        );
      }
    }
  });
});

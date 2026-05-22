import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { COMBAT_ZONE_RADIUS, JUMP_POINTS, PLANETS, STATIONS, SYSTEM_RADIUS, worldToThree } from '../js/flight/world.js';

globalThis.window ??= {};
await import('../projects.js');
const USSY_PROJECTS = globalThis.window.USSY_PROJECTS;

const REQUIRED_PLANET_FIELDS = ['id', 'name', 'pos', 'radius', 'color'];
const REQUIRED_STATION_FIELDS = ['id', 'name', 'pos', 'type', 'hasTrading', 'hasMissions'];

function hex(value) {
  return `0x${value.toString(16).padStart(6, '0')}`;
}

function assertHasRequiredFields(body, fields) {
  for (const field of fields) {
    assert.ok(Object.hasOwn(body, field), `${body.id ?? 'body'} should include ${field}`);
  }
}

describe('world landmark data', () => {
  it('defines required fields for all planets', () => {
    for (const planet of PLANETS) assertHasRequiredFields(planet, REQUIRED_PLANET_FIELDS);
  });

  it('defines required fields for all stations', () => {
    for (const station of STATIONS) assertHasRequiredFields(station, REQUIRED_STATION_FIELDS);
  });

  it('uses unique ids across planets, stations, and jump points', () => {
    const ids = [...PLANETS, ...STATIONS, ...JUMP_POINTS].map(body => body.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('stores planet positions as 3D coordinate arrays', () => {
    for (const planet of PLANETS) assert.equal(planet.pos.length, 3, `${planet.id} pos should be length 3`);
  });

  it('keeps the combat zone inside the system radius', () => {
    assert.ok(COMBAT_ZONE_RADIUS < SYSTEM_RADIUS);
  });

  it('promotes every project to exactly one matching planet', () => {
    assert.equal(PLANETS.length, USSY_PROJECTS.length);
    for (const project of USSY_PROJECTS) {
      const planet = PLANETS.find(item => item.id === project.id);
      assert.ok(planet, `${project.id} should have a planet`);
      assert.deepEqual(project.planet.pos, planet.pos);
      assert.equal(project.planet.radius, planet.radius);
      assert.equal(project.planet.color, hex(planet.color));
      assert.equal(project.planet.atmosphereColor, hex(planet.atmosphereColor));
      assert.equal(project.planet.type, planet.type);
      assert.equal(project.planet.hasStation, planet.hasStation);
    }
  });

  it('keeps same-ring project planets at least 3000 units apart', () => {
    for (let index = 0; index < PLANETS.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < PLANETS.length; otherIndex += 1) {
        const a = PLANETS[index];
        const b = PLANETS[otherIndex];
        if (a.type !== b.type) continue;
        const dist = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
        assert.ok(dist >= 3000, `${a.id} and ${b.id} should be spaced apart`);
      }
    }
  });

  it('keeps all project planets inside the system radius', () => {
    for (const planet of PLANETS) assert.ok(Math.hypot(...planet.pos) < SYSTEM_RADIUS, `${planet.id} should fit inside system radius`);
  });

  it('worldToThree is the canonical array to Vector3 converter', () => {
    class Vector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    }
    const vector = worldToThree([1, 2, 3], { Vector3 });
    assert.deepEqual({ x: vector.x, y: vector.y, z: vector.z }, { x: 1, y: 2, z: 3 });
  });
});

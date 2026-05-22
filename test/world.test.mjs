import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { COMBAT_ZONE_RADIUS, JUMP_POINTS, PLANETS, STATIONS, SYSTEM_RADIUS } from '../js/flight/world.js';

const REQUIRED_PLANET_FIELDS = ['id', 'name', 'pos', 'radius', 'color'];
const REQUIRED_STATION_FIELDS = ['id', 'name', 'pos', 'type', 'hasTrading', 'hasMissions'];

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
});

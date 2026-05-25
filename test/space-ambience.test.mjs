import test from 'node:test';
import assert from 'node:assert/strict';
import { getAmbientRegionStyle } from '../js/engine/starfield.js';

test('ambient region style is deterministic and bounded', () => {
  const a = getAmbientRegionStyle(1200, -4500);
  const b = getAmbientRegionStyle(1200, -4500);
  const c = getAmbientRegionStyle(18000, 22000);

  assert.deepEqual(a, b);
  assert.equal(a.color.length, 3);
  for (const channel of a.color) assert.ok(channel >= 0 && channel <= 1);
  assert.ok(a.speedScale >= 0.72 && a.speedScale <= 1.08);
  assert.notDeepEqual(a, c);
});

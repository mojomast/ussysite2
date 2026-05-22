import test from 'node:test';
import assert from 'node:assert/strict';

import {
  capRadarTrajectory,
  shouldDrawEnemyRadarContact,
  worldToRadar
} from '../js/flight/hud.js';

test('worldToRadar maps world x/z into radar canvas coordinates', () => {
  assert.deepEqual(
    worldToRadar({ x: 14, z: 6 }, { x: 10, z: 2 }, 3),
    { x: 12, y: -12 }
  );
});

test('capRadarTrajectory limits trajectory tips to 14px', () => {
  const capped = capRadarTrajectory(30, 40);
  assert.equal(capped.length, 14);
  assert.ok(Math.abs(Math.hypot(capped.x, capped.y) - 14) < 0.000001);
});

test('stunned enemies do not draw radar contacts or trajectory lines', () => {
  const now = performance.now();
  const enemy = {
    visible: true,
    userData: {
      active: true,
      stunUntil: now + 1000,
      velocity: { x: 10, y: 0, z: 0 }
    }
  };

  assert.equal(shouldDrawEnemyRadarContact(enemy, now), false);
});

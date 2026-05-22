import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= {};
globalThis.document ??= { getElementById: () => null };
globalThis.THREE = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  }
};

const { FORMATION_ROLES } = await import('../js/flight/combat-overhaul.js');
const { assignFormationRole } = await import('../js/flight/enemies.js');

test('assignFormationRole returns the expected first wave roles', () => {
  assert.equal(assignFormationRole(0), FORMATION_ROLES.AGGRESSOR);
  assert.equal(assignFormationRole(1), FORMATION_ROLES.FLANKER);
});

test('assignFormationRole picks support or flanker for later enemies', () => {
  assert.equal(assignFormationRole(2, () => 0.6), FORMATION_ROLES.SUPPORT);
  assert.equal(assignFormationRole(2, () => 0.5), FORMATION_ROLES.FLANKER);
});

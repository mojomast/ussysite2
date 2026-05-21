import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= {};
globalThis.document ??= { getElementById: () => null };
globalThis.THREE = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  },
  Quaternion: class {}
};

const {
  COMBAT_PHASES,
  isPlayerDead,
  respawnFlightState,
  transitionCombatPhase
} = await import('../js/flight/combat-state.js');

describe('combat state transitions', () => {
  it('transitions from idle to combat when an enemy enters range', () => {
    const next = transitionCombatPhase(COMBAT_PHASES.IDLE, { type: 'enemyRange', distance: 20, range: 46, armor: 100 });
    assert.equal(next, COMBAT_PHASES.COMBAT, 'enemy inside range should enter combat phase');
  });

  it('transitions from combat to landed when the player docks', () => {
    const next = transitionCombatPhase(COMBAT_PHASES.COMBAT, { type: 'dock', armor: 40 });
    assert.equal(next, COMBAT_PHASES.LANDED, 'dock event should enter landed phase');
  });

  it('triggers death state at zero hull or armor', () => {
    assert.equal(isPlayerDead({ armor: 0 }), true, 'zero armor should be dead');
    assert.equal(transitionCombatPhase(COMBAT_PHASES.COMBAT, { armor: 0 }), COMBAT_PHASES.DEAD, 'zero armor should transition to dead phase');
  });

  it('respawn restores armor, shields, and fuel to base values', () => {
    const state = respawnFlightState({ armor: 0, shield: 0, fuel: 0, fuelDepleted: true });
    assert.equal(state.armor, 100, 'respawn should restore base armor');
    assert.equal(state.shield, 100, 'respawn should restore base shield');
    assert.equal(state.fuel, 100, 'respawn should restore base fuel');
    assert.equal(state.fuelDepleted, false, 'respawn should clear fuel depleted flag');
  });
});

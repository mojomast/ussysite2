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

const { shouldFireEvent } = await import('../js/flight/orchestrator.js');

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
    assert.equal(isPlayerDead({ hull: 0 }), true, 'zero hull should be dead');
    assert.equal(isPlayerDead({ hull: 1 }), false, 'positive hull should not be dead');
    assert.equal(transitionCombatPhase(COMBAT_PHASES.COMBAT, { armor: 0 }), COMBAT_PHASES.DEAD, 'zero armor should transition to dead phase');
  });

  it('respawn restores armor, shields, and fuel to base values', () => {
    const state = respawnFlightState({ hull: 0, armor: 0, shield: 0, fuel: 0, maxHull: 160, maxArmor: 120, maxShield: 140, maxFuel: 80, fuelDepleted: true, combatPhase: COMBAT_PHASES.DEAD });
    assert.equal(state.hull, 160, 'respawn should restore max hull');
    assert.equal(state.armor, 120, 'respawn should restore max armor');
    assert.equal(state.shield, 140, 'respawn should restore max shield');
    assert.equal(state.fuel, 80, 'respawn should restore max fuel');
    assert.equal(state.fuelDepleted, false, 'respawn should clear fuel depleted flag');
    assert.equal(state.combatPhase, COMBAT_PHASES.IDLE, 'respawn should return combat phase to idle');
  });
});

describe('orchestrator client-side gating', () => {
  it('blocks events before the cooldown has elapsed', () => {
    assert.equal(shouldFireEvent({ timeSinceLastEvent: 44, shield: 100 }), false, '44 seconds should still be inside the event cooldown');
  });

  it('allows events once the cooldown has elapsed', () => {
    assert.equal(shouldFireEvent({ timeSinceLastEvent: 46, shield: 100 }), true, '46 seconds should clear the event cooldown');
  });

  it('blocks combat events when shield is too low', () => {
    assert.equal(shouldFireEvent({ timeSinceLastEvent: 60, shield: 25 }), false, 'low shield should block combat events');
  });

  it('allows silence events to bypass the low-shield combat gate', () => {
    assert.equal(shouldFireEvent({ timeSinceLastEvent: 60, shield: 25, eventType: 'SILENCE' }), true, 'silence events should bypass the shield gate');
  });
});

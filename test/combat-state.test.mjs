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
  BOSS_SCORE_THRESHOLDS,
  combatState,
  buildCombatDebriefData,
  consumeCombatDebrief,
  decayKillStreakTimer,
  deserializeCombatState,
  getKillStreakMultiplier,
  isPlayerDead,
  queueCombatDebrief,
  recordCombatHit,
  recordCombatKillStats,
  recordCombatShot,
  recordKillStreak,
  reset,
  resetCombatSessionStats,
  respawnFlightState,
  serializeCombatState,
  setCombatFlightState,
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

describe('boss combat state', () => {
  it('exposes boss score thresholds and reset clears runtime boss fields', () => {
    assert.deepEqual(BOSS_SCORE_THRESHOLDS, [1500, 4000, 8000]);
    const state = { bossActive: true, bossEnemyRef: { id: 'boss' }, bossThresholdIdx: 2 };
    reset(state);
    assert.equal(state.bossActive, false);
    assert.equal(state.bossEnemyRef, null);
    assert.equal(state.bossThresholdIdx, 0);
  });
});

describe('kill streak state', () => {
  it('uses the configured multiplier thresholds', () => {
    assert.equal(getKillStreakMultiplier(1), 1);
    assert.equal(getKillStreakMultiplier(2), 1.5);
    assert.equal(getKillStreakMultiplier(3), 2);
    assert.equal(getKillStreakMultiplier(5), 3);
  });

  it('records kill streak count, multiplier, and peak streak', () => {
    const state = { killStreakCount: 0, killStreakTimer: 0, killStreakMultiplier: 1, lastKillTime: 0, peakKillStreak: 0 };
    recordKillStreak(state, 1000);
    recordKillStreak(state, 2000);
    recordKillStreak(state, 3000);

    assert.equal(state.killStreakCount, 3);
    assert.equal(state.killStreakTimer, 4000);
    assert.equal(state.killStreakMultiplier, 2);
    assert.equal(state.lastKillTime, 3000);
    assert.equal(state.peakKillStreak, 3);
  });

  it('decays kill streak timer and resets count and multiplier', () => {
    const state = { killStreakCount: 3, killStreakTimer: 1000, killStreakMultiplier: 2 };
    decayKillStreakTimer(state, 1.2);

    assert.equal(state.killStreakTimer, 0);
    assert.equal(state.killStreakCount, 0);
    assert.equal(state.killStreakMultiplier, 1);
  });
});

describe('combat debrief state', () => {
  it('populates debrief data from session kills, rewards, and accuracy', () => {
    const state = resetCombatSessionStats({});
    recordCombatShot(5, state);
    recordCombatHit(3, state);
    state.peakKillStreak = 4;
    recordCombatKillStats({ creditsEarned: 180, xpEarned: 42 }, state);
    recordCombatKillStats({ creditsEarned: 220, xpEarned: 58 }, state);

    assert.deepEqual(buildCombatDebriefData(state), {
      kills: 2,
      creditsEarned: 400,
      xpEarned: 100,
      accuracy: 60,
      peakStreak: 4
    });
  });

  it('queues and consumes combat debrief data once', () => {
    const state = resetCombatSessionStats({});
    recordCombatShot(2, state);
    recordCombatHit(1, state);
    recordCombatKillStats({ creditsEarned: 50, xpEarned: 10 }, state);

    const queued = queueCombatDebrief(state);
    assert.equal(state.debriefPending, true);
    assert.equal(queued.accuracy, 50);

    const consumed = consumeCombatDebrief(state);
    assert.equal(consumed.kills, 1);
    assert.equal(state.debriefPending, false);
    assert.equal(state.sessionKills, 0);
    assert.equal(consumeCombatDebrief(state), null);
  });
});

describe('combat state persistence', () => {
  it('serializes and restores flight resources with combat state', () => {
    const sourceFlightState = { ammo: 17, missiles: 2, fuel: 42, maxFuel: 100, fuelDepleted: true, shield: 100 };
    setCombatFlightState(sourceFlightState);
    const encoded = serializeCombatState();

    const targetFlightState = { ammo: 0, missiles: 0, fuel: 0, maxFuel: 100, fuelDepleted: false, shield: 100 };
    setCombatFlightState(targetFlightState);
    assert.equal(deserializeCombatState(encoded), true);

    assert.equal(targetFlightState.ammo, 17);
    assert.equal(targetFlightState.missiles, 2);
    assert.equal(targetFlightState.fuel, 42);
    assert.equal(targetFlightState.fuelDepleted, true);
    assert.deepEqual(combatState.resources, { ammo: 17, missiles: 2, fuel: 42, fuelDepleted: true });
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

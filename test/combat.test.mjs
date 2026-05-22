import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENEMY_CLASSES,
  FORMATION_ROLES,
  WEAPON_DEFS,
  addCombatXp,
  applyDamageModel,
  applyHeatShot,
  applySkillEffects,
  getDifficultyTier,
  getDifficultyMultiplier,
  getMaxShield,
  getStationEquipment,
  simulateBurstFire
} from '../js/flight/combat-overhaul.js';
import { awardXp, combatState } from '../js/flight/combat-state.js';

test('ENEMY_CLASSES has six complete entries', () => {
  assert.equal(ENEMY_CLASSES.length, 6);
  for (const cls of ENEMY_CLASSES) {
    for (const field of ['id', 'label', 'color', 'wingColor', 'health', 'speed', 'fireRate', 'accuracy', 'burstCount', 'creditReward', 'xpReward', 'approachSpeed', 'geometry']) {
      assert.ok(Object.hasOwn(cls, field), `${cls.id} missing ${field}`);
    }
  }
});

test('FORMATION_ROLES exposes aggressor, flanker, and support roles', () => {
  assert.deepEqual(FORMATION_ROLES, {
    AGGRESSOR: 'aggressor',
    FLANKER: 'flanker',
    SUPPORT: 'support'
  });
});

test('WEAPON_DEFS has seven complete entries', () => {
  assert.equal(WEAPON_DEFS.length, 7);
  for (const weapon of WEAPON_DEFS) {
    for (const field of ['cooldown', 'damage', 'energyCost', 'overheatBuildup']) {
      assert.ok(Object.hasOwn(weapon, field), `${weapon.id} missing ${field}`);
    }
  }
});

test('getDifficultyTier boundaries', () => {
  assert.deepEqual([0, 1, 199, 200, 799, 800, 2999, 3000].map(getDifficultyTier), [0, 1, 1, 2, 2, 3, 3, 4]);
});

describe('getDifficultyMultiplier', () => {
  it('returns 1.0 below score 3000', () => {
    assert.equal(getDifficultyMultiplier(0), 1.0);
    assert.equal(getDifficultyMultiplier(2999), 1.0);
  });

  it('returns exactly 1.0 at the ramp start', () => {
    assert.equal(getDifficultyMultiplier(3000), 1.0);
  });

  it('ramps smoothly between 3000 and 11000', () => {
    const at6000 = getDifficultyMultiplier(6000);
    assert.ok(at6000 > 1.3 && at6000 < 1.5,
      `expected multiplier at 6000 to be between 1.3 and 1.5, got ${at6000}`);
  });

  it('reaches the hard cap of 2.0 at score 11000', () => {
    assert.equal(getDifficultyMultiplier(11000), 2.0);
  });

  it('does not exceed 2.0 at extreme scores', () => {
    assert.equal(getDifficultyMultiplier(99999), 2.0);
  });
});

test('applyPlayerDamage bleedthrough model', () => {
  const result = applyDamageModel({ shield: 20, armor: 100 }, 10);
  assert.ok(Math.abs(result.shield - 6.5) <= 0.2);
  assert.ok(Math.abs(result.armor - 96.5) <= 0.2);
});

test('skillTree.applyAll equivalent unlocks eng_1 thrust', () => {
  const flightState = { thrust: 14, damping: 0.985, energy: 100 };
  const combatState = { maxHeat: 100, shieldRegenDelay: 5000 };
  applySkillEffects(new Set(['eng_1']), flightState, combatState);
  assert.equal(flightState.thrust, 17);
});

test('shield_1 max shield is 125', () => {
  assert.equal(getMaxShield(new Set(['shield_1'])), 125);
});

test('burst fire schedules three shots within 400ms', () => {
  assert.equal(simulateBurstFire({ burstCount: 3, burstDelay: 120 }, 400).length, 3);
});

test('heat overheats after four heavy shots', () => {
  const state = { heat: 0, maxHeat: 100, overheated: false };
  for (let i = 0; i < 4; i++) applyHeatShot(state, 30);
  assert.equal(state.heat, 120);
  assert.equal(state.overheated, true);
});

test('security station equipment includes railgun', () => {
  assert.ok(getStationEquipment('security').includes('railgun'));
});

test('XP escalation increases threshold after three points', () => {
  const state = { xp: 0, xpToNextPoint: 100, skillPoints: 0 };
  addCombatXp(state, 1000);
  assert.ok(state.skillPoints >= 3);
  assert.ok(state.xpToNextPoint > 100);
});

test('awardXp increments combatState and rolls over skill points', () => {
  const previous = {
    xp: combatState.xp,
    xpToNextPoint: combatState.xpToNextPoint,
    skillPoints: combatState.skillPoints
  };
  combatState.xp = 95;
  combatState.xpToNextPoint = 100;
  combatState.skillPoints = 3;
  awardXp(10);
  assert.equal(combatState.xp, 5);
  assert.equal(combatState.skillPoints, 4);
  assert.ok(combatState.xpToNextPoint > 100);
  combatState.xp = previous.xp;
  combatState.xpToNextPoint = previous.xpToNextPoint;
  combatState.skillPoints = previous.skillPoints;
});

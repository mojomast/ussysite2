import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= {};
globalThis.document ??= { getElementById: () => null };
globalThis.THREE ??= {};

const {
  ENEMY_CLASSES,
  addCombatXp,
  applyDamageModel,
  applyHeatShot,
  canFireWeapon,
  coolHeat,
  createEnemyStats,
  getAdrenalineState,
  getEnemyClass,
  getEnemyKillReward,
  getWeaponDef
} = await import('../js/flight/combat-overhaul.js');

describe('combat damage and heat math', () => {
  it('bleeds low-shield damage into armor at the expected ratio', () => {
    const result = applyDamageModel({ shield: 20, armor: 100 }, 10);
    assert.equal(result.shield, 6.5, 'low shields should absorb 135% of incoming damage');
    assert.equal(result.armor, 96.5, 'armor should take 35% bleedthrough damage');
  });

  it('accumulates weapon heat and cools per tick', () => {
    const railgun = getWeaponDef('railgun');
    const state = { heat: 0, maxHeat: 100, overheated: false, heatCoolRate: 12 };
    applyHeatShot(state, railgun.overheatBuildup);
    assert.equal(state.heat, 45, 'railgun heat should add its overheat buildup');
    coolHeat(state, 2);
    assert.equal(state.heat, 21, 'heat should cool by heatCoolRate * dt');
  });

  it('locks weapon firing while overheated', () => {
    const state = { heat: 100, maxHeat: 100, overheated: false };
    applyHeatShot(state, 1);
    assert.equal(state.overheated, true, 'state should enter overheated once heat crosses maxHeat');
    assert.equal(canFireWeapon(state), false, 'overheated weapons should refuse to fire');
    coolHeat(state, 20, 12);
    assert.equal(canFireWeapon(state), true, 'weapon should fire again after cooling to zero');
  });
});

describe('combat class data', () => {
  it('activates adrenaline state at the low-armor threshold', () => {
    assert.equal(getAdrenalineState({ armor: 25, maxArmor: 100 }).active, true, '25% armor should trigger adrenaline state');
    assert.equal(getAdrenalineState({ armor: 26, maxArmor: 100 }).active, false, 'above 25% armor should not trigger adrenaline state');
  });

  it('creates enemy stats with expected hull, shield pips, and weapon loadout', () => {
    for (const cls of ENEMY_CLASSES) {
      const stats = createEnemyStats(cls.id);
      assert.equal(stats.hull, cls.health, `${cls.id} hull should match class health`);
      assert.equal(stats.shieldPips, cls.health > 2 ? cls.health - 1 : 0, `${cls.id} shield pips should follow spawn rule`);
      assert.equal(stats.weaponLoadout.fireRate, cls.fireRate, `${cls.id} fireRate should match class fire rate`);
      assert.equal(stats.weaponLoadout.burstCount, cls.burstCount, `${cls.id} burst count should match class burst count`);
    }
  });

  it('returns configured credit and XP rewards for each enemy class', () => {
    for (const cls of ENEMY_CLASSES) {
      const reward = getEnemyKillReward(cls.id);
      assert.equal(reward.credits, cls.creditReward, `${cls.id} credit reward should match class config`);
      assert.equal(reward.xp, cls.xpReward, `${cls.id} XP reward should match class config`);
    }
  });

  it('falls back to scout for unknown enemy class IDs', () => {
    assert.equal(getEnemyClass('missing').id, 'scout', 'unknown enemy class should resolve to scout');
  });

  it('grants kill XP through the shared XP accumulator', () => {
    const eliteReward = getEnemyKillReward('elite');
    const state = { xp: 0, xpToNextPoint: 100, skillPoints: 0 };
    addCombatXp(state, eliteReward.xp);
    assert.equal(state.skillPoints, 1, 'elite XP reward should grant one skill point from zero');
    assert.equal(state.xp, 0, 'elite XP reward should roll over exactly at 100 XP');
  });
});

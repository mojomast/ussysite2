import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= {};
globalThis.document ??= { getElementById: () => null };
globalThis.THREE ??= {};

const {
  ENEMY_CLASSES,
  addCombatXp,
  applyDamageModel,
  applyBurstHeatSequence,
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
      assert.equal(stats.weaponLoadout.burstDelay, cls.burstDelay, `${cls.id} burst delay should match class burst delay`);
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
    assert.equal(state.xp, 20, 'elite XP reward should retain overflow after the first skill point');
  });
});

describe('burst weapon heat sequences', () => {
  it('fires every burst shot in one frame and accumulates heat per shot', () => {
    const scatterCannon = { ...getWeaponDef('scatter_cannon'), burstCount: 3 };
    const state = { heat: 0, maxHeat: 1000, overheated: false };
    const result = applyBurstHeatSequence(state, scatterCannon);

    assert.equal(result.fired.length, scatterCannon.burstCount, 'full burst should fire every requested shot');
    assert.equal(state.heat, scatterCannon.overheatBuildup * scatterCannon.burstCount, 'total heat should equal heat per shot times burst count');
    assert.equal(result.skipped, 0, 'full burst should not skip shots when heat budget is available');
  });

  it('stops firing remaining burst shots after mid-burst overheat', () => {
    const scatterCannon = { ...getWeaponDef('scatter_cannon'), burstCount: 5 };
    const state = { heat: 0, maxHeat: 50, overheated: false };
    const result = applyBurstHeatSequence(state, scatterCannon);

    assert.equal(result.fired.length, 3, 'third scatter shot should cross max heat');
    assert.equal(result.skipped, 2, 'shots after overheat should not fire');
    assert.equal(state.overheated, true, 'state should remain overheated after the crossing shot');
  });

  it('cools a full burst back to zero over multiple ticks', () => {
    const laserBurst = { ...getWeaponDef('laser_mk1'), burstCount: 3 };
    const state = { heat: 0, maxHeat: 100, overheated: false, heatCoolRate: 6 };
    applyBurstHeatSequence(state, laserBurst);

    for (let tick = 0; tick < 4; tick += 1) coolHeat(state, 1);

    assert.equal(state.heat, 0, 'four one-second cooldown ticks at 6 heat/s should clear 24 burst heat');
    assert.equal(state.overheated, false, 'cleared heat should not leave the weapon overheated');
  });

  it('keeps separate burst weapon heat state independent', () => {
    const scatterBurst = { ...getWeaponDef('scatter_cannon'), burstCount: 2 };
    const laserBurst = { ...getWeaponDef('laser_mk2'), burstCount: 3 };
    const scatterState = { heat: 0, maxHeat: 100, overheated: false };
    const laserState = { heat: 0, maxHeat: 100, overheated: false };

    applyBurstHeatSequence(scatterState, scatterBurst);
    applyBurstHeatSequence(laserState, laserBurst);
    coolHeat(scatterState, 1, 12);

    assert.equal(scatterState.heat, 32, 'scatter heat should cool only in its own state object');
    assert.equal(laserState.heat, 42, 'laser burst heat should remain unchanged in a separate state object');
  });
});

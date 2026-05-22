import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  RUN_STATE_KEY,
  applyRunState,
  clearRunState,
  loadRunState,
  saveRunState
} = await import('../js/flight/persist.js');

function createSessionStorageMock() {
  const store = new Map();
  return {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => { store.clear(); }
  };
}

function validState(overrides = {}) {
  const { combat: combatOverrides, trader: traderOverrides, rep: repOverrides, ...stateOverrides } = overrides;
  return {
    v: 3,
    ts: 1234,
    combat: {
      score: 12,
      wave: 2,
      credits: 450,
      hull: 80,
      shieldHp: 40,
      maxShieldHp: 125,
      maxHull: 100,
      bossThresholdIdx: 1,
      killCount: 3,
      ...combatOverrides
    },
    trader: {
      equippedPrimary: 'laser_mk2',
      equippedSecondary: 'missile_rack',
      inventory: ['laser_mk1', 'laser_mk2', 'missile_rack'],
      activeMissions: [],
      completedMissionIds: [],
      bountyLevel: 0,
      ...traderOverrides
    },
    rep: {
      core: 5,
      tools: -2,
      ...repOverrides
    },
    skills: ['hull_1', 'shield_1'],
    ...stateOverrides
  };
}

beforeEach(() => {
  globalThis.sessionStorage = createSessionStorageMock();
  globalThis.performance = { now: () => 9876 };
});

describe('run state session persistence', () => {
  it('saves schema v3 to sessionStorage only', () => {
    const combatState = {
      score: 9,
      waveNumber: 3,
      armor: 77,
      shield: 66,
      bossThresholdIdx: 2,
      sessionKills: 4,
      activeIntercept: { id: 'intercept-1' },
      primaryWeapon: 'laser_mk2',
      secondaryWeapon: 'railgun',
      ownedWeapons: new Set(['laser_mk1', 'laser_mk2', 'railgun']),
      unlocked: new Set(['hull_1'])
    };
    const traderState = { credits: 321 };
    const reputationState = { scores: { core: 10 } };
    const skillTree = { unlocked: new Set(['hull_1']), getMaxShield: () => 150, getMaxArmor: () => 120 };

    assert.equal(saveRunState(combatState, traderState, reputationState, skillTree, { flightState: { civilianTraffic: { ships: [{ id: 'civ-1' }] } } }), true);
    const saved = JSON.parse(globalThis.sessionStorage.getItem(RUN_STATE_KEY));

    assert.equal(saved.v, 3);
    assert.equal(saved.ts, 9876);
    assert.equal(saved.combat.score, 9);
    assert.equal(saved.combat.wave, 3);
    assert.equal(saved.combat.credits, 321);
    assert.equal(saved.combat.hull, 77);
    assert.equal(saved.combat.shieldHp, 66);
    assert.deepEqual(saved.trader.inventory, ['laser_mk1', 'laser_mk2', 'railgun']);
    assert.deepEqual(saved.trader.activeMissions, []);
    assert.deepEqual(saved.trader.completedMissionIds, []);
    assert.equal(saved.trader.bountyLevel, 0);
    assert.equal(saved.combat.activeIntercept, undefined);
    assert.equal(saved.flight, undefined);
    assert.deepEqual(saved.skills, ['hull_1']);
  });

  it('migrates schema v2 saves to schema v3 defaults', () => {
    globalThis.sessionStorage.setItem(RUN_STATE_KEY, JSON.stringify({
      ...validState(),
      v: 2,
      trader: {
        equippedPrimary: 'laser_mk2',
        equippedSecondary: 'missile_rack',
        inventory: ['laser_mk1']
      }
    }));

    const loaded = loadRunState();

    assert.equal(loaded.v, 3);
    assert.deepEqual(loaded.trader.activeMissions, []);
    assert.deepEqual(loaded.trader.completedMissionIds, []);
    assert.equal(loaded.trader.bountyLevel, 0);
    assert.deepEqual(loaded.flight.surface, { state: 'NONE', planetId: null });
  });

  it('returns null for schema v1 saves after schema bump', () => {
    globalThis.sessionStorage.setItem(RUN_STATE_KEY, JSON.stringify({ ...validState(), v: 1 }));
    assert.equal(loadRunState(), null);
  });

  it('round-trips player position through save and apply', () => {
    const flightState = { pos: { x: 12, y: -3, z: 99 } };
    const restoredFlightState = { pos: { x: 0, y: 0, z: 0 } };

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      {},
      {},
      {},
      { flightState }
    ), true);
    const saved = loadRunState();

    assert.deepEqual(saved.flight.position, [12, -3, 99]);
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, {}, {}, { unlocked: new Set() }, { flightState: restoredFlightState }), true);
    assert.deepEqual(restoredFlightState.pos, { x: 12, y: -3, z: 99 });
  });

  it('saves and restores the last visited body id', () => {
    const bodies = [
      { id: 'far-station', pos: [100, 0, 0] },
      { id: 'near-planet', pos: [8, 0, 0] }
    ];
    const flightState = { pos: { x: 10, y: 0, z: 0 } };
    const restoredFlightState = { pos: { x: 0, y: 0, z: 0 } };

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      {},
      {},
      {},
      { flightState, bodies }
    ), true);
    const saved = loadRunState();

    assert.equal(saved.flight.lastVisitedBodyId, 'near-planet');
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, {}, {}, { unlocked: new Set() }, { flightState: restoredFlightState }), true);
    assert.equal(restoredFlightState.lastVisitedBodyId, 'near-planet');
  });

  it('restores an active autopilot target by plotting a course when callbacks are provided', () => {
    const flightState = {
      pos: { x: 0, y: 0, z: 0 },
      autopilot: { state: 'ENGAGED', targetId: 'hub-alpha' }
    };
    const plotted = [];

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      {},
      {},
      {},
      { flightState }
    ), true);
    const saved = loadRunState();

    assert.equal(saved.flight.autopilotTargetId, 'hub-alpha');
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, {}, {}, { unlocked: new Set() }, {
      flightState: { pos: { x: 0, y: 0, z: 0 } },
      navGraph: new Map(),
      plotCourse: (_flightState, navGraph, targetId) => plotted.push({ navGraph, targetId })
    }), true);
    assert.equal(plotted.length, 1);
    assert.equal(plotted[0].targetId, 'hub-alpha');
  });

  it('round-trips active missions through save and apply', () => {
    const mission = { id: 'mission-1', type: 'DELIVERY', status: 'ACTIVE', progress: { delivered: false } };
    const traderState = { activeMissions: [mission], completedMissionIds: ['mission-0'] };
    const restoredTraderState = {};

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      traderState,
      {},
      {}
    ), true);
    const saved = loadRunState();

    assert.deepEqual(saved.trader.activeMissions, [mission]);
    assert.deepEqual(saved.trader.completedMissionIds, ['mission-0']);
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, restoredTraderState, {}, { unlocked: new Set() }), true);
    assert.deepEqual(restoredTraderState.activeMissions, [mission]);
    assert.deepEqual(restoredTraderState.completedMissionIds, ['mission-0']);
  });

  it('round-trips bountyLevel through save and apply', () => {
    const restoredTraderState = {};

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      { bountyLevel: 42 },
      {},
      {}
    ), true);
    const saved = loadRunState();

    assert.equal(saved.trader.bountyLevel, 42);
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, restoredTraderState, {}, { unlocked: new Set() }), true);
    assert.equal(restoredTraderState.bountyLevel, 42);
  });

  it('round-trips surface planetId through save and apply', () => {
    const flightState = { surface: { state: 'SURFACE', planetId: 'planet-ferrous', ignoredTransient: true } };
    const restoredFlightState = {};

    assert.equal(saveRunState(
      { primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' },
      {},
      {},
      {},
      { flightState }
    ), true);
    const saved = loadRunState();

    assert.deepEqual(saved.flight.surface, { state: 'SURFACE', planetId: 'planet-ferrous' });
    assert.equal(applyRunState(saved, { ownedWeapons: new Set(), unlocked: new Set() }, {}, {}, { unlocked: new Set() }, { flightState: restoredFlightState }), true);
    assert.deepEqual(restoredFlightState.surface, { state: 'SURFACE', planetId: 'planet-ferrous' });
  });

  it('loads and clears saved state with storage errors contained', () => {
    globalThis.sessionStorage.setItem(RUN_STATE_KEY, JSON.stringify(validState()));
    assert.equal(loadRunState().combat.wave, 2);
    assert.equal(clearRunState(), true);
    assert.equal(loadRunState(), null);

    globalThis.sessionStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    assert.equal(loadRunState(), null);
    assert.equal(saveRunState({}, {}, {}, {}), false);
    assert.equal(clearRunState(), false);
  });

  it('applies valid state atomically to combat, trader, reputation, and skills', () => {
    const combatState = { ownedWeapons: new Set(), unlocked: new Set(), primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' };
    const traderState = { credits: 0 };
    const reputationState = { scores: { core: 0, tools: 0 } };
    const skillTree = { unlocked: new Set() };

    assert.equal(applyRunState(validState(), combatState, traderState, reputationState, skillTree), true);

    assert.equal(combatState.score, 12);
    assert.equal(combatState.waveNumber, 2);
    assert.equal(combatState.armor, 80);
    assert.equal(combatState.shield, 40);
    assert.equal(combatState.sessionKills, 3);
    assert.equal(combatState.primaryWeapon, 'laser_mk2');
    assert.deepEqual([...combatState.ownedWeapons], ['laser_mk1', 'laser_mk2', 'missile_rack']);
    assert.equal(traderState.credits, 450);
    assert.deepEqual(reputationState.scores, { core: 5, tools: -2 });
    assert.deepEqual([...skillTree.unlocked], ['hull_1', 'shield_1']);
  });

  it('rejects corrupted or invalid combat fields before assignment', () => {
    const combatState = { score: 1, ownedWeapons: new Set(), unlocked: new Set() };
    const invalidHull = validState({ combat: { hull: 101, maxHull: 100 } });
    const invalidWave = validState({ combat: { wave: 0 } });
    const invalidScore = validState({ combat: { score: -1 } });

    assert.equal(applyRunState(invalidHull, combatState, {}, {}, { unlocked: new Set() }), false);
    assert.equal(applyRunState(invalidWave, combatState, {}, {}, { unlocked: new Set() }), false);
    assert.equal(applyRunState(invalidScore, combatState, {}, {}, { unlocked: new Set() }), false);
    assert.equal(applyRunState({ bad: true }, combatState, {}, {}, { unlocked: new Set() }), false);
    assert.equal(combatState.score, 1);
  });
});

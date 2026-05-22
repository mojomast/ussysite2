import test from 'node:test';
import assert from 'node:assert/strict';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}

globalThis.THREE = { Vector3 };

const {
  HUNTER_FACTIONS,
  HUNTER_TIERS,
  checkHunterDestroyed,
  checkHunterFlee,
  getTierForBounty,
  shouldTriggerIntercept,
  triggerIntercept
} = await import('../js/flight/hunters.js');
const { createAutopilotState } = await import('../js/flight/autopilot.js');
const { combatState, resetCombatSessionStats } = await import('../js/flight/combat-state.js');
const { traderState } = await import('../js/economy/trader.js');

test('hunter constants expose factions and bounty tiers', () => {
  assert.equal(Object.keys(HUNTER_FACTIONS).length, 3);
  assert.equal(HUNTER_FACTIONS.VEGA_CORP.callsign, 'VEGA ENFORCEMENT');
  assert.equal(HUNTER_TIERS.SCOUT.id, 'SCOUT');
  assert.equal(getTierForBounty(499), null);
  assert.equal(getTierForBounty(500).id, 'SCOUT');
  assert.equal(getTierForBounty(1500).shipCount, 2);
  assert.equal(getTierForBounty(3000).id, 'SQUADRON');
});

test('shouldTriggerIntercept gates by node arrival, bounty, cooldown, and roll', () => {
  const state = { bossActive: false, activeIntercept: null, lastNodeArrival: null };
  const trader = { bountyLevel: 500, interceptCooldown: 0 };
  const node = { id: 'station-a', type: 'station' };

  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 1000, random: () => 0.39 }).id, 'SCOUT');
  assert.equal(state.lastNodeArrival, 'station-a');
  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 1001, random: () => 0 }), false);

  state.lastNodeArrival = null;
  trader.interceptCooldown = 5000;
  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 1001, random: () => 0 }), false);

  trader.interceptCooldown = 0;
  state.bossActive = true;
  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 6000, random: () => 0 }), false);
});

test('shouldTriggerIntercept does not consume node arrival below bounty threshold', () => {
  const state = { bossActive: false, activeIntercept: null, lastNodeArrival: null };
  const trader = { bountyLevel: 499, interceptCooldown: 0 };
  const node = { id: 'station-threshold', type: 'station' };

  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 1000, random: () => 0 }), false);
  assert.equal(state.lastNodeArrival, null);

  trader.bountyLevel = 500;
  assert.equal(shouldTriggerIntercept({ combatState: state, traderState: trader, node, now: 1001, random: () => 0 }).id, 'SCOUT');
  assert.equal(state.lastNodeArrival, 'station-threshold');
});

test('triggerIntercept disengages autopilot and marks spawned hunters', () => {
  const state = { activeIntercept: null };
  const trader = { bountyLevel: 1600, interceptCooldown: 0 };
  const flightState = { pos: new Vector3(), autopilot: { ...createAutopilotState(), state: 'ENGAGED', route: ['a', 'b'], hyperspeedMult: 7 } };
  const pool = [{ userData: {} }, { userData: {} }];
  const killFeed = [];
  const spawned = [];

  const intercept = triggerIntercept({
    combatState: state,
    traderState: trader,
    flightState,
    enemyPool: pool,
    tier: HUNTER_TIERS.WING,
    node: { id: 'jump-a', type: 'jump' },
    random: () => 0,
    now: 2000,
    addKillFeedEntry: text => killFeed.push(text),
    spawnEnemy: (enemy, offset, delay, classId) => {
      enemy.userData = { active: true, classId };
      spawned.push({ offset, delay, classId });
    }
  });

  assert.equal(intercept.tier, 'WING');
  assert.equal(flightState.autopilot.state, 'IDLE');
  assert.equal(flightState.autopilot.hyperspeedMult, 1);
  assert.equal(spawned.length, 2);
  assert.equal(pool[0].userData.isHunter, true);
  assert.equal(pool[0].userData.faction, 'VEGA_CORP');
  assert.equal(pool[0].userData.hunterName, 'MARSHAL VANCE');
  assert.equal(pool[0].userData.maxHealth, 6);
  assert.equal(pool[1].userData.maxHealth, 5);
  assert.ok(killFeed[0].includes('YOUR BOUNTY IS 1600c'));
  assert.equal(trader.interceptCooldown, 2000 + HUNTER_TIERS.WING.cooldownMs);
});

test('triggerIntercept creates fallback enemy entries when no pool factory is available', () => {
  const pool = [];
  const intercept = triggerIntercept({
    combatState: {},
    traderState: { bountyLevel: 500, interceptCooldown: 0 },
    flightState: { pos: new Vector3(10, 0, 20), autopilot: createAutopilotState() },
    enemyPool: pool,
    tier: HUNTER_TIERS.SCOUT,
    random: () => 0,
    now: 3000
  });

  assert.equal(intercept.hunters.length, 1);
  assert.equal(pool.length, 1);
  assert.equal(pool[0].userData.isHunter, true);
  assert.equal(pool[0].position.x, 130);
});

test('triggerIntercept uses Date.now for omitted cooldown timestamps', (t) => {
  let currentNow = 1_000_000;
  t.mock.method(Date, 'now', () => currentNow);

  const trader = { bountyLevel: 500, interceptCooldown: 0 };
  const intercept = triggerIntercept({
    combatState: {},
    traderState: trader,
    flightState: { pos: new Vector3(), autopilot: createAutopilotState() },
    enemyPool: [],
    tier: HUNTER_TIERS.SCOUT,
    random: () => 0
  });

  assert.equal(intercept.tier, 'SCOUT');
  assert.equal(trader.interceptCooldown, currentNow + HUNTER_TIERS.SCOUT.cooldownMs);

  currentNow += 1;
  const blockedState = { bossActive: false, activeIntercept: null, lastNodeArrival: null };
  const node = { id: 'date-clock-node', type: 'station' };
  assert.equal(shouldTriggerIntercept({ combatState: blockedState, traderState: trader, node, random: () => 0 }), false);
  assert.equal(blockedState.lastNodeArrival, null);

  currentNow = trader.interceptCooldown + 1;
  assert.equal(shouldTriggerIntercept({ combatState: blockedState, traderState: trader, node, random: () => 0 }).id, 'SCOUT');
});

test('hunter flee increases bounty and clears intercept when no hunters remain', () => {
  const enemy = { userData: { active: true, isHunter: true, health: 1, maxHealth: 5, factionName: 'REDLINE RECLAIMERS', hunterName: 'CLAIMJUMP', bountyInterceptId: 'i1' } };
  const state = { activeIntercept: { id: 'i1' } };
  const trader = { bountyLevel: 500 };
  const killFeed = [];

  assert.equal(checkHunterFlee(enemy, { combatState: state, traderState: trader, enemies: [enemy], addKillFeedEntry: text => killFeed.push(text), deactivateCombatObject: target => { target.userData.active = false; }, now: 4000 }), true);
  assert.equal(trader.bountyLevel, 700);
  assert.equal(enemy.userData.fleeing, true);
  assert.equal(state.activeIntercept, null);
  assert.ok(killFeed[0].includes('BOUNTY +200'));
});

test('hunter flee splices enemy from active intercept hunters', () => {
  const enemy = { userData: { active: true, isHunter: true, health: 1, maxHealth: 5, bountyInterceptId: 'i-flee' } };
  const wingmate = { userData: { active: true, isHunter: true, bountyInterceptId: 'i-flee' } };
  const state = { activeIntercept: { id: 'i-flee', hunters: [enemy, wingmate] } };
  const trader = { bountyLevel: 500 };

  assert.equal(checkHunterFlee(enemy, { combatState: state, traderState: trader, enemies: [enemy, wingmate], deactivateCombatObject: target => { target.userData.active = false; }, now: 4000 }), true);
  assert.deepEqual(state.activeIntercept.hunters, [wingmate]);
});

test('hunter destroyed lowers bounty and clears active intercept when group is gone', () => {
  const enemy = { userData: { active: true, isHunter: true, bountyInterceptId: 'i2' } };
  const state = { activeIntercept: { id: 'i2' } };
  const trader = { bountyLevel: 500 };

  assert.equal(checkHunterDestroyed(enemy, { combatState: state, traderState: trader, enemies: [enemy] }), true);
  assert.equal(trader.bountyLevel, 350);
  assert.equal(state.activeIntercept, null);
  assert.equal(checkHunterDestroyed(enemy, { combatState: state, traderState: trader, enemies: [enemy] }), false);
  assert.equal(trader.bountyLevel, 350);
});

test('hunter destroyed splices enemy from active intercept hunters', () => {
  const enemy = { userData: { active: true, isHunter: true, bountyInterceptId: 'i-destroy' } };
  const wingmate = { userData: { active: true, isHunter: true, bountyInterceptId: 'i-destroy' } };
  const state = { activeIntercept: { id: 'i-destroy', hunters: [enemy, wingmate] } };
  const trader = { bountyLevel: 500 };

  assert.equal(checkHunterDestroyed(enemy, { combatState: state, traderState: trader, enemies: [enemy, wingmate] }), true);
  assert.deepEqual(state.activeIntercept.hunters, [wingmate]);
});

test('combat and trader states expose hunter runtime fields', () => {
  traderState.bountyLevel = 0;
  traderState.interceptCooldown = 0;
  combatState.activeIntercept = { id: 'runtime-only' };
  resetCombatSessionStats(combatState);
  assert.equal(combatState.activeIntercept, null);
  assert.equal(typeof traderState.bountyLevel, 'number');
  assert.equal(typeof traderState.interceptCooldown, 'number');
});

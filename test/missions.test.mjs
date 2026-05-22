import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.THREE = {
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    distanceTo(other) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dz = this.z - other.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
};

const { buildNavGraph } = await import('../js/flight/navgraph.js');
const { saveRunState, loadRunState, applyRunState, RUN_STATE_KEY } = await import('../js/flight/persist.js');
const {
  MISSION_TYPES,
  acceptMission,
  checkMissionProgress,
  completeMission,
  createMission,
  declineMission,
  generateMissionsForStation
} = await import('../js/flight/missions.js');
const { STATIONS } = await import('../js/flight/world.js');

function storageMock() {
  const store = new Map();
  return {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  };
}

function graph() {
  return buildNavGraph();
}

describe('mission board core', () => {
  it('createMission returns the requested default schema', () => {
    assert.deepEqual(createMission({ id: 'm1', reward: 100 }), {
      id: 'm1',
      title: '',
      description: '',
      type: MISSION_TYPES.BOUNTY,
      issuer: null,
      targetId: null,
      objective: '',
      reward: 100,
      reputationReward: 0,
      timeLimit: null,
      status: 'AVAILABLE',
      killTarget: null,
      deliveryItem: null,
      acceptedAt: null
    });
  });

  it('generates deterministic 3-5 mission boards by station and seed', () => {
    const navGraph = graph();
    const station = STATIONS.find(item => item.id === 'hub-alpha');
    const first = generateMissionsForStation(station, navGraph, 42);
    const second = generateMissionsForStation(station, navGraph, 42);

    assert.ok(first.length >= 3 && first.length <= 5);
    assert.deepEqual(first, second);
    assert.ok(first.every(mission => [MISSION_TYPES.DELIVERY, MISSION_TYPES.ESCORT, MISSION_TYPES.SCAN].includes(mission.type)));
  });

  it('applies station type rules and reward/time ranges', () => {
    const navGraph = graph();
    const outpost = generateMissionsForStation(STATIONS.find(item => item.id === 'relay-7'), navGraph, 7);
    const military = generateMissionsForStation(STATIONS.find(item => item.id === 'fort-kova'), navGraph, 7);

    assert.ok(outpost.every(mission => [MISSION_TYPES.BOUNTY, MISSION_TYPES.PATROL].includes(mission.type)));
    assert.ok(military.every(mission => [MISSION_TYPES.BOUNTY, MISSION_TYPES.PATROL, MISSION_TYPES.ESCORT].includes(mission.type)));
    for (const mission of [...outpost, ...military]) {
      assert.ok(mission.reward >= 500 && mission.reward <= 2000);
      if (mission.type === MISSION_TYPES.ESCORT) assert.equal(mission.timeLimit, 240);
    }
  });

  it('accepts max three active missions and records declined ids', () => {
    const missions = generateMissionsForStation(STATIONS.find(item => item.id === 'hub-alpha'), graph(), 1);
    const traderState = { credits: 0 };

    assert.equal(acceptMission(traderState, missions[0], 100).ok, true);
    assert.equal(acceptMission(traderState, missions[1], 100).ok, true);
    assert.equal(acceptMission(traderState, missions[2], 100).ok, true);
    assert.equal(acceptMission(traderState, missions[3], 100).ok, false);
    assert.equal(traderState.activeMissions.length, 3);

    assert.equal(declineMission(traderState, missions[3]).ok, true);
    assert.deepEqual(traderState.missionBoard.declinedMissionIds, [missions[3].id]);
  });

  it('filters completed and declined missions from generation', () => {
    const navGraph = graph();
    const station = STATIONS.find(item => item.id === 'hub-alpha');
    const missions = generateMissionsForStation(station, navGraph, 5);
    const traderState = {
      completedMissionIds: [missions[0].id],
      missionBoard: { declinedMissionIds: [missions[1].id] }
    };

    const filtered = generateMissionsForStation(station, navGraph, 5, traderState);
    assert.equal(filtered.some(mission => mission.id === missions[0].id), false);
    assert.equal(filtered.some(mission => mission.id === missions[1].id), false);
  });

  it('progresses delivery, patrol, and escort on autopilot arrival at target', () => {
    const navGraph = graph();
    const traderState = { activeMissions: [] };
    const missions = generateMissionsForStation(STATIONS.find(item => item.id === 'hub-alpha'), navGraph, 3)
      .filter(mission => [MISSION_TYPES.DELIVERY, MISSION_TYPES.ESCORT].includes(mission.type));
    const patrol = generateMissionsForStation(STATIONS.find(item => item.id === 'relay-7'), navGraph, 3)
      .find(mission => mission.type === MISSION_TYPES.PATROL);
    for (const mission of [...missions.slice(0, 2), patrol]) traderState.activeMissions.push({ ...mission, status: 'ACTIVE', acceptedAt: 0 });

    for (const mission of traderState.activeMissions) {
      checkMissionProgress(traderState, { autopilot: { state: 'ARRIVED', targetId: mission.targetId } }, {}, navGraph, 1000);
      assert.equal(mission.objective.current, mission.objective.required);
    }
  });

  it('progresses scan proximity and bounty kills by last killed type', () => {
    const navGraph = graph();
    const scan = generateMissionsForStation(STATIONS.find(item => item.id === 'hub-alpha'), navGraph, 4).find(mission => mission.type === MISSION_TYPES.SCAN);
    const bounty = generateMissionsForStation(STATIONS.find(item => item.id === 'fort-kova'), navGraph, 4).find(mission => mission.type === MISSION_TYPES.BOUNTY);
    const traderState = { activeMissions: [{ ...scan, status: 'ACTIVE', acceptedAt: 0 }, { ...bounty, status: 'ACTIVE', acceptedAt: 0 }] };
    const scanNode = navGraph.get(scan.targetId);

    checkMissionProgress(traderState, { pos: scanNode.pos }, {}, navGraph, 1000);
    assert.equal(traderState.activeMissions[0].objective.current, 1);

    checkMissionProgress(traderState, {}, { lastKilledType: bounty.killTarget.classId, lastKilledAt: 1 }, navGraph, 1000);
    assert.equal(traderState.activeMissions[1].objective.current, 1);
  });

  it('expires timed missions and completes rewards/reputation', () => {
    const mission = generateMissionsForStation(STATIONS.find(item => item.id === 'hub-alpha'), graph(), 8).find(item => item.type === MISSION_TYPES.DELIVERY);
    const traderState = { credits: 100, activeMissions: [{ ...mission, status: 'ACTIVE', acceptedAt: 0 }], completedMissionIds: [] };
    const reputationState = { scores: { [mission.reputationReward.faction]: 0 } };

    checkMissionProgress(traderState, {}, {}, graph(), 301000);
    assert.equal(traderState.activeMissions[0].status, 'FAILED');

    traderState.activeMissions[0].status = 'ACTIVE';
    traderState.activeMissions[0].objective.current = traderState.activeMissions[0].objective.required;
    assert.equal(completeMission(traderState, mission.id, { reputationState }).success, true);
    assert.equal(traderState.credits, 100 + mission.reward);
    assert.equal(reputationState.scores[mission.reputationReward.faction], mission.reputationReward.amount);
    assert.deepEqual(traderState.completedMissionIds, [mission.id]);
    assert.equal(traderState.activeMissions.length, 0);
  });

  it('persists active missions and completed mission ids in schema v3', () => {
    globalThis.sessionStorage = storageMock();
    globalThis.performance = { now: () => 999 };
    const mission = generateMissionsForStation(STATIONS.find(item => item.id === 'relay-7'), graph(), 2)[0];
    const traderState = { credits: 50, activeMissions: [{ ...mission, status: 'ACTIVE', acceptedAt: 10 }], completedMissionIds: ['done'] };

    assert.equal(saveRunState({ primaryWeapon: 'laser_mk1', secondaryWeapon: 'missile_rack' }, traderState, {}, {}), true);
    const raw = JSON.parse(globalThis.sessionStorage.getItem(RUN_STATE_KEY));
    assert.equal(raw.v, 3);
    assert.equal(raw.trader.activeMissions[0].id, mission.id);

    const restoredTrader = {};
    assert.equal(applyRunState(loadRunState(), { ownedWeapons: new Set(), unlocked: new Set() }, restoredTrader, {}, { unlocked: new Set() }), true);
    assert.equal(restoredTrader.activeMissions[0].id, mission.id);
    assert.deepEqual(restoredTrader.completedMissionIds, ['done']);
  });
});

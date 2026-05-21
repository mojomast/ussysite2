import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { USSY_PROJECTS: [{ id: 'devussy', category: 'core', name: 'Devussy' }] };
globalThis.document ??= { getElementById: () => null };
globalThis.THREE = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  },
  Quaternion: class {}
};

const {
  abandonMission,
  completeMissionObjective,
  createMissionFromGameState,
  resolveMissionReward
} = await import('../js/flight/mission.js');

describe('mission unit helpers', () => {
  it('spawns a bounty mission when hostiles are present', () => {
    const mission = createMissionFromGameState({ stationId: 'devussy', hostileCount: 3, tick: 1 });
    assert.equal(mission.type, 'bounty', 'hostile game state should produce bounty mission');
    assert.equal(mission.objective.type, 'kills', 'bounty objective should track kills');
    assert.equal(mission.objective.target, 3, 'bounty target should match hostile count');
  });

  it('marks a mission complete when objective progress reaches target', () => {
    const mission = createMissionFromGameState({ cargoUsed: 1 });
    const complete = completeMissionObjective(mission, 1);
    assert.equal(complete.status, 'complete', 'completed objective should set mission status complete');
    assert.equal(complete.objective.progress, complete.objective.target, 'progress should be capped at target');
  });

  it('grants credits and fuel after completion', () => {
    const mission = completeMissionObjective(createMissionFromGameState({ cargoUsed: 1 }), 1);
    const player = resolveMissionReward({ credits: 20, fuel: 50, maxFuel: 100 }, mission);
    assert.equal(player.credits, 120, 'delivery completion should add reward credits');
    assert.equal(player.fuel, 60, 'delivery completion should add reward fuel');
  });

  it('clears active state when abandoned', () => {
    const mission = createMissionFromGameState({ hostileCount: 1 });
    const abandoned = abandonMission(mission);
    assert.equal(abandoned.status, 'abandoned', 'abandoned mission should set abandoned status');
    assert.equal(abandoned.active, false, 'abandoned mission should not remain active');
  });
});

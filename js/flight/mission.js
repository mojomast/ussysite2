import { flightState } from './state.js';
import { traderState, refuelAt } from '../economy/trader.js';

export function startTutorialMission() {}
export function setMissionStep() {}
export function updateMission() {}
export function registerMissionKill() {}
export function handleMissionLanding() { return true; }
export function spawnTutorialBogeys() {}
export function getMissionLandingProjectName() { return 'Devussy'; }
export function getProjectNodeName(node) { return node?.userData?.project?.name || 'UNKNOWN'; }
export function restockAtProject(project) {
  if (project?.id) refuelAt(project.id, { free: true, silent: true });
  flightState.fuel = traderState.fuel;
  flightState.fuelDepleted = false;
}
export function landOnNearestProject() {}
export function updateProjectLandingTarget() {}

export function createMissionFromGameState(gameState = {}) {
  const id = `mission-${gameState.stationId || 'local'}-${gameState.tick ?? 0}`;
  if ((gameState.hostileCount ?? 0) > 0) {
    return { id, type: 'bounty', status: 'active', objective: { type: 'kills', target: Math.max(1, gameState.hostileCount), progress: 0 }, rewards: { credits: 150, fuel: 0 } };
  }
  if ((gameState.cargoUsed ?? 0) > 0) {
    return { id, type: 'delivery', status: 'active', objective: { type: 'delivery', target: 1, progress: 0 }, rewards: { credits: 100, fuel: 10 } };
  }
  return { id, type: 'survey', status: 'active', objective: { type: 'land', target: 1, progress: 0 }, rewards: { credits: 50, fuel: 5 } };
}

export function completeMissionObjective(mission, amount = 1) {
  const next = { ...mission, objective: { ...mission.objective } };
  next.objective.progress = Math.min(next.objective.target, next.objective.progress + amount);
  if (next.objective.progress >= next.objective.target) next.status = 'complete';
  return next;
}

export function resolveMissionReward(playerState, mission) {
  if (mission.status !== 'complete') return playerState;
  playerState.credits = (playerState.credits ?? 0) + (mission.rewards?.credits ?? 0);
  playerState.fuel = Math.min(playerState.maxFuel ?? 100, (playerState.fuel ?? 0) + (mission.rewards?.fuel ?? 0));
  return playerState;
}

export function abandonMission(mission) {
  return { ...mission, status: 'abandoned', active: false };
}

export function checkMissionExpiry(mission, currentTick) {
  if (!mission || mission.status !== 'active' || mission.ttl == null) return mission;
  const startedAt = mission.startedAt ?? mission.createdAt ?? 0;
  if ((currentTick - startedAt) <= mission.ttl) return mission;
  return { ...mission, status: 'expired', active: false };
}

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

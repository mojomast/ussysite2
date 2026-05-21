export const MISSION_INTRO_TEXT = 'DOGFIGHT LINK ESTABLISHED. CONGRATULATIONS, OPERATOR: YOU FOUND THE USSYVERSE EASTER EGG. YOU ARE NOW PILOTING A SCRAP-CLASS COCKPIT THROUGH THE PROJECT CONSTELLATION. CONTROL REFERENCE IS LIVE ON YOUR HUD. FIRST OBJECTIVE: HUNT DOWN 5 TUTORIAL BOGEYS AS THEY TELEPORT INTO THE AO.';

export const BUILTIN_MISSION_CONTRACTS = [
  {
    id: 'patrol-sweep',
    title: 'Patrol Sweep',
    description: 'Clear a pirate scout wing, then dock at any project station for a 300cr bounty.',
    rewardCredits: 300,
    steps: [
      { id: 'patrol-clear', type: 'kills', label: 'Clear Pirate Scouts', detail: 'Destroy 3 hostile contacts before they push into the project graph.', target: 3, spawnEnemies: 3 },
      { id: 'patrol-dock', type: 'land', label: 'Dock For Bounty', detail: 'Land at any project station to transmit proof of sweep completion.' }
    ]
  },
  {
    id: 'market-proving-run',
    title: 'Market Proving Run',
    description: 'Buy any cargo, fly to a different station, sell cargo, and pocket a 150cr route bonus.',
    rewardCredits: 150,
    steps: [
      { id: 'market-buy', type: 'trade', action: 'buy', label: 'Buy Cargo', detail: 'Open a cargo market and buy at least 1 unit of any commodity.', target: 1 },
      { id: 'market-dock-away', type: 'landDifferent', label: 'Change Markets', detail: 'Fly to a different project station before selling.', target: 1 },
      { id: 'market-sell', type: 'trade', action: 'sell', label: 'Sell Cargo', detail: 'Sell at least 1 unit from your hold to complete the run.', target: 1 }
    ]
  },
  {
    id: 'constellation-survey',
    title: 'Constellation Survey',
    description: 'Visit two different project stations and transmit survey telemetry for 200cr.',
    rewardCredits: 200,
    steps: [
      { id: 'survey-first', type: 'land', label: 'Survey First Node', detail: 'Land at any project node to capture local telemetry.', target: 1 },
      { id: 'survey-second', type: 'landDifferent', label: 'Survey Second Node', detail: 'Land at a different project node to complete the route.', target: 1 }
    ]
  }
];

export function createMissionState() {
  return {
    active: false,
    step: 'idle',
    killGoal: 5,
    kills: 0,
    landingProjectId: 'devussy',
    contractId: null,
    contractTitle: '',
    contractStepIndex: 0,
    contractProgress: 0,
    contractStartStationId: null,
    currentObjective: null,
    objectiveView: 'current'
  };
}

export function cloneMissionContracts(contracts = BUILTIN_MISSION_CONTRACTS) {
  return contracts.map(contract => ({
    ...contract,
    steps: contract.steps.map(step => ({ ...step }))
  }));
}

export function serializeMissionProgress({ missionState, missionContracts = [], builtInContracts = BUILTIN_MISSION_CONTRACTS, gameOrchestrator = {} } = {}) {
  const contract = missionContracts.find(item => item.id === missionState?.contractId) || null;
  const builtInIds = new Set(builtInContracts.map(item => item.id));
  return {
    v: 1,
    active: Boolean(missionState?.active),
    step: missionState?.step || 'idle',
    kills: Number.isFinite(missionState?.kills) ? missionState.kills : 0,
    killGoal: Number.isFinite(missionState?.killGoal) ? missionState.killGoal : 5,
    landingProjectId: missionState?.landingProjectId || 'devussy',
    objectiveView: missionState?.objectiveView === 'available' ? 'available' : 'current',
    currentObjective: missionState?.currentObjective || null,
    tutorialComplete: Boolean(gameOrchestrator.tutorialComplete),
    contract: {
      id: missionState?.contractId || null,
      title: missionState?.contractTitle || '',
      stepIndex: Number.isFinite(missionState?.contractStepIndex) ? missionState.contractStepIndex : 0,
      progress: Number.isFinite(missionState?.contractProgress) ? missionState.contractProgress : 0,
      startStationId: missionState?.contractStartStationId || null,
      definition: contract && !builtInIds.has(contract.id) ? contract : null
    }
  };
}

export function applyMissionProgress(data, { missionState, missionContracts = [], gameOrchestrator = {} } = {}) {
  if (!data || typeof data !== 'object' || !missionState) return false;
  const contract = data.contract && typeof data.contract === 'object' ? data.contract : {};
  if (contract.definition?.id && !missionContracts.some(item => item.id === contract.definition.id)) {
    missionContracts.push(contract.definition);
  }

  missionState.active = Boolean(data.active);
  missionState.step = typeof data.step === 'string' ? data.step : 'idle';
  missionState.kills = Number.isFinite(data.kills) ? data.kills : 0;
  missionState.killGoal = Number.isFinite(data.killGoal) ? data.killGoal : missionState.killGoal;
  missionState.landingProjectId = data.landingProjectId || missionState.landingProjectId || 'devussy';
  missionState.objectiveView = data.objectiveView === 'available' ? 'available' : 'current';
  missionState.currentObjective = data.currentObjective || missionState.currentObjective;
  missionState.contractId = contract.id || null;
  missionState.contractTitle = contract.title || '';
  missionState.contractStepIndex = Number.isFinite(contract.stepIndex) ? contract.stepIndex : 0;
  missionState.contractProgress = Number.isFinite(contract.progress) ? contract.progress : 0;
  missionState.contractStartStationId = contract.startStationId || null;
  gameOrchestrator.tutorialComplete = Boolean(data.tutorialComplete);
  return true;
}

export function startTutorialMission() {}
export function setMissionStep() {}
export function updateMission() {}
export function registerMissionKill() {}
export function handleMissionLanding() { return true; }
export function spawnTutorialBogeys() {}
export function getMissionLandingProjectName() { return 'Devussy'; }
export function getProjectNodeName(node) { return node?.userData?.project?.name || 'UNKNOWN'; }
export function restockAtProject() {}
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

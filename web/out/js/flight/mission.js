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

let missionDeps = {
  flightState: null,
  missionState: null,
  missionContracts: [],
  enemies: [],
  spawnEnemy: () => {},
  activateEnemyWave: () => 0,
  traderState: null,
  ttsEngine: null,
  combatAudio: null,
  getVoicePersona: source => ({ source }),
  setNavigationTarget: () => {},
  projectNodeById: new Map(),
  updateFlightHud: () => {},
  sfxEngine: null,
  renderObjectivesPanel: () => {},
  showGameMessage: null,
  deactivateCombatObject: null,
  gameOrchestrator: null,
  addCombatCredits: null,
  gainReputation: null,
  getStationCategory: () => 'default',
  normalizeCategory: value => value || 'default',
  openTradeMenu: null,
  performanceRef: globalThis.performance
};

function now() {
  return missionDeps.performanceRef?.now?.() ?? Date.now();
}

function missionState() {
  return missionDeps.missionState;
}

function setStatus(text, duration = 2400) {
  const { flightState, updateFlightHud } = missionDeps;
  if (!flightState) return;
  flightState.status = text;
  flightState.statusUntil = now() + duration;
  updateFlightHud(true);
}

function speak(text, priority = 'normal') {
  const { ttsEngine, getVoicePersona } = missionDeps;
  ttsEngine?.speak?.(text, { ...getVoicePersona('USSYVERSE CONTROL'), priority });
}

function bark(text, priority = 'normal') {
  const { combatAudio, getVoicePersona } = missionDeps;
  combatAudio?.bark?.(text, { ...getVoicePersona('COMBAT SYSTEM'), volume: 0.85, priority });
}

function showMissionMessage(options) {
  missionDeps.showGameMessage?.(options);
}

function getMissionContract(contractId) {
  return missionDeps.missionContracts.find(contract => contract.id === contractId) || null;
}

function getActiveContractStep() {
  const state = missionState();
  const contract = getMissionContract(state?.contractId);
  return contract?.steps?.[state.contractStepIndex] || null;
}

function getProjectIdList() {
  return Array.from(missionDeps.projectNodeById?.keys?.() || []);
}

function getProjectName(projectId) {
  const node = missionDeps.projectNodeById?.get?.(projectId);
  return node?.userData?.project?.name || projectId || 'UNKNOWN';
}

function pickLandingTarget(step, contract) {
  if (step.targetProjectId) return step.targetProjectId;
  const ids = getProjectIdList();
  if (!ids.length) return null;
  const state = missionState();
  if (step.type === 'landDifferent') {
    const start = state.contractStartStationId;
    return ids.find(id => id !== start) || ids[0];
  }
  const surveyRoute = contract?.id?.includes('survey') || contract?.steps?.every(item => item.type === 'land' || item.type === 'landDifferent');
  if (!surveyRoute) return null;
  return ids.includes(state.landingProjectId) ? state.landingProjectId : ids[0];
}

function setCurrentObjective({ id = 'free-roam', kicker = 'DIRECTOR IDLE', title = 'Free Roam', detail = 'Pick a project node, accept a contract, or wait for the director.', progress = null, target = null, targetProjectId = null, source = 'mission' } = {}) {
  const state = missionState();
  if (!state) return;
  state.currentObjective = { id, kicker, title, detail, progress, target, targetProjectId, source };
  missionDeps.renderObjectivesPanel?.();
  missionDeps.updateFlightHud?.(true);
}

function updateContractObjectiveProgress() {
  const state = missionState();
  const contract = getMissionContract(state?.contractId);
  const step = getActiveContractStep();
  if (!state || !contract || !step) return;
  setCurrentObjective({
    id: `${contract.id}:${step.id}`,
    kicker: `${contract.title} ${state.contractStepIndex + 1}/${contract.steps.length}`,
    title: step.label,
    detail: step.detail,
    progress: Number.isFinite(step.target) ? state.contractProgress : null,
    target: Number.isFinite(step.target) ? step.target : null,
    targetProjectId: step.targetProjectId || null,
    source: 'contract'
  });
}

function resetMissionToIdle(detail = 'Pick another objective or keep flying.') {
  const state = missionState();
  if (!state) return;
  state.active = false;
  state.step = 'idle';
  state.kills = 0;
  state.contractId = null;
  state.contractTitle = '';
  state.contractStepIndex = 0;
  state.contractProgress = 0;
  state.contractStartStationId = null;
  setCurrentObjective({ id: 'free-roam', kicker: 'DIRECTOR ONLINE', title: 'Free Roam', detail, source: 'director' });
}

export function configureMission(options = {}) {
  missionDeps = { ...missionDeps, ...options };
}

export function startTutorialMission() {
  const state = missionState();
  if (!state) return false;
  state.active = true;
  state.step = 'killTutorialBogeys';
  state.killGoal = 5;
  state.kills = 0;
  state.contractId = null;
  state.contractTitle = 'Flight Tutorial';
  state.contractStepIndex = 0;
  state.contractProgress = 0;
  state.contractStartStationId = null;
  state.landingProjectId = state.landingProjectId || 'devussy';
  setCurrentObjective({
    id: 'tutorial-bogeys',
    kicker: 'TUTORIAL 1/2',
    title: 'Splash Tutorial Bogeys',
    detail: 'Destroy 5 teleporting tutorial targets using lasers or missiles.',
    progress: 0,
    target: state.killGoal
  });
  spawnTutorialBogeys();
  bark('TUTORIAL BOGEYS INBOUND', 'normal');
  showMissionMessage({ type: 'MISSION OBJECTIVE', source: 'USSYVERSE CONTROL', text: `OBJECTIVE: SPLASH TUTORIAL BOGEYS 0/${state.killGoal}. USE RADAR CONTACTS TO ACQUIRE THEM, THEN FIRE LASERS OR MISSILES.`, typeSpeed: 30 });
  setStatus('TUTORIAL BOGEYS TELEPORTING IN');
  return true;
}

export function setMissionStep(stepId, data = {}) {
  const state = missionState();
  if (!state) return false;

  if (stepId === 'killTutorialBogeys') {
    state.step = stepId;
    state.kills = data.kills ?? state.kills ?? 0;
    setCurrentObjective({
      id: 'tutorial-bogeys',
      kicker: 'TUTORIAL 1/2',
      title: 'Splash Tutorial Bogeys',
      detail: 'Destroy 5 teleporting tutorial targets using lasers or missiles.',
      progress: state.kills,
      target: state.killGoal
    });
    spawnTutorialBogeys();
    return true;
  }

  if (stepId === 'goLandAtProject') {
    state.step = stepId;
    const targetId = data.targetProjectId || state.landingProjectId || getProjectIdList()[0];
    state.landingProjectId = targetId;
    const targetNode = missionDeps.projectNodeById?.get?.(targetId);
    if (targetNode) missionDeps.setNavigationTarget(targetNode, 'mission');
    setCurrentObjective({
      id: 'tutorial-land',
      kicker: 'TUTORIAL 2/2',
      title: `Land At ${getMissionLandingProjectName()}`,
      detail: 'Follow the nav marker to the project node and press L inside landing range.',
      targetProjectId: targetId
    });
    bark('NAV MARKER SET', 'normal');
    return true;
  }

  const contract = getMissionContract(state.contractId);
  const stepIndex = contract?.steps?.findIndex(step => step.id === stepId) ?? -1;
  if (!contract || stepIndex < 0) return false;
  const step = contract.steps[stepIndex];

  state.contractStepIndex = stepIndex;
  state.step = step.id;
  state.contractProgress = 0;
  if (!state.contractStartStationId && missionDeps.traderState?.dockedStation) state.contractStartStationId = missionDeps.traderState.dockedStation;

  if (step.type === 'land' || step.type === 'landDifferent') {
    const targetId = pickLandingTarget(step, contract);
    if (targetId) {
      step.targetProjectId = targetId;
      const targetNode = missionDeps.projectNodeById?.get?.(targetId);
      if (targetNode) missionDeps.setNavigationTarget(targetNode, 'mission');
    }
  }

  updateContractObjectiveProgress();

  if ((step.spawnEnemies || 0) > 0) {
    missionDeps.activateEnemyWave(missionDeps.enemies, step.spawnEnemies, (enemy, offset, delay) => {
      missionDeps.spawnEnemy(enemy, offset, delay, step.enemyClassId || 'scout');
      if (enemy.userData) enemy.userData.missionContractId = contract.id;
    });
  }

  bark(step.label || 'OBJECTIVE UPDATED', 'normal');
  setStatus(`${(step.label || 'OBJECTIVE').toUpperCase()} STARTED`);
  return true;
}

export function updateMission(dt) {
  const state = missionState();
  if (!state?.active) return;
  const contract = getMissionContract(state.contractId);
  if (contract?.ttl != null && checkMissionExpiry({ ...contract, status: 'active' }, dt)?.status === 'expired') {
    resetMissionToIdle(`${contract.title} expired. Pick another objective or keep flying.`);
    return;
  }
  if (state.step === 'killTutorialBogeys' && state.kills >= state.killGoal) setMissionStep('goLandAtProject');
  const step = getActiveContractStep();
  if (step && Number.isFinite(step.target) && state.contractProgress >= step.target) advanceContractStep();
}

export function registerMissionKill(enemy) {
  const state = missionState();
  if (!state?.active) return false;
  if (state.step === 'killTutorialBogeys') {
    state.kills = Math.min(state.killGoal, state.kills + 1);
    setCurrentObjective({
      id: 'tutorial-bogeys',
      kicker: 'TUTORIAL 1/2',
      title: 'Splash Tutorial Bogeys',
      detail: 'Destroy 5 teleporting tutorial targets using lasers or missiles.',
      progress: state.kills,
      target: state.killGoal
    });
    if (state.kills >= state.killGoal) setMissionStep('goLandAtProject');
    return true;
  }

  const step = getActiveContractStep();
  if (!step || step.type !== 'kills') return false;
  state.kills += 1;
  state.contractProgress = Math.min(step.target || 1, state.contractProgress + 1);
  updateContractObjectiveProgress();
  const remaining = Math.max(0, (step.target || 1) - state.contractProgress);
  if (remaining > 0 && state.contractProgress % 2 === 0) bark(`${remaining} TARGETS REMAINING`, 'normal');
  if (state.contractProgress >= (step.target || 1)) advanceContractStep();
  return true;
}

export function registerMissionTrade(trade = {}) {
  const state = missionState();
  if (!state?.active) return false;
  const step = getActiveContractStep();
  if (!step || step.type !== 'trade') return false;
  if (step.action && trade.action !== step.action) return false;
  if (step.commodityId && trade.commodity !== step.commodityId) return false;
  if (step.stationId && trade.stationId !== step.stationId) return false;
  if (step.action === 'buy') state.contractStartStationId = trade.stationId;
  state.contractProgress = Math.min(step.target || 1, state.contractProgress + Math.max(1, trade.qty || 1));
  updateContractObjectiveProgress();
  if (state.contractProgress >= (step.target || 1)) advanceContractStep();
  return true;
}

export function handleMissionLanding(stationId) {
  const state = missionState();
  if (!state?.active) return false;

  if (state.step === 'goLandAtProject') {
    if (state.landingProjectId && stationId !== state.landingProjectId) {
      setStatus(`WRONG DOCK // LAND AT ${getMissionLandingProjectName().toUpperCase()}`);
      return false;
    }
    resetMissionToIdle('Tutorial landing complete. Pick an available objective, trade, or wait for director traffic.');
    missionDeps.gameOrchestrator && (missionDeps.gameOrchestrator.tutorialComplete = true);
    showMissionMessage({ type: 'TUTORIAL COMPLETE', source: 'USSYVERSE CONTROL', text: 'TUTORIAL COMPLETE. CONTRACTS AND THE DIRECTOR ARE ONLINE.', ttsPriority: 'normal' });
    return true;
  }

  const step = getActiveContractStep();
  if (!step || (step.type !== 'land' && step.type !== 'landDifferent')) return true;
  if (step.targetProjectId && stationId !== step.targetProjectId) {
    setStatus(`OBJECTIVE TARGET: ${getProjectName(step.targetProjectId).toUpperCase()}`);
    return false;
  }
  if (step.type === 'landDifferent' && stationId === state.contractStartStationId) {
    setStatus('OBJECTIVE NEEDS A DIFFERENT STATION');
    return false;
  }
  state.contractProgress = step.target || 1;
  if (!state.contractStartStationId) state.contractStartStationId = stationId;
  advanceContractStep();
  return true;
}

function advanceContractStep() {
  const state = missionState();
  const contract = getMissionContract(state?.contractId);
  if (!state || !contract) return false;
  state.contractStepIndex += 1;
  const nextStep = contract.steps[state.contractStepIndex];
  if (!nextStep) {
    completeMission();
    return true;
  }
  setMissionStep(nextStep.id);
  showMissionMessage({ type: 'OBJECTIVE UPDATED', source: 'USSYVERSE CONTROL', text: `NEXT STEP: ${nextStep.label.toUpperCase()}. ${nextStep.detail}`, ttsPriority: 'normal' });
  return true;
}

function completeMission() {
  const state = missionState();
  const contract = getMissionContract(state?.contractId);
  if (!state || !contract) return;
  const rewardCredits = contract.rewardCredits || contract.rewards?.credits || 0;
  const rewardFuel = contract.rewardFuel || contract.rewards?.fuel || 0;
  const completedMission = { status: 'complete', rewards: { credits: rewardCredits, fuel: rewardFuel } };
  if (missionDeps.addCombatCredits && rewardCredits > 0) missionDeps.addCombatCredits(rewardCredits);
  else if (missionDeps.traderState) resolveMissionReward(missionDeps.traderState, completedMission);
  if (rewardFuel > 0 && missionDeps.traderState) resolveMissionReward(missionDeps.traderState, { status: 'complete', rewards: { credits: 0, fuel: rewardFuel } });
  if (contract.rewardRep > 0 && missionDeps.gainReputation) {
    const stationId = missionDeps.traderState?.dockedStation || state.contractStartStationId || 'devussy';
    missionDeps.gainReputation(missionDeps.normalizeCategory(contract.rewardFaction || missionDeps.getStationCategory(stationId)), contract.rewardRep);
  }
  missionDeps.gameOrchestrator && (missionDeps.gameOrchestrator.nextPollAt = now() + 30000);
  missionDeps.sfxEngine?.playFlat?.('ui_confirm', { volume: 0.9 });
  speak(`${contract.title.toUpperCase()} COMPLETE. ${rewardCredits ? `${rewardCredits} CREDITS TRANSFERRED.` : 'MISSION COMPLETE.'}`, 'high');
  showMissionMessage({ type: 'OBJECTIVE COMPLETE', source: 'USSYVERSE CONTROL', text: `${contract.title.toUpperCase()} COMPLETE.${rewardCredits ? ` ${rewardCredits} CREDITS TRANSFERRED.` : ''}`, ttsPriority: 'high' });
  resetMissionToIdle(`${contract.title} complete${rewardCredits ? `, ${rewardCredits}cr paid` : ''}. Pick another objective or keep flying.`);
}

export function spawnTutorialBogeys() {
  const state = missionState();
  const count = Math.max(0, Math.min(state?.killGoal || 5, missionDeps.enemies.length));
  if (missionDeps.deactivateCombatObject) missionDeps.enemies.forEach(enemy => missionDeps.deactivateCombatObject(enemy));
  const spawned = missionDeps.activateEnemyWave(missionDeps.enemies, count, (enemy, offset, delay) => missionDeps.spawnEnemy(enemy, offset, delay, 'scout'), { offsetStep: 2.2, delayStep: 0.8 });
  if (spawned < count) console.warn(`Mission enemy pool exhausted: requested ${count}, spawned ${spawned}`);
  return spawned;
}

export function getMissionLandingProjectName() {
  return getProjectName(missionState()?.landingProjectId || 'devussy');
}
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

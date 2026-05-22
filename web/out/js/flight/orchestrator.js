export function buildOrchestratorGameState({ flightState, traderState, missionState, nearestStation, dockedAt, lastEvent, lastEventTime = 0, now = 0, tutorialComplete = false }) {
  return {
    score: Number(flightState?.score) || 0,
    credits: Number(traderState?.credits) || 0,
    fuel: Number(traderState?.fuel ?? flightState?.fuel) || 0,
    cargo: { ...(traderState?.cargo || {}) },
    shield: Number(flightState?.shield) || 0,
    armor: Number(flightState?.armor) || 0,
    ammo: Number(flightState?.ammo) || 0,
    missiles: Number(flightState?.missiles) || 0,
    kills: Number(missionState?.kills) || 0,
    nearestStation: nearestStation || 'unknown',
    dockedAt: dockedAt || null,
    currentObjective: missionState?.currentObjective?.title || null,
    lastEvent: lastEvent || null,
    timeSinceLastEvent: lastEventTime ? Math.max(0, (now - lastEventTime) / 1000) : 999,
    tutorialComplete: Boolean(tutorialComplete || ((missionState?.step === 'idle' && !missionState?.active)))
  };
}

export const ORCHESTRATOR_EVENT_COOLDOWN_SECONDS = 45;
export const ORCHESTRATOR_COMBAT_SHIELD_MIN = 30;

export function shouldFireEvent(gameState = {}, eventType = gameState.eventType) {
  const type = typeof eventType === 'string' ? eventType : eventType?.type;
  if ((gameState.timeSinceLastEvent ?? 999) < ORCHESTRATOR_EVENT_COOLDOWN_SECONDS) return false;
  if (type !== 'SILENCE' && (gameState.shield ?? 0) < ORCHESTRATOR_COMBAT_SHIELD_MIN) return false;
  return true;
}

export function activateEnemyWave(enemies, count, spawnEnemy, { offsetStep = 1.8, delayStep = 0.6 } = {}) {
  const available = enemies.filter(enemy => !enemy.userData?.active);
  const selected = available.slice(0, Math.max(0, count));
  selected.forEach((enemy, index) => spawnEnemy(enemy, index * offsetStep, index * delayStep));
  return selected.length;
}

function contractHasStep(contract, predicate) {
  return Array.isArray(contract?.steps) && contract.steps.some(predicate);
}

function generatedContractFromGameState(eventType, gameState = {}) {
  const type = String(eventType || '').toUpperCase();
  const id = `director-${type.toLowerCase() || 'mission'}-${Date.now()}`;
  if (type === 'COMBAT' || type === 'BOUNTY') {
    const target = Math.max(1, Math.min(5, Number(gameState.hostileCount || gameState.spawnEnemies) || 3));
    return {
      id,
      title: type === 'BOUNTY' ? 'Director Bounty' : 'Director Intercept',
      description: `Destroy ${target} hostile contacts assigned by USSYVERSE Control.`,
      rewardCredits: type === 'BOUNTY' ? 250 : 150,
      steps: [{ id: `${id}-clear`, type: 'kills', label: 'Clear Hostiles', detail: `Destroy ${target} hostile contacts.`, target, spawnEnemies: target }]
    };
  }
  if (type === 'CONTRABAND') {
    return {
      id,
      title: 'Director Market Run',
      description: 'Move cargo between two project stations under director pressure.',
      rewardCredits: 125,
      steps: [
        { id: `${id}-buy`, type: 'trade', action: 'buy', label: 'Buy Cargo', detail: 'Buy at least one unit of cargo.', target: 1 },
        { id: `${id}-travel`, type: 'landDifferent', label: 'Change Markets', detail: 'Dock at a different project station.', target: 1 },
        { id: `${id}-sell`, type: 'trade', action: 'sell', label: 'Sell Cargo', detail: 'Sell at least one unit of cargo.', target: 1 }
      ]
    };
  }
  return {
    id,
    title: 'Director Survey',
    description: 'Visit a project station and transmit local telemetry.',
    rewardCredits: 100,
    steps: [{ id: `${id}-land`, type: 'land', label: 'Survey Node', detail: 'Land at the assigned project station.', target: 1 }]
  };
}

export function startMissionContract(contract, deps = {}) {
  const { missionState, missionContracts = [], setMissionStep, ttsEngine, combatAudio, getVoicePersona = source => ({ source }), dockedAt = null } = deps;
  if (!contract || !missionState || missionState.active) return false;
  if (!missionContracts.some(item => item.id === contract.id)) missionContracts.push(contract);
  missionState.contractId = contract.id;
  missionState.contractTitle = contract.title || 'Director Contract';
  missionState.contractStepIndex = 0;
  missionState.contractProgress = 0;
  missionState.contractStartStationId = dockedAt;
  missionState.active = true;
  missionState.objectiveView = 'current';
  const firstStep = contract.steps?.[0];
  if (firstStep) setMissionStep?.(firstStep.id);
  ttsEngine?.speak?.(`${missionState.contractTitle.toUpperCase()} ACCEPTED.`, { ...getVoicePersona('USSYVERSE CONTROL'), priority: 'high' });
  combatAudio?.bark?.('MISSION PACKAGE ACTIVE', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'normal' });
  return true;
}

export function dispatchOrchestratorEvent(eventType, gameState = {}, deps = {}) {
  const { missionState, missionContracts = [] } = deps;
  if (missionState?.active) return false;
  const type = String(typeof eventType === 'string' ? eventType : eventType?.type || eventType || '').toUpperCase();
  let contract = null;

  if (type === 'COMBAT' || type === 'BOUNTY') {
    contract = missionContracts.find(item => contractHasStep(item, step => step.type === 'kills'));
  } else if (type === 'CONTRABAND' || type === 'TRADE' || type === 'DELIVERY') {
    contract = missionContracts.find(item => contractHasStep(item, step => step.type === 'trade'));
  } else if (type === 'DISTRESS' || type === 'ANOMALY' || type === 'SURVEY' || type === 'NAVIGATION') {
    contract = missionContracts.find(item => item.steps?.[0]?.type === 'land' || item.steps?.[0]?.type === 'landDifferent')
      || missionContracts.find(item => contractHasStep(item, step => step.type === 'land' || step.type === 'landDifferent'));
  }

  if (!contract && ['COMBAT', 'BOUNTY', 'CONTRABAND', 'TRADE', 'DELIVERY', 'DISTRESS', 'ANOMALY', 'SURVEY', 'NAVIGATION'].includes(type)) {
    contract = generatedContractFromGameState(type, gameState);
  }
  if (!contract) return false;

  if (typeof deps.startMissionContract === 'function') return deps.startMissionContract(contract);
  return startMissionContract(contract, deps);
}

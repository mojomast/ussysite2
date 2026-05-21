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

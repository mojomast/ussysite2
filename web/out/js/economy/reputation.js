const FACTIONS = ['core', 'creative', 'infrastructure', 'security', 'governance', 'tools'];

export const reputationState = {
  scores: Object.fromEntries(FACTIONS.map(faction => [faction, 0])),
  hostile: new Set()
};

export function normalizeCategory(category) {
  if (category === 'infra') return 'infrastructure';
  if (category === 'ai') return 'security';
  return category ?? 'tools';
}

export function getReputation(faction) {
  return reputationState.scores[normalizeCategory(faction)] ?? 0;
}

export function gainReputation(faction, amount) {
  const normalized = normalizeCategory(faction);
  if (!FACTIONS.includes(normalized)) return;
  reputationState.scores[normalized] = Math.min(100, (reputationState.scores[normalized] ?? 0) + amount);
}

export function loseReputation(faction, amount) {
  const normalized = normalizeCategory(faction);
  if (!FACTIONS.includes(normalized)) return;
  reputationState.scores[normalized] = Math.max(-100, (reputationState.scores[normalized] ?? 0) - amount);
}

export function getReputationPriceMultiplier(faction) {
  const rep = getReputation(faction);
  if (rep >= 50) return 0.85;
  if (rep >= 20) return 0.92;
  if (rep <= -50) return 1.2;
  if (rep <= -20) return 1.1;
  return 1.0;
}

export function getEnemyAggressionMultiplier(faction) {
  const rep = getReputation(faction);
  if (rep <= -50) return 1.2;
  if (rep <= -20) return 1.1;
  if (rep >= 50) return 0.9;
  return 1.0;
}

export function getReputationLabel(faction) {
  const rep = getReputation(faction);
  if (rep >= 50) return 'ALLIED';
  if (rep >= 20) return 'FRIENDLY';
  if (rep <= -50) return 'HOSTILE';
  if (rep <= -20) return 'UNFRIENDLY';
  return 'NEUTRAL';
}

export { FACTIONS };

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  USSY_PROJECTS: [{ id: 'devussy', category: 'core', name: 'Devussy' }]
};

const reputation = await import('../js/economy/reputation.js');
const trader = await import('../js/economy/trader.js');

test('reputation normalizes factions and applies price labels', () => {
  reputation.reputationState.scores.infrastructure = 0;
  reputation.gainReputation('infra', 50);
  assert.equal(reputation.reputationState.scores.infrastructure, 50);
  assert.equal(reputation.getReputationLabel('infrastructure'), 'ALLIED');
  assert.equal(reputation.getReputationPriceMultiplier('infrastructure'), 0.85);
});

test('trade pressure moves market price by one bounded step', () => {
  const before = trader.getMarketPrice('devussy', 'devplans', 'buy');
  trader.applyTradePressure('devussy', 'devplans', 'buy');
  const after = trader.getMarketPrice('devussy', 'devplans', 'buy');
  assert.ok(after >= before);
});

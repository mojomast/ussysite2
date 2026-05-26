import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  USSY_PROJECTS: [
    { id: 'devussy', category: 'core', name: 'Devussy' },
    { id: 'artussy', category: 'creative', name: 'Artussy' }
  ]
};

const reputation = await import('../js/economy/reputation.js');
const trader = await import('../js/economy/trader.js');

function resetTraderState() {
  trader.traderState.credits = 1000;
  trader.traderState.fuel = 100;
  trader.traderState.maxFuel = 100;
  trader.traderState.cargo = {};
  trader.traderState.maxCargo = 20;
  trader.traderState.cargoUsed = 0;
  trader.traderState.lastTrade = null;
  trader.traderState.tradeLog = [];
  trader.traderState.docked = false;
  trader.traderState.dockedStation = null;
  for (const faction of reputation.FACTIONS) reputation.reputationState.scores[faction] = 0;
}

describe('economy reputation', () => {
  beforeEach(resetTraderState);

  it('normalizes factions and applies price labels', () => {
    reputation.gainReputation('infra', 50);
    assert.equal(reputation.reputationState.scores.infrastructure, 50, 'infra alias should update infrastructure score');
    assert.equal(reputation.getReputationLabel('infrastructure'), 'ALLIED', '50 reputation should be ALLIED');
    assert.equal(reputation.getReputationPriceMultiplier('infrastructure'), 0.85, 'ALLIED buy multiplier should be 0.85');
  });

  it('maps category aliases and missing categories', () => {
    assert.equal(reputation.normalizeCategory('infra'), 'infrastructure', 'infra should normalize to infrastructure');
    assert.equal(reputation.normalizeCategory(undefined), 'tools', 'missing category should default to tools');
  });

  it('discounts buys and improves sell prices for allied reputation', () => {
    const neutralBuy = trader.getMarketPrice('devussy', 'audiodata', 'buy');
    const neutralSell = trader.getMarketPrice('devussy', 'audiodata', 'sell');
    reputation.reputationState.scores.core = 50;
    const alliedBuy = trader.getMarketPrice('devussy', 'audiodata', 'buy');
    const alliedSell = trader.getMarketPrice('devussy', 'audiodata', 'sell');
    assert.ok(alliedBuy < neutralBuy, 'allied buy price should be lower than neutral buy price');
    assert.ok(alliedSell > neutralSell, 'allied sell price should be higher than neutral sell price');
  });
});

describe('economy transactions', () => {
  beforeEach(resetTraderState);

  it('deducts credits and fills cargo when buying an item', () => {
    const price = trader.getMarketPrice('devussy', 'devplans', 'buy');
    const result = trader.executeTrade('buy', 'devussy', 'devplans', 1);
    assert.equal(result.success, true, 'buy order should succeed with enough credits and cargo space');
    assert.equal(trader.traderState.credits, 1000 - price, 'buy order should deduct exact market price');
    assert.equal(trader.traderState.cargo.devplans, 1, 'buy order should add cargo unit');
  });

  it('credits money and clears cargo when selling an item', () => {
    trader.traderState.cargo.devplans = 1;
    const price = trader.getMarketPrice('devussy', 'devplans', 'sell');
    const result = trader.executeTrade('sell', 'devussy', 'devplans', 1);
    assert.equal(result.success, true, 'sell order should succeed for held cargo');
    assert.equal(trader.traderState.credits, 1000 + price, 'sell order should credit exact market price');
    assert.equal(trader.traderState.cargo.devplans, undefined, 'sell order should remove emptied cargo stack');
  });

  it('rejects buys with insufficient credits and leaves state unchanged', () => {
    trader.traderState.credits = 1;
    const result = trader.executeTrade('buy', 'devussy', 'devplans', 1);
    assert.equal(result.success, false, 'buy order should reject when credits are insufficient');
    assert.equal(trader.traderState.credits, 1, 'rejected buy should not mutate credits');
    assert.deepEqual(trader.traderState.cargo, {}, 'rejected buy should not mutate cargo');
  });

  it('rejects buys when cargo hold is full', () => {
    trader.traderState.maxCargo = 1;
    trader.traderState.cargo.rawlogs = 1;
    const result = trader.executeTrade('buy', 'devussy', 'devplans', 1);
    assert.equal(result.success, false, 'buy order should reject when cargo hold is full');
    assert.equal(trader.traderState.cargo.devplans, undefined, 'full-cargo rejection should not add requested commodity');
  });

  it('varies prices by station profile and deterministic drift', () => {
    const corePrice = trader.getMarketPrice('devussy', 'devplans', 'buy');
    const creativePrice = trader.getMarketPrice('artussy', 'devplans', 'buy');
    assert.notEqual(corePrice, creativePrice, 'same commodity should have different prices across station profiles');
  });

  it('moves market price by one bounded trade-pressure step', () => {
    const before = trader.getMarketPrice('devussy', 'devplans', 'buy');
    trader.applyTradePressure('devussy', 'devplans', 'buy');
    const after = trader.getMarketPrice('devussy', 'devplans', 'buy');
    assert.ok(after >= before, 'buy pressure should not reduce the buy price');
  });
});

describe('docked services menu', () => {
  beforeEach(resetTraderState);

  it('renders one icon dock-grid with all docked services', () => {
    let message = null;
    trader.configureTrader({ showGameMessage: value => { message = value; } });

    trader.openTradeMenu('devussy');

    assert.equal(message.type, 'STATION SERVICES');
    assert.equal(message.ui.layout, 'dock-grid');
    assert.deepEqual(
      message.choices.map(choice => [choice.key, choice.label, choice.icon]),
      [
        ['1', 'RESTOCK', 'wrench'],
        ['2', 'TRADE HUB', 'package-search'],
        ['3', 'REFUEL', 'fuel'],
        ['4', 'CARGO HOLD', 'boxes'],
        ['5', 'SHIPYARD', 'rocket'],
        ['6', 'LOADOUT', 'crosshair'],
        ['7', 'MISSION BOARD', 'radar']
      ]
    );
    assert.deepEqual(message.ui.footerChoices.map(choice => [choice.key, choice.label]), [['u', 'UNDOCK']]);
    assert.equal(trader.traderState.docked, true);
    assert.equal(trader.traderState.dockedStation, 'devussy');
  });

  it('routes restock, mission board, and undock through configured dock callbacks', () => {
    let message = null;
    const calls = [];
    trader.configureTrader({
      showGameMessage: value => { message = value; },
      dismissGameMessage: () => calls.push(['dismiss']),
      onRestock: stationId => calls.push(['restock', stationId]),
      openMissionBoard: stationId => {
        calls.push(['missionBoard', stationId]);
        return true;
      },
      onUndock: stationId => calls.push(['undock', stationId])
    });

    trader.openTradeMenu('devussy');
    message.choices.find(choice => choice.label === 'RESTOCK').action();
    message.choices.find(choice => choice.label === 'MISSION BOARD').action();
    message.ui.footerChoices.find(choice => choice.label === 'UNDOCK').action();

    assert.deepEqual(calls, [
      ['restock', 'devussy'],
      ['missionBoard', 'devussy'],
      ['dismiss'],
      ['undock', 'devussy']
    ]);
    assert.equal(trader.traderState.docked, false);
    assert.equal(trader.traderState.dockedStation, null);
  });
});

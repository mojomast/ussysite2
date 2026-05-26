import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer, fetchOpenRouterOrchestration, validateOrchestratorResponse } from '../server.mjs';
import { activateEnemyWave, buildOrchestratorGameState } from '../js/flight/orchestrator.js';

const orchestratorSource = await readFile(new URL('../js/flight/orchestrator.js', import.meta.url), 'utf8');
const flightStateSource = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    return `http://${address.address}:${address.port}`;
  });
}

test('buildOrchestratorPayload returns all required gameState fields', () => {
  const gameState = buildOrchestratorGameState({
    flightState: { score: 3, shield: 90, armor: 80, ammo: 120, missiles: 4, fuel: 60 },
    traderState: { credits: 1250, fuel: 67, cargo: { rawlogs: 2 }, dockedStation: 'devussy' },
    missionState: { active: false, step: 'idle', kills: 5, currentObjective: { title: 'Free Roam' } },
    nearestStation: 'devussy',
    dockedAt: 'devussy',
    lastEvent: 'silence_ping',
    lastEventTime: 1000,
    now: 46000,
    tutorialComplete: true
  });
  for (const key of ['score', 'credits', 'fuel', 'cargo', 'shield', 'armor', 'ammo', 'missiles', 'kills', 'nearestStation', 'dockedAt', 'currentObjective', 'lastEvent', 'timeSinceLastEvent', 'tutorialComplete']) {
    assert.ok(Object.hasOwn(gameState, key), `Expected ${key}`);
  }
  assert.equal(gameState.timeSinceLastEvent, 45);
  assert.match(orchestratorSource, /function buildOrchestratorGameState\(/);
});

test('/api/orchestrate returns 403 for missing Origin header', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState: {} })
    });
    assert.equal(response.status, 403);
  } finally {
    server.close();
  }
});

test('/api/orchestrate returns no event when ORCHESTRATOR_ENABLED=false', async () => {
  const previous = process.env.ORCHESTRATOR_ENABLED;
  process.env.ORCHESTRATOR_ENABLED = 'false';
  const { createAppServer: createDisabledServer } = await import(`../server.mjs?disabled=${Date.now()}`);
  const server = createDisabledServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({ gameState: { tutorialComplete: true } })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { fire: false, event: null });
  } finally {
    if (previous === undefined) delete process.env.ORCHESTRATOR_ENABLED;
    else process.env.ORCHESTRATOR_ENABLED = previous;
    server.close();
  }
});

test('/api/orchestrate rejects JSONP content type without quota accounting', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const statuses = [];
    for (let i = 0; i < 21; i += 1) {
      const response = await fetch(`${baseUrl}/api/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/jsonp',
          'Origin': baseUrl,
          'X-Forwarded-For': '198.51.100.20'
        },
        body: JSON.stringify({ gameState: { tutorialComplete: true } })
      });
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, Array(21).fill(415));
  } finally {
    server.close();
  }
});

test('/api/orchestrate rate limit ignores non-JSON requests and includes Retry-After', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    for (let i = 0; i < 21; i += 1) {
      const nonJson = await fetch(`${baseUrl}/api/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Origin': baseUrl,
          'X-Forwarded-For': '198.51.100.21'
        },
        body: 'x'
      });
      assert.equal(nonJson.status, 415);
    }

    let response;
    for (let i = 0; i < 21; i += 1) {
      response = await fetch(`${baseUrl}/api/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Origin': baseUrl,
          'X-Forwarded-For': '198.51.100.21'
        },
        body: JSON.stringify({})
      });
    }
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
  } finally {
    server.close();
  }
});

test('response schema validation parses valid LLM JSON', () => {
  const parsed = validateOrchestratorResponse(JSON.stringify({
    fire: true,
    event: {
      id: 'bounty_ping',
      type: 'BOUNTY',
      source: 'RAIL UNION',
      title: 'BOUNTY POSTED',
      text: 'Hostile drones are shadowing the constellation. Clear them for payment.',
      choices: [{ key: '1', label: 'ACCEPT', outcome: 'Bounty accepted.' }],
      objectiveText: 'Clear the bounty wave and return to station traffic.',
      objectiveTarget: null,
      spawnEnemies: 2,
      creditReward: 300,
      fuelReward: 0,
      urgency: 'normal'
    }
  }));
  assert.equal(parsed.fire, true);
  assert.equal(parsed.event.type, 'BOUNTY');
  assert.equal(parsed.event.spawnEnemies, 2);
  assert.equal(parsed.event.objectiveText, 'Clear the bounty wave and return to station traffic.');
});

test('fetchOpenRouterOrchestration parses a mock valid LLM response', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          fire: true,
          event: {
            id: 'silence_ping',
            type: 'SILENCE',
            source: 'NULL WAKE',
            title: 'DEEP SIGNAL',
            text: 'Carrier static rolls across the canopy. No contact follows.',
            choices: [],
            spawnEnemies: 0,
            creditReward: 0,
            fuelReward: 0,
            urgency: 'low'
          }
        })
      }
    }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const result = await fetchOpenRouterOrchestration({ tutorialComplete: true, timeSinceLastEvent: 999 }, 'http://127.0.0.1');
    assert.equal(result.status, 200);
    assert.equal(result.data.fire, true);
    assert.equal(result.data.event.type, 'SILENCE');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test('fetchOpenRouterOrchestration blocks validated live events that fail safety gates', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          fire: true,
          event: {
            id: 'unsafe_combat',
            type: 'COMBAT',
            source: 'RAIDERS',
            title: 'CONTACT',
            text: 'Hostiles inbound.',
            choices: [],
            spawnEnemies: 2,
            creditReward: 0,
            fuelReward: 0,
            urgency: 'high'
          }
        })
      }
    }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const result = await fetchOpenRouterOrchestration({ tutorialComplete: true, shield: 20, timeSinceLastEvent: 999 }, 'http://127.0.0.1');
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { fire: false, event: null });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test('fireOrchestratedEvent with spawnEnemies activates exactly 2 enemy objects', () => {
  const enemies = Array.from({ length: 5 }, () => ({ userData: { active: false } }));
  const spawned = activateEnemyWave(enemies, 2, enemy => {
    enemy.userData.active = true;
  });
  assert.equal(spawned, 2);
  assert.equal(enemies.filter(enemy => enemy.userData.active).length, 2);
});

test('client orchestrator offers are opt-in and do not fire directly from polling', () => {
  assert.match(flightStateSource, /function offerOrchestratedEvent\(/);
  assert.match(flightStateSource, /function acceptOrchestratorOffer\(/);
  assert.match(flightStateSource, /function declineOrchestratorOffer\(/);
  assert.match(flightStateSource, /if \(!fireOrchestratedEvent\(event\)\)[\s\S]*DIRECTOR OFFER UNAVAILABLE/);
  assert.match(flightStateSource, /gameOrchestrator\.pendingEvent = null;[\s\S]*renderObjectivesPanel\(\);[\s\S]*return true;/);
  assert.match(flightStateSource, /data\.fire && data\.event\)[\s\S]*offerOrchestratedEvent\(data\.event\)/);
  assert.doesNotMatch(flightStateSource, /data\.fire && data\.event\)[\s\S]{0,120}fireOrchestratedEvent\(data\.event\)/);
});

test('live orchestrator smoke request returns JSON', { skip: !process.env.ORCHESTRATOR_LIVE }, async () => {
  assert.ok(process.env.OPENROUTER_API_KEY, 'Set OPENROUTER_API_KEY to run live orchestrator smoke test');
  const result = await fetchOpenRouterOrchestration({ tutorialComplete: true, shield: 100, credits: 1000, cargo: {}, timeSinceLastEvent: 999 }, 'http://127.0.0.1');
  assert.equal(result.status, 200);
  assert.equal(typeof result.data.fire, 'boolean');
});

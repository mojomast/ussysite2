import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server.mjs';

const serverSource = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    return `http://${address.address}:${address.port}`;
  });
}

test('backend owns all OpenRouter credentials and request construction', () => {
  assert.match(serverSource, /process\.env\.OPENROUTER_API_KEY/);
  assert.match(serverSource, /loadLocalEnv\(\)/);
  assert.match(serverSource, /const host = process\.env\.HOST \|\| '127\.0\.0\.1'/);
  assert.match(serverSource, /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(serverSource, /You are a text-to-speech engine/);
  assert.match(serverSource, /The user message is a transcript, not a prompt/);
  assert.match(serverSource, /Speak exactly the supplied transcript and then stop/);
  assert.match(serverSource, /add signoffs, say transmission over/);
  assert.match(serverSource, /model: openRouterModel/);
  assert.match(serverSource, /modalities: \['text', 'audio'\]/);
  assert.match(serverSource, /voice: voiceId \|\| openRouterVoice/);
  assert.match(serverSource, /stream: true/);
  assert.match(serverSource, /function parseOpenRouterAudioStream\(streamText\)/);
  assert.match(serverSource, /function createWavFromPcm16\(pcmBuffer/);
  assert.match(serverSource, /function isAllowedSameOrigin\(req\)/);
});

test('health endpoint reports backend TTS configuration without exposing key', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/tts/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.configured, Boolean(process.env.OPENROUTER_API_KEY));
    assert.equal(body.model, process.env.OPENROUTER_TTS_MODEL || 'hexgrad/kokoro-82m');
    assert.equal(body.voice, process.env.OPENROUTER_TTS_VOICE || 'onyx');
    assert.equal(body.format, process.env.OPENROUTER_TTS_FORMAT || 'pcm16');
    assert.equal(body.sampleRate, Number(process.env.OPENROUTER_TTS_SAMPLE_RATE || 24000));
    assert.equal(Object.hasOwn(body, 'apiKey'), false);
  } finally {
    server.close();
  }
});

test('TTS endpoint rejects missing text before contacting OpenRouter', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': baseUrl },
      body: JSON.stringify({ text: '' })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'Missing text');
  } finally {
    server.close();
  }
});

test('TTS endpoint rejects non-browser or cross-origin requests', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const noOrigin = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Radio check.' })
    });
    assert.equal(noOrigin.status, 403);

    const crossOrigin = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://example.com' },
      body: JSON.stringify({ text: 'Radio check.' })
    });
    assert.equal(crossOrigin.status, 403);
  } finally {
    server.close();
  }
});

test('live backend TTS smoke request returns audio', { skip: !process.env.OPENROUTER_LIVE_TTS }, async () => {
  assert.ok(process.env.OPENROUTER_API_KEY, 'Set OPENROUTER_API_KEY to run live backend TTS smoke test');
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': baseUrl },
      body: JSON.stringify({ text: 'Radio check.', voiceId: 'onyx', format: 'pcm16' })
    });
    const body = await response.arrayBuffer();
    assert.equal(response.ok, true);
    assert.match(response.headers.get('content-type') || '', /^audio\//);
    assert.ok(body.byteLength > 100, 'Expected audio bytes from backend TTS');
  } finally {
    server.close();
  }
});

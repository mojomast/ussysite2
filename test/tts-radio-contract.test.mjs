import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');

function extractStringConfig(name) {
  const match = appSource.match(new RegExp(`${name}:\\s*'([^']+)'`));
  assert.ok(match, `Expected ${name} in ttsConfig`);
  return match[1];
}

const model = extractStringConfig('model');
const voiceId = extractStringConfig('voiceId');
const audioFormat = extractStringConfig('audioFormat');

test('browser TTS config uses the local backend endpoint', () => {
  assert.equal(model, 'hexgrad/kokoro-82m');
  assert.equal(voiceId, 'onyx');
  assert.equal(audioFormat, 'pcm16');
  assert.match(appSource, /endpoint:\s*'\/api\/tts'/);
  assert.match(appSource, /function buildBackendTTSRequest\(text, persona = \{\}\)/);
  assert.doesNotMatch(appSource, /openRouterKey/);
  assert.doesNotMatch(appSource, /Authorization': `Bearer/);
  assert.doesNotMatch(appSource, /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.doesNotMatch(appSource, /https:\/\/openrouter\.ai\/api\/v1\/audio\/speech/);
});

test('browser console API only toggles the backend path', () => {
  assert.match(appSource, /function setTTSBackendEnabled\(enabled = true\)/);
  assert.match(appSource, /window\.setTTSBackendEnabled = setTTSBackendEnabled/);
  assert.match(appSource, /window\.__USSY_TTS_DEBUG__/);
});

test('browser request builder sends only speech options to backend', () => {
  assert.match(appSource, /url: ttsConfig\.endpoint/);
  assert.match(appSource, /text,/);
  assert.match(appSource, /voiceId: persona\.voiceId \|\| ttsConfig\.voiceId/);
  assert.match(appSource, /format: ttsConfig\.audioFormat/);
  assert.match(appSource, /speed: persona\.rate \?\? 1\.0/);
});

test('game messages wait for TTS audio start before typewriter text advances', () => {
  assert.match(appSource, /ttsWaitUntil: 0/);
  assert.match(appSource, /gameMessageState\.ttsWaitUntil = ttsEngine\.enabled \? performance\.now\(\) \+ 3500 : 0/);
  assert.match(appSource, /onStart: \(\) => \{/);
  assert.match(appSource, /gameMessageState\.ttsWaitUntil = 0/);
  assert.match(appSource, /if \(time < gameMessageState\.ttsWaitUntil\) return/);
  assert.match(appSource, /typeSpeed: 30/);
});

test('TTS transmissions are single-owner and radio text avoids spoken slash characters', () => {
  assert.match(appSource, /activeTransmission: 0/);
  assert.match(appSource, /activeRequest: null/);
  assert.match(appSource, /activePriority: -1/);
  assert.match(appSource, /function getTtsPriorityRank\(priority = 'normal'\)/);
  assert.match(appSource, /if \(this\.activePriority > priority \|\| \(priority === 0 && this\.activePriority >= 0\)\) return/);
  assert.match(appSource, /new AbortController\(\)/);
  assert.match(appSource, /fetchTTSSpeech\(radioText, utteranceOptions, requestController\?\.signal\)/);
  assert.match(appSource, /if \(signal\) request\.options\.signal = signal/);
  assert.match(appSource, /this\.activeRequest\.abort\(\)/);
  assert.match(appSource, /const transmissionId = this\.activeTransmission \+ 1/);
  assert.match(appSource, /const isCurrentTransmission = \(\) => this\.enabled && this\.activeTransmission === transmissionId/);
  assert.match(appSource, /if \(!isCurrentTransmission\(\)\) return/);
  assert.match(appSource, /stop\(invalidate = true\)/);
  assert.match(appSource, /this\.stop\(false\)/);
  assert.match(appSource, /\$\{numToWord\(left\)\} of \$\{numToWord\(right\)\}/);
  assert.match(appSource, /replace\(\/\\s\*\\\/\{1,\}\\s\*\/g, ', '\)/);
  assert.doesNotMatch(appSource, /' slash '/);
});

test('mission transmissions outrank low-priority combat barks', () => {
  assert.match(appSource, /priority: 'high'/);
  assert.match(appSource, /priority: 'low'/);
  assert.match(appSource, /ttsEngine\.speak\(text, \{\n\s+\.\.\.getVoicePersona\(source\),\n\s+priority: 'high'/);
  assert.match(appSource, /combatAudio\.bark\('FOX TWO', \{ \.\.\.getVoicePersona\('COMBAT SYSTEM'\), priority: 'low' \}\)/);
  assert.match(appSource, /combatAudio\.bark\('TAKING FIRE', \{ \.\.\.getVoicePersona\('COMBAT SYSTEM'\), priority: 'low' \}\)/);
});

test('configured OpenRouter model exists and can output audio', { skip: !process.env.OPENROUTER_VALIDATE_MODELS }, async () => {
  const response = await fetch(`https://openrouter.ai/api/v1/models/${model}/endpoints`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.id, model);
  assert.ok(payload.data.architecture.output_modalities.includes('audio'));
});

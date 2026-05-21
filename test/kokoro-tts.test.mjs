import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KOKORO_VOICE_MAP, buildOpenRouterPayload, createAppServer } from '../server.mjs';

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    return `http://${address.address}:${address.port}`;
  });
}

async function loadTTSBrowserContext() {
  const appSource = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
  const start = appSource.indexOf('function numToWord');
  const end = appSource.indexOf('function getRenderPixelRatio');
  assert.notEqual(start, -1, 'Expected js/main.js TTS helper start marker');
  assert.notEqual(end, -1, 'Expected js/main.js TTS helper end marker');

  const context = vm.createContext({
    AbortController,
    Blob,
    Float32Array,
    Math,
    Promise,
    String,
    URL,
    gameOrchestrator: {},
    pollOrchestrator() {},
    buildOrchestratorPayload() {},
    fetch: async () => ({ ok: false }),
    setTimeout,
    clearTimeout,
    document: { addEventListener() {} },
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {},
    window: {
      matchMedia: () => ({ matches: false }),
      speechSynthesis: {
        cancel() {},
        getVoices: () => [],
        speak(utterance) {
          if (typeof utterance.onstart === 'function') utterance.onstart();
          if (typeof utterance.onend === 'function') utterance.onend();
        }
      },
      setTimeout,
      clearTimeout
    }
  });

  vm.runInContext(appSource.slice(start, end), context);
  return context;
}

function createMockAudioContext() {
  const destination = { connect() {} };
  const node = () => ({ connect() {} });
  return {
    currentTime: 0,
    sampleRate: 24000,
    destination,
    state: 'running',
    createBiquadFilter() {
      return { ...node(), frequency: { value: 0 }, Q: { value: 0 }, type: 'lowpass' };
    },
    createWaveShaper() {
      return { ...node(), curve: null, oversample: 'none' };
    },
    createDynamicsCompressor() {
      return {
        ...node(),
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 }
      };
    },
    createGain() {
      return {
        gain: { value: 1 },
        connect() {}
      };
    },
    createBuffer(channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start() {},
        stop() {}
      };
    },
    async decodeAudioData() {
      return { duration: 1 };
    }
  };
}

test('KOKORO_VOICE_MAP maps OpenAI standard voices to Kokoro voices', () => {
  for (const voice of ['onyx', 'alloy', 'echo', 'fable', 'nova', 'shimmer']) {
    assert.equal(typeof KOKORO_VOICE_MAP[voice], 'string');
    assert.notEqual(KOKORO_VOICE_MAP[voice].trim(), '');
  }
});

test('Kokoro OpenRouter payload uses audio speech schema', () => {
  const payload = buildOpenRouterPayload({
    text: 'Radio check.',
    voiceId: 'onyx',
    format: 'pcm16',
    model: 'hexgrad/kokoro-82m'
  });

  assert.equal(payload.model, 'hexgrad/kokoro-82m');
  assert.equal(payload.input, 'Radio check.');
  assert.equal(typeof payload.voice, 'string');
  assert.notEqual(payload.voice.trim(), '');
  assert.equal(Object.hasOwn(payload, 'messages'), false);
  assert.equal(Object.hasOwn(payload, 'audio'), false);
});

test('OpenAI audio OpenRouter payload preserves messages and audio schema', () => {
  const payload = buildOpenRouterPayload({
    text: 'Radio check.',
    voiceId: 'onyx',
    format: 'pcm16',
    model: 'openai/gpt-audio'
  });

  assert.equal(payload.model, 'openai/gpt-audio');
  assert.equal(payload.messages.at(-1).content, 'Radio check.');
  assert.deepEqual(payload.audio, { voice: 'onyx', format: 'pcm16' });
  assert.equal(Object.hasOwn(payload, 'input'), false);
});

test('health endpoint returns Kokoro voice map', async () => {
  const server = createAppServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/tts/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.kokoroVoiceMap, KOKORO_VOICE_MAP);
  } finally {
    server.close();
  }
});

test('combatAudio active sounds do not exceed maxConcurrent when barks overlap', async () => {
  const context = await loadTTSBrowserContext();
  const audioBytes = new Uint8Array([1, 2, 3, 4]);
  context.mockCtx = createMockAudioContext();
  context.audioBytes = audioBytes;
  vm.runInContext(`
    radioChain.ctx = mockCtx;
    fetchTTSSpeech = async () => new Blob([audioBytes], { type: 'audio/wav' });
  `, context);

  await vm.runInContext(`Promise.all([
    combatAudio.bark('FOX TWO', { voiceId: 'onyx' }),
    combatAudio.bark('TAKING FIRE', { voiceId: 'onyx' }),
    combatAudio.bark('SHIELDS CRITICAL', { voiceId: 'onyx' })
  ])`, context);

  const active = vm.runInContext('combatAudio.active.length', context);
  const maxConcurrent = vm.runInContext('combatAudio.maxConcurrent', context);
  assert.equal(maxConcurrent, 2);
  assert.ok(active <= maxConcurrent);
});

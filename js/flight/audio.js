// Flight radio, browser TTS backend, combat chatter, and audio settings helpers.
import { settingsState } from './settings.js';

export function numToWord(value) {
  const words = [
    'zero', 'one', 'two', 'three', 'four',
    'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    'twenty'
  ];
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 20 ? words[number] : String(value);
}

export function preprocessRadioText(text) {
  return String(text)
    .replace(/\bUSSYVERSE\b/gi, 'us ee verse')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\b([0-9]|1[0-9]|20)\s*\/\s*([0-9]|1[0-9]|20)\b/g, (_, left, right) => `${numToWord(left)} of ${numToWord(right)}`)
    .replace(/\s*\/{1,}\s*/g, ', ')
    .replace(/&/g, ' and ')
    .replace(/[`*_~#>]/g, '')
    .replace(/[\[\](){}<>]/g, ' ')
    .replace(/\b([0-9]|1[0-9]|20)\b/g, match => numToWord(match))
    .replace(/\b(OPERATOR|CONTROL|CONFIRMED|OBJECTIVE|BOGEY)\b(?![,.;:!?])/gi, '$1,')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?]){2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTtsPriorityRank(priority = 'normal') {
  if (priority === 'high' || priority === 'mission') return 2;
  if (priority === 'low' || priority === 'bark') return 0;
  return 1;
}

let audioRuntime = { flightState: null, updateFlightHud: () => {}, getVoicePersona: source => ({ voiceId: 'onyx', source }) };

export function configureFlightAudio(options = {}) {
  audioRuntime = { ...audioRuntime, ...options };
}

export const gameSettings = {};

let sfxVolumeApplier = () => {};

export function configureSfxVolumeApplier(fn) {
  sfxVolumeApplier = typeof fn === 'function' ? fn : () => {};
  sfxVolumeApplier(gameSettings.sfxVolume);
}

export function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
}

function toVolumeSetting(value) {
  return Math.round(clampVolume(value) * 100);
}

export function volumePercent(value) {
  return `${Math.round(clampVolume(value) * 100)}%`;
}

export function loadFlightSettings() {
  return false;
}

export function saveFlightSettings() {
  return true;
}

export function setRadioVolume(value) {
  settingsState.radioVolume = toVolumeSetting(value);
  radioChain.updateOutputGains();
  if (audioRuntime.flightState) audioRuntime.flightState.status = `RADIO VOLUME ${volumePercent(gameSettings.radioVolume)}`;
  if (audioRuntime.flightState) audioRuntime.flightState.statusUntil = performance.now() + 2200;
  audioRuntime.updateFlightHud(true);
}

export function setChatterVolume(value) {
  settingsState.chatterVolume = toVolumeSetting(value);
  combatAudio.updateGain();
  if (audioRuntime.flightState) audioRuntime.flightState.status = `CHATTER VOLUME ${volumePercent(gameSettings.chatterVolume)}`;
  if (audioRuntime.flightState) audioRuntime.flightState.statusUntil = performance.now() + 2200;
  audioRuntime.updateFlightHud(true);
}

export function setSfxVolume(value) {
  settingsState.sfxVolume = toVolumeSetting(value);
  sfxVolumeApplier(gameSettings.sfxVolume);
  if (audioRuntime.flightState) audioRuntime.flightState.status = `SFX VOLUME ${volumePercent(gameSettings.sfxVolume)}`;
  if (audioRuntime.flightState) audioRuntime.flightState.statusUntil = performance.now() + 2200;
  audioRuntime.updateFlightHud(true);
}

Object.defineProperties(gameSettings, {
  radioVolume: {
    get: () => settingsState.radioVolume / 100,
    set: value => { settingsState.radioVolume = toVolumeSetting(value); }
  },
  chatterVolume: {
    get: () => settingsState.chatterVolume / 100,
    set: value => { settingsState.chatterVolume = toVolumeSetting(value); }
  },
  sfxVolume: {
    get: () => settingsState.sfxVolume / 100,
    set: value => { settingsState.sfxVolume = toVolumeSetting(value); }
  },
  ttsVolume: {
    get: () => settingsState.ttsVolume / 100,
    set: value => { settingsState.ttsVolume = toVolumeSetting(value); }
  }
});

export const ttsEngine = {
  supported: 'speechSynthesis' in window,
  activeVoice: null,
  activeTransmission: 0,
  activeRequest: null,
  activePriority: -1,

  async speak(text, options = {}) {
    if (!this.enabled || !text) return;
    const radioText = preprocessRadioText(text);
    if (!radioText) return;
    const priority = getTtsPriorityRank(options.priority);
    if (this.activePriority > priority || (priority === 0 && this.activePriority >= 0)) return;
    const transmissionId = this.activeTransmission + 1;
    this.activeTransmission = transmissionId;
    const isCurrentTransmission = () => this.enabled && this.activeTransmission === transmissionId;

    const utteranceOptions = {
      rate: options.rate ?? 1.1,
      pitch: options.pitch ?? 0.85,
      volume: clampVolume(options.volume ?? gameSettings.radioVolume),
      longMessage: radioText.length > 80,
      voiceId: options.voiceId,
      onStart: typeof options.onStart === 'function'
        ? () => {
            if (isCurrentTransmission()) options.onStart();
          }
        : null
    };

    const requestedVoice = options.voice ?? options.voiceId;
    if (requestedVoice && this.supported) {
      utteranceOptions.voice = typeof requestedVoice === 'string' ? this.setVoice(requestedVoice) : requestedVoice;
    } else if (this.activeVoice) {
      utteranceOptions.voice = this.activeVoice;
    }

    this.stop(false);
    this.activePriority = priority;
    const requestController = typeof AbortController === 'function' ? new AbortController() : null;
    this.activeRequest = requestController;
    radioChain.addClickIn();

    try {
      if (ttsConfig.enabled) {
        const blob = await fetchTTSSpeech(radioText, utteranceOptions, requestController?.signal);
        if (!isCurrentTransmission()) return;
        if (blob && await radioChain.processBlob(blob, utteranceOptions.onStart)) return;
      }
      if (!isCurrentTransmission()) return;
      await radioChain.processSpeechSynthesis(radioText, utteranceOptions);
    } catch {
      try {
        if (!isCurrentTransmission()) return;
        await radioChain.processSpeechSynthesis(radioText, utteranceOptions);
      } catch {
        // Keep TTS failures non-blocking for the render/game loop.
      }
    } finally {
      if (this.activeRequest === requestController) this.activeRequest = null;
      if (isCurrentTransmission()) {
        this.activePriority = -1;
        radioChain.addClickOut();
      }
    }
  },

  stop(invalidate = true) {
    if (invalidate) this.activeTransmission += 1;
    if (this.activeRequest) this.activeRequest.abort();
    this.activeRequest = null;
    this.activePriority = -1;
    if (this.supported) window.speechSynthesis.cancel();
    if (typeof radioChain !== 'undefined') radioChain.stopActive();
  },

  setVoice(voiceNameFragment = '') {
    if (!this.supported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const normalize = value => String(value || '').toLowerCase();
    const requested = normalize(voiceNameFragment);
    const matches = (voice, fragment) => `${voice.name} ${voice.lang}`.toLowerCase().includes(fragment);
    const isLang = (voice, lang) => normalize(voice.lang).startsWith(lang);
    const voiceGenderKeywords = ['male', 'david', 'daniel', 'alex', 'george', 'james', 'fred', 'tom'];
    const isMaleSounding = voice => voiceGenderKeywords.some(keyword => normalize(voice.name).includes(keyword));
    const requestedVoice = requested ? voices.find(voice => matches(voice, requested)) : null;
    const preferredVoice =
      voices.find(voice => normalize(voice.name).includes('google uk english male')) ||
      voices.find(voice => normalize(voice.name).includes('microsoft david')) ||
      voices.find(voice => normalize(voice.name).includes('daniel')) ||
      voices.find(voice => normalize(voice.name).includes('alex')) ||
      voices.find(voice => isLang(voice, 'en-gb')) ||
      voices.find(voice => isLang(voice, 'en-us') && isMaleSounding(voice));
    const englishVoice = voices.find(voice => isLang(voice, 'en'));

    this.activeVoice = requestedVoice || preferredVoice || englishVoice || voices[0];
    return this.activeVoice;
  },

  initVoices() {
    return this.setVoice();
  }
};

Object.defineProperty(ttsEngine, 'enabled', {
  get: () => settingsState.ttsEnabled,
  set: value => { settingsState.ttsEnabled = Boolean(value); }
});

export const radioChain = {
  ctx: null,
  activeSource: null,
  activeNoise: null,
  speechTimer: null,
  outputGains: new Set(),

  buildChain() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!this.ctx) this.ctx = new AudioContextCtor();

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300;
    highpass.Q.value = 0.7;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3400;
    lowpass.Q.value = 0.8;

    const waveshaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 320) * x) / (Math.PI + 320 * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '2x';

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.08;

    const gain = this.ctx.createGain();
    gain.gain.value = 1.1 * gameSettings.radioVolume;
    this.outputGains.add(gain);

    highpass.connect(lowpass);
    lowpass.connect(waveshaper);
    waveshaper.connect(compressor);
    compressor.connect(gain);
    gain.connect(this.ctx.destination);

    return { ctx: this.ctx, input: highpass, outputGain: gain };
  },

  updateOutputGains() {
    this.outputGains.forEach(gain => {
      try {
        gain.gain.value = 1.1 * gameSettings.radioVolume;
      } catch {
        this.outputGains.delete(gain);
      }
    });
  },

  async processBlob(audioBlob, onStart = null) {
    try {
      const chain = this.buildChain();
      if (!chain || chain.ctx.state === 'suspended') return false;
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await chain.ctx.decodeAudioData(arrayBuffer.slice(0));

      return await new Promise(resolve => {
        const source = chain.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(chain.input);
        this.activeSource = source;
        source.onended = () => {
          if (this.activeSource === source) this.activeSource = null;
          this.outputGains.delete(chain.outputGain);
          resolve(true);
        };
        source.start();
        if (typeof onStart === 'function') onStart();
      });
    } catch {
      return false;
    }
  },

  async processSpeechSynthesis(text, utteranceOptions = {}) {
    if (!ttsEngine.supported) return false;

    const chain = this.buildChain();
    if (!chain || chain.ctx.state === 'suspended') return false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = utteranceOptions.rate ?? 1.1;
    utterance.pitch = utteranceOptions.pitch ?? 0.85;
    utterance.volume = utteranceOptions.volume ?? 0.9;
    if (utteranceOptions.voice) utterance.voice = utteranceOptions.voice;

    const noiseBuffer = chain.ctx.createBuffer(1, Math.floor(chain.ctx.sampleRate * 0.4), chain.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.035;

    const noise = chain.ctx.createBufferSource();
    const noiseGain = chain.ctx.createGain();
    const speechDelay = utteranceOptions.longMessage ? 160 : 0;
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseGain.gain.value = 0.04 * gameSettings.radioVolume;
    noise.connect(noiseGain);
    noiseGain.connect(chain.input);
    this.activeNoise = { source: noise, gain: noiseGain };

    return await new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.fadeNoiseOut(noise, noiseGain);
        this.outputGains.delete(chain.outputGain);
        resolve(true);
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      utterance.onstart = () => {
        if (typeof utteranceOptions.onStart === 'function') utteranceOptions.onStart();
      };
      noise.start();
      this.speechTimer = window.setTimeout(() => {
        this.speechTimer = null;
        window.speechSynthesis.speak(utterance);
      }, speechDelay);
    });
  },

  addClickIn() {
    this.playClick();
  },

  addClickOut() {
    this.playClick();
  },

  playClick() {
    try {
      const chain = this.buildChain();
      if (!chain || chain.ctx.state === 'suspended') return;
      const oscillator = chain.ctx.createOscillator();
      const gain = chain.ctx.createGain();
      const now = chain.ctx.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.value = 1200;
      gain.gain.setValueAtTime(0.18 * gameSettings.radioVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      oscillator.connect(gain);
      gain.connect(chain.input);
      oscillator.start(now);
      oscillator.stop(now + 0.02);
    } catch {
      // Radio clicks are cosmetic; ignore AudioContext failures.
    }
  },

  fadeNoiseOut(noise, noiseGain) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      noiseGain.gain.cancelScheduledValues(now);
      noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
      noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      noise.stop(now + 0.1);
    } catch {
      // Noise may already be stopped by a newer transmission.
    }
    if (this.activeNoise && this.activeNoise.source === noise) this.activeNoise = null;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  stopActive() {
    if (this.activeSource) {
      try { this.activeSource.stop(); } catch {}
      this.activeSource = null;
    }
    if (this.activeNoise) {
      this.fadeNoiseOut(this.activeNoise.source, this.activeNoise.gain);
      this.activeNoise = null;
    }
    if (this.speechTimer) {
      window.clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
  }
};

export const combatAudio = {
  ctx: null,
  active: [],
  maxConcurrent: 2,
  gainNode: null,

  init() {
    if (this.ctx) return;
    const chain = radioChain.buildChain();
    if (!chain || chain.ctx.state === 'suspended') return;
    this.ctx = chain.ctx;
    this.gainNode = this.ctx.createGain();
    this.updateGain();
    this.gainNode.connect(chain.input);
  },

  updateGain() {
    if (this.gainNode) this.gainNode.gain.value = 0.75 * gameSettings.chatterVolume;
  },

  async bark(text, persona = {}) {
    if (!ttsEngine.enabled || !text) return;
    this.init();
    if (!this.ctx) return;

    const radioText = preprocessRadioText(text);
    if (!radioText) return;
    const blob = await fetchTTSSpeech(radioText, persona);
    if (!blob) {
      await radioChain.processSpeechSynthesis(radioText, {
        ...persona,
        volume: clampVolume(persona.volume ?? gameSettings.chatterVolume)
      });
      return;
    }

    const arrayBuffer = await blob.arrayBuffer();
    let audioBuffer;
    try {
      audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch {
      await radioChain.processSpeechSynthesis(radioText, {
        ...persona,
        volume: clampVolume(persona.volume ?? gameSettings.chatterVolume)
      });
      return;
    }

    if (this.active.length >= this.maxConcurrent) {
      const oldest = this.active.shift();
      try { oldest.source.stop(); } catch {}
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    const entry = { source, startedAt: this.ctx.currentTime };
    this.active.push(entry);
    source.onended = () => {
      const idx = this.active.indexOf(entry);
      if (idx !== -1) this.active.splice(idx, 1);
    };
    source.start();
  },

  stopAll() {
    for (const { source } of this.active) {
      try { source.stop(); } catch {}
    }
    this.active = [];
  }
};

export const ttsConfig = {
  endpoint: '/api/tts',
  model: 'hexgrad/kokoro-82m',
  voiceId: 'onyx',
  audioFormat: 'pcm16',
  enabled: false
};

let ttsBackendRetryAfter = 0;
let ttsBackendWarnedAt = 0;

export function setTTSBackendEnabled(enabled = true) {
  settingsState.ttsBackendEnabled = Boolean(enabled);
  ttsConfig.enabled = settingsState.ttsBackendEnabled;
  if (ttsConfig.enabled) ttsBackendRetryAfter = 0;
  return ttsConfig.enabled;
}

window.setTTSBackendEnabled = setTTSBackendEnabled;

export function buildBackendTTSRequest(text, persona = {}) {
  return {
    url: ttsConfig.endpoint,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voiceId: persona.voiceId || ttsConfig.voiceId,
        format: ttsConfig.audioFormat,
        speed: persona.rate ?? 1.0
      })
    }
  };
}

export async function fetchTTSSpeech(text, persona = {}, signal = null) {
  if (!ttsConfig.enabled) return null;
  const now = Date.now();
  if (now < ttsBackendRetryAfter) return null;
  try {
    const request = buildBackendTTSRequest(text, persona);
    if (signal) request.options.signal = signal;
    const response = await fetch(request.url, request.options);
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        ttsBackendRetryAfter = now + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60000);
        if (now - ttsBackendWarnedAt > 10000) {
          console.warn('Backend TTS rate limited; using browser speech until retry window clears.');
          ttsBackendWarnedAt = now;
        }
      }
      return null;
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType.startsWith('audio/') || contentType === 'application/octet-stream') {
      const blob = await response.blob();
      return blob.size ? blob : null;
    }
    return null;
  } catch {
    return null;
  }
}

window.__USSY_TTS_DEBUG__ = {
  ttsConfig,
  setTTSBackendEnabled,
  ttsEngine,
  radioChain,
  fetchTTSSpeech,
  buildBackendTTSRequest,
  combatAudio,
  ENEMY_CLASSES: typeof ENEMY_CLASSES !== 'undefined' ? ENEMY_CLASSES : [],
  WEAPON_DEFS: typeof WEAPON_DEFS !== 'undefined' ? WEAPON_DEFS : [],
  loadoutState: typeof loadoutState !== 'undefined' ? loadoutState : null,
  gameSettings,
  preprocessRadioText,
  getVoicePersona: source => audioRuntime.getVoicePersona(source)
};
window.__USSY_TTS_ENGINE__ = ttsEngine;
window.__USSY_LOADOUT__ = typeof loadoutState !== 'undefined' ? loadoutState : null;
window.__USSY_SKILL_TREE__ = typeof skillTree !== 'undefined' ? skillTree : null;

if (ttsEngine.supported) {
  window.speechSynthesis.onvoiceschanged = () => ttsEngine.initVoices();
  document.addEventListener('DOMContentLoaded', () => ttsEngine.initVoices());
}

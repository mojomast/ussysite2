import { clampVolume, configureSfxVolumeApplier, gameSettings, radioChain, ttsEngine } from './audio.js';
import { getCamera, getScene } from '../engine/scene.js';

const THREE = globalThis.THREE;

const BUFFER_TYPES = ['laser', 'missile', 'explosion', 'shield_hit', 'enemy_laser', 'ui_confirm', 'ui_deny'];
const NON_POSITIONAL_POOL_SIZES = {
  laser: 8,
  missile: 4,
  shield_hit: 4,
  ui_confirm: 2,
  ui_deny: 2
};
const POSITIONAL_POOL_SIZES = {
  explosion: 4,
  enemy_laser: 6
};
const POSITIONAL_SETTINGS = {
  distanceModel: 'inverse',
  refDistance: 12,
  rolloffFactor: 1.2,
  maxDistance: 120
};
const MASTER_GAIN_SCALE = 0.5;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function envelope(t, duration, attack = 0.002, decayPower = 2.4) {
  if (t < attack) return t / attack;
  return Math.pow(Math.max(0, 1 - (t - attack) / Math.max(0.001, duration - attack)), decayPower);
}

function renderBuffer(ctx, duration, renderSample) {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.ceil(duration * sampleRate)), sampleRate);
  const data = buffer.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < data.length; i += 1) {
    const t = i / sampleRate;
    const result = renderSample(t, i, sampleRate, phase);
    const sample = Array.isArray(result) ? result[0] : result;
    phase = Array.isArray(result) ? result[1] : phase;
    data[i] = clamp(sample, -1, 1);
  }
  return buffer;
}

function detachToAnchor(slot) {
  if (!slot?.sound || !slot.anchor) return;
  if (slot.sound.parent !== slot.anchor) {
    slot.sound.parent?.remove(slot.sound);
    slot.anchor.add(slot.sound);
  }
}

export const sfxEngine = {
  listener: null,
  ctx: null,
  masterGain: null,
  _buffers: {},
  _suspended: false,
  positionalPool: {},
  nonPositionalPool: {},
  engineHumSource: null,
  engineHumGain: null,
  engineHumLayerGains: null,
  ambientSources: [],
  ambientGain: null,
  _initialized: false,
  _warnedNoPositional: false,
  _engineHumRequested: false,
  _stationAmbientRequested: false,
  _lastPlay: null,
  _playCount: 0,
  _lastSkip: null,

  init() {
    if (this._initialized) return true;

    const chain = radioChain.ctx ? { ctx: radioChain.ctx } : radioChain.buildChain();
    if (!chain?.ctx) return false;

    this.ctx = radioChain.ctx;
    this._ensureContextRunning();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.setMasterVolume(gameSettings.sfxVolume);

    if (THREE?.AudioListener && THREE?.PositionalAudio && THREE?.AudioContext?.setContext) {
      THREE.AudioContext.setContext(this.ctx);
      this.listener = new THREE.AudioListener();
      try {
        this.listener.gain.disconnect();
        this.listener.gain.connect(this.masterGain);
      } catch {
        // Three.js listener routing is best-effort; flat SFX still use masterGain directly.
      }

      const camera = getCamera();
      if (camera && !camera.children.includes(this.listener)) camera.add(this.listener);
    } else if (!this._warnedNoPositional) {
      console.warn('Three.js positional audio unavailable; SFX will use flat Web Audio playback.');
      this._warnedNoPositional = true;
    }

    BUFFER_TYPES.forEach(type => {
      this._buffers[type] = this.synthesizeBuffer(type);
    });
    this._allocatePools();
    this._initialized = true;
    return true;
  },

  unlock() {
    if (!this.init() || !this.ctx || !this.masterGain) return false;
    this._ensureContextRunning();
    try {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.masterGain);
      source.onended = () => {
        try { source.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      };
      source.start(this.ctx.currentTime);
    } catch {
      // Unlock is opportunistic; regular play calls still handle failures safely.
    }
    return true;
  },

  _allocatePools() {
    Object.entries(NON_POSITIONAL_POOL_SIZES).forEach(([type, size]) => {
      this.nonPositionalPool[type] = Array.from({ length: size }, () => ({ busy: false, buffer: this._buffers[type], timer: null }));
    });

    if (!this.listener) {
      Object.entries(POSITIONAL_POOL_SIZES).forEach(([type, size]) => {
        this.nonPositionalPool[type] = Array.from({ length: size }, () => ({ busy: false, buffer: this._buffers[type], timer: null }));
      });
      return;
    }

    const scene = getScene();
    Object.entries(POSITIONAL_POOL_SIZES).forEach(([type, size]) => {
      this.positionalPool[type] = Array.from({ length: size }, () => {
        const anchor = new THREE.Object3D();
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(this._buffers[type]);
        sound.setDistanceModel(POSITIONAL_SETTINGS.distanceModel);
        sound.setRefDistance(POSITIONAL_SETTINGS.refDistance);
        sound.setRolloffFactor(POSITIONAL_SETTINGS.rolloffFactor);
        sound.setMaxDistance(POSITIONAL_SETTINGS.maxDistance);
        anchor.add(sound);
        scene?.add(anchor);
        return { busy: false, buffer: this._buffers[type], anchor, sound, timer: null };
      });
    });
  },

  playPositional(type, mesh, options = {}) {
    if (this._suspended) {
      this._lastSkip = { type, reason: 'suspended', at: Date.now() };
      return false;
    }
    if (!this.init()) {
      this._lastSkip = { type, reason: 'init-failed', at: Date.now() };
      return false;
    }
    const pool = this.positionalPool[type];
    const buffer = this._buffers[type];
    if (!pool || !buffer) return this.playFlat(type, options);
    this._ensureContextRunning();
    this._updateMasterGain();
    const slot = pool.find(item => !item.busy);
    if (!slot) {
      console.warn(`SFX pool exhausted: ${type}`);
      return false;
    }

    const pitch = Math.max(0.25, Number(options.pitch) || 1);
    const duration = (buffer.duration / pitch) + 0.06;
    const target = mesh || options.mesh;
    if (target?.getWorldPosition) target.getWorldPosition(slot.anchor.position);
    else if (target?.position) slot.anchor.position.copy(target.position);
    else if (options.position?.copy) slot.anchor.position.copy(options.position);

    detachToAnchor(slot);
    slot.busy = true;
    slot.sound.setBuffer(buffer);
    slot.sound.setLoop(Boolean(options.loop));
    slot.sound.setVolume(clampVolume(options.volume ?? 0.6));
    if (slot.sound.setPlaybackRate) slot.sound.setPlaybackRate(pitch);
    try {
      if (slot.sound.isPlaying) slot.sound.stop();
      slot.sound.play();
    } catch {
      slot.busy = false;
      return false;
    }
    window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(() => {
      try { if (slot.sound.isPlaying) slot.sound.stop(); } catch {}
      slot.busy = false;
      detachToAnchor(slot);
    }, duration * 1000);
    return true;
  },

  playFlat(type, options = {}) {
    if (this._suspended) {
      this._lastSkip = { type, reason: 'suspended', at: Date.now() };
      return false;
    }
    if (!this.init()) {
      this._lastSkip = { type, reason: 'init-failed', at: Date.now() };
      return false;
    }
    const pool = this.nonPositionalPool[type];
    const buffer = this._buffers[type];
    if (!pool || !buffer) {
      this._lastSkip = { type, reason: !pool ? 'missing-pool' : 'missing-buffer', at: Date.now() };
      return false;
    }
    this._ensureContextRunning();
    this._updateMasterGain();
    const slot = pool.find(item => !item.busy);
    if (!slot) {
      console.warn(`SFX pool exhausted: ${type}`);
      return false;
    }

    const pitch = Math.max(0.25, Number(options.pitch) || 1);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const duck = ttsEngine.activePriority >= 0 ? 0.55 : 1;
    const settingsVolume = Math.max(0.25, clampVolume(gameSettings.sfxVolume));
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(clampVolume(options.volume ?? 0.55) * settingsVolume * 1.25 * duck, now);
    source.connect(gain);
    gain.connect(this.ctx.destination);

    slot.busy = true;
    slot.source = source;
    slot.gain = gain;
    this._playCount += 1;
    this._lastPlay = { type, at: Date.now(), contextState: this.ctx.state, volume: gain.gain.value, sfxVolume: gameSettings.sfxVolume, playCount: this._playCount };
    source.onended = () => {
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
      slot.busy = false;
      slot.source = null;
      slot.gain = null;
    };
    source.start(now);
    return true;
  },

  testTone() {
    if (!this.init() || !this.ctx) return false;
    this._ensureContextRunning();
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
    this._playCount += 1;
    this._lastPlay = { type: 'testTone', at: Date.now(), contextState: this.ctx.state, volume: 0.3, sfxVolume: gameSettings.sfxVolume, playCount: this._playCount };
    oscillator.onended = () => {
      try { oscillator.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
    return true;
  },

  getDebugState() {
    return {
      initialized: this._initialized,
      contextState: this.ctx?.state || null,
      sfxVolume: gameSettings.sfxVolume,
      suspended: this._suspended,
      playCount: this._playCount,
      lastPlay: this._lastPlay,
      lastSkip: this._lastSkip,
      flatPools: Object.fromEntries(Object.entries(this.nonPositionalPool).map(([type, pool]) => [type, pool.length]))
    };
  },

  synthesizeBuffer(type) {
    if (!this.ctx) return null;
    if (type === 'laser' || type === 'enemy_laser') {
      const enemy = type === 'enemy_laser';
      const duration = enemy ? 0.13 : 0.11;
      const startFreq = enemy ? 1600 : 2200;
      const endFreq = enemy ? 180 : 240;
      const sweepPower = enemy ? 3.0 : 3.2;
      const twangFreq = enemy ? 3400 : 4200;
      const twangDecay = enemy ? 0.012 : 0.014;
      const twangDuration = enemy ? 0.018 : 0.022;
      const twangAmp = enemy ? 0.38 : 0.45;
      const shimmerAmp = enemy ? 0.18 : 0.22;
      const subFreq = enemy ? 55 : 70;
      const subDuration = 0.035;
      const subAmp = 0.28;
      let shimmerPhase = 0;
      let subPhase = 0;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const freq = endFreq + (startFreq - endFreq) * Math.pow(1 - progress, sweepPower);
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        shimmerPhase += (Math.PI * 2 * freq * 1.5) / sampleRate;
        subPhase += (Math.PI * 2 * subFreq) / sampleRate;
        const holdTime = duration * 0.08;
        const amp = t < holdTime ? 1 : Math.pow(Math.max(0, 1 - (t - holdTime) / (duration - holdTime)), 1.8);
        const fundamental = Math.sin(nextPhase) * 0.82;
        const shimmer = Math.sin(shimmerPhase) * shimmerAmp;
        const twangEnvelope = Math.exp(-t / twangDecay);
        const twangRing = Math.sin(Math.PI * 2 * twangFreq * t);
        const twang = t < twangDuration * 3 ? (Math.random() * 2 - 1) * twangRing * twangEnvelope * twangAmp : 0;
        const sub = Math.sin(subPhase) * Math.exp(-t / subDuration) * subAmp;
        return [Math.tanh((fundamental + shimmer) * amp + twang + sub), nextPhase];
      });
    }
    if (type === 'missile') {
      const duration = 0.22;
      let last = 0;
      let rumblePhase = 0;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const white = Math.random() * 2 - 1;
        const ignition = t < 0.015 ? white * Math.sin(2200 * t) * Math.exp(-t / 0.008) * 0.95 : 0;
        last = last * 0.72 + white * 0.28;
        const bodyRise = Math.min(1, Math.max(0, (t - 0.015) / 0.02));
        const bodyFall = t < 0.12 ? 1 : Math.max(0, 1 - (t - 0.12) / 0.08);
        const flicker = 1 + 0.12 * Math.sin(Math.PI * 2 * 18 * t);
        const whoosh = t >= 0.015 ? last * bodyRise * bodyFall * flicker * 0.72 : 0;
        const rumbleFreq = 90 + (38 - 90) * progress;
        rumblePhase += (Math.PI * 2 * rumbleFreq) / sampleRate;
        const rumbleDecay = t < 0.06 ? 1 : Math.exp(-(t - 0.06) / 0.11);
        const rumble = Math.sin(rumblePhase) * 0.3 * rumbleDecay;
        return [Math.tanh(ignition + whoosh + rumble), phase];
      });
    }
    if (type === 'explosion') {
      const duration = 0.65;
      let last = 0;
      let rumble = 0;
      let thumpPhase = 0;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const white = Math.random() * 2 - 1;
        const shockwave = t < 0.03 ? white * Math.exp(-t / 0.008) * 0.9 : 0;
        last = last * 0.84 + white * 0.16;
        rumble = rumble * 0.96 + white * 0.04;
        const bodyAmp = t < 0.03 ? 0 : Math.exp(-(t - 0.03) / 0.32);
        const debris = (last * 0.6 + rumble * 0.4) * bodyAmp * 1.15;
        const thumpProgress = Math.min(1, t / 0.2);
        const thumpFreq = 74 + (28 - 74) * thumpProgress;
        thumpPhase += (Math.PI * 2 * thumpFreq) / sampleRate;
        const subKick = t < 0.2 ? Math.sin(thumpPhase) * Math.pow(1 - thumpProgress, 2.5) * 0.55 : 0;
        const metallicRing = Math.sin(Math.PI * 2 * 820 * t) * Math.exp(-t / 0.035) * 0.12;
        return [Math.tanh(shockwave + debris + subKick + metallicRing), phase];
      });
    }
    if (type === 'shield_hit') {
      const duration = 0.18;
      let phase2 = 0;
      let subPhase = 0;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const freq = 1400 + (1650 - 1400) * progress;
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        phase2 += (Math.PI * 2 * (freq + 12)) / sampleRate;
        subPhase += (Math.PI * 2 * 38) / sampleRate;
        const white = Math.random() * 2 - 1;
        const impact = t < 0.02 ? white * Math.sin(3600 * t) * Math.exp(-t / 0.006) * 0.6 : 0;
        const ring = (Math.sin(nextPhase) + Math.sin(phase2)) * 0.5 * Math.pow(Math.max(0, 1 - progress), 2.2) * 0.65;
        const subPulse = Math.sin(subPhase) * Math.exp(-t / 0.02) * 0.35;
        return [Math.tanh(impact + ring + subPulse), nextPhase];
      });
    }
    if (type === 'ui_confirm' || type === 'ui_deny') {
      const confirm = type === 'ui_confirm';
      const duration = confirm ? 0.18 : 0.22;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const firstEnd = confirm ? 0.08 : 0.1;
        const secondStart = confirm ? 0.088 : 0.1;
        const secondEnd = duration;
        const activeSecond = t >= secondStart;
        const inGap = t >= firstEnd && t < secondStart;
        const freq = confirm ? (activeSecond ? 660 : 440) : (activeSecond ? 220 : 330);
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        const localT = activeSecond ? t - secondStart : t;
        const noteDuration = activeSecond ? secondEnd - secondStart : firstEnd;
        if (inGap) return [confirm ? Math.sin(Math.PI * 2 * 3300 * t) * 0.03 : (Math.random() * 2 - 1) * 0.03, nextPhase];
        if (confirm) {
          const saw = 2 * ((nextPhase % (Math.PI * 2)) / (Math.PI * 2)) - 1;
          const triangle = 2 * Math.abs(saw) - 1;
          const shimmer = Math.sin(Math.PI * 2 * 3300 * t) * 0.08;
          const noteAmp = envelope(localT, noteDuration, 0.003, 2.0) * (activeSecond ? 0.85 : 1);
          return [(triangle * 0.58 * noteAmp) + shimmer * Math.pow(Math.max(0, 1 - t / duration), 1.4), nextPhase];
        }
        const saw = 2 * (nextPhase / (Math.PI * 2) - Math.floor(0.5 + nextPhase / (Math.PI * 2)));
        const noise = (Math.random() * 2 - 1) * (activeSecond ? 0.18 : 0.12);
        const noteAmp = envelope(localT, noteDuration, 0.001, activeSecond ? 2.8 : 2.2) * (activeSecond ? 0.82 : 1);
        return [Math.tanh(saw * 0.62 * noteAmp + noise * noteAmp), nextPhase];
      });
    }
    return renderBuffer(this.ctx, 0.05, () => 0);
  },

  startEngineHum() {
    this._engineHumRequested = true;
    if (this._suspended || this.engineHumSource || !this.init()) return;
    this._ensureContextRunning();
    const now = this.ctx.currentTime;
    const base = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const grind = this.ctx.createOscillator();
    const pulse = this.ctx.createOscillator();
    const baseGain = this.ctx.createGain();
    const harmonicGain = this.ctx.createGain();
    const grindGain = this.ctx.createGain();
    const pulseGain = this.ctx.createGain();
    this.engineHumGain = this.ctx.createGain();
    base.type = 'sine';
    harmonic.type = 'triangle';
    grind.type = 'sawtooth';
    pulse.type = 'sine';
    base.frequency.setValueAtTime(52, now);
    harmonic.frequency.setValueAtTime(104, now);
    grind.frequency.setValueAtTime(156, now);
    pulse.frequency.setValueAtTime(78.3, now);
    baseGain.gain.setValueAtTime(0.018, now);
    harmonicGain.gain.setValueAtTime(0.012, now);
    grindGain.gain.setValueAtTime(0.008, now);
    pulseGain.gain.setValueAtTime(0.005, now);
    this.engineHumGain.gain.setValueAtTime(0.001, now);
    this.engineHumGain.gain.linearRampToValueAtTime(0.04, now + 0.12);
    base.connect(baseGain);
    harmonic.connect(harmonicGain);
    grind.connect(grindGain);
    pulse.connect(pulseGain);
    baseGain.connect(this.engineHumGain);
    harmonicGain.connect(this.engineHumGain);
    grindGain.connect(this.engineHumGain);
    pulseGain.connect(this.engineHumGain);
    this.engineHumGain.connect(this.masterGain);
    base.start(now);
    harmonic.start(now);
    grind.start(now);
    pulse.start(now);
    this.engineHumSource = { base, harmonic, grind, pulse };
    this.engineHumLayerGains = { baseGain, harmonicGain, grindGain, pulseGain };
  },

  stopEngineHum(options = {}) {
    if (!options.keepRequested) this._engineHumRequested = false;
    if (!this.ctx || !this.engineHumSource || !this.engineHumGain) {
      this.engineHumSource = null;
      this.engineHumGain = null;
      this.engineHumLayerGains = null;
      return;
    }
    const now = this.ctx.currentTime;
    const gain = this.engineHumGain;
    const sources = this.engineHumSource;
    const layerGains = this.engineHumLayerGains;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      Object.values(sources).forEach(source => source.stop(now + 0.14));
    } catch {}
    window.setTimeout(() => {
      Object.values(sources).forEach(source => {
        try { source.disconnect(); } catch {}
      });
      Object.values(layerGains || {}).forEach(layerGain => {
        try { layerGain.disconnect(); } catch {}
      });
      try { gain.disconnect(); } catch {}
    }, 180);
    this.engineHumSource = null;
    this.engineHumGain = null;
    this.engineHumLayerGains = null;
  },

  updateEngineHum(vel) {
    if (!this.ctx || !this.engineHumSource || !this.engineHumGain || this._suspended) return;
    this._updateMasterGain();
    const speed = typeof vel?.length === 'function' ? vel.length() : 0;
    const gainValue = clamp(0.04 + speed * 0.006, 0, 0.18);
    const freq = 52 + speed * 1.8;
    const now = this.ctx.currentTime;
    this.engineHumGain.gain.setTargetAtTime(gainValue, now, 0.08);
    this.engineHumSource.base.frequency.setTargetAtTime(freq, now, 0.08);
    this.engineHumSource.harmonic.frequency.setTargetAtTime(freq * 2, now, 0.08);
    this.engineHumSource.grind.frequency.setTargetAtTime(freq * 3, now, 0.08);
    this.engineHumSource.pulse.frequency.setTargetAtTime(freq * 1.5 + 0.3, now, 0.08);
    this.engineHumLayerGains?.grindGain.gain.setTargetAtTime(0.004 + speed * 0.0003, now, 0.08);
  },

  startStationAmbient() {
    this._stationAmbientRequested = true;
    if (this._suspended || this.ambientSources.length || !this.init()) return;
    const now = this.ctx.currentTime;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.001, now);
    this.ambientGain.gain.linearRampToValueAtTime(1, now + 0.5);
    this.ambientGain.connect(this.masterGain);
    [
      { type: 'sine', freq: 36, gain: 0.018 },
      { type: 'sine', freq: 54, gain: 0.022 },
      { type: 'sine', freq: 110.4, gain: 0.014 },
      { type: 'triangle', freq: 165, gain: 0.010 },
      { type: 'sine', freq: 220.8, gain: 0.006 },
      { type: 'sine', freq: 880, gain: 0.002 }
    ].forEach(layer => {
      const oscillator = this.ctx.createOscillator();
      const layerGain = this.ctx.createGain();
      oscillator.type = layer.type;
      oscillator.frequency.setValueAtTime(layer.freq, now);
      layerGain.gain.setValueAtTime(0.001, now);
      layerGain.gain.linearRampToValueAtTime(layer.gain, now + 0.5);
      oscillator.connect(layerGain);
      layerGain.connect(this.ambientGain);
      oscillator.start(now);
      this.ambientSources.push({ oscillator, gain: layerGain });
    });
  },

  stopStationAmbient(options = {}) {
    if (!options.keepRequested) this._stationAmbientRequested = false;
    if (!this.ctx || !this.ambientGain || this.ambientSources.length === 0) {
      this.ambientSources = [];
      this.ambientGain = null;
      return;
    }
    const now = this.ctx.currentTime;
    const sources = this.ambientSources;
    const gain = this.ambientGain;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
      sources.forEach(source => source.oscillator.stop(now + 0.42));
    } catch {}
    window.setTimeout(() => {
      sources.forEach(source => {
        try { source.oscillator.disconnect(); } catch {}
        try { source.gain.disconnect(); } catch {}
      });
      try { gain.disconnect(); } catch {}
    }, 480);
    this.ambientSources = [];
    this.ambientGain = null;
  },

  setMasterVolume(value) {
    gameSettings.sfxVolume = clampVolume(value ?? gameSettings.sfxVolume ?? 0.55);
    this._updateMasterGain();
  },

  _ensureContextRunning() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  },

  _updateMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    const duck = ttsEngine.activePriority >= 0 ? 0.38 : 1;
    const target = MASTER_GAIN_SCALE * clampVolume(gameSettings.sfxVolume) * duck;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  },

  suspend() {
    this._suspended = true;
    this.stopEngineHum({ keepRequested: true });
    this.stopStationAmbient({ keepRequested: true });
    if (this.masterGain && this.ctx) this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
  },

  resume() {
    this._suspended = false;
    this._updateMasterGain();
    if (this._engineHumRequested) this.startEngineHum();
    if (this._stationAmbientRequested) this.startStationAmbient();
  }
};

configureSfxVolumeApplier(value => sfxEngine.setMasterVolume(value));
globalThis.__USSY_SFX__ = sfxEngine;

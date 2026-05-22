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
const MASTER_GAIN_SCALE = 0.28;

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
  ambientSources: [],
  ambientGain: null,
  _initialized: false,
  _engineHumRequested: false,
  _stationAmbientRequested: false,

  init() {
    if (this._initialized) return true;
    if (!THREE || !THREE.AudioListener || !THREE.PositionalAudio || !THREE.AudioContext?.setContext) return false;

    const chain = radioChain.ctx ? { ctx: radioChain.ctx } : radioChain.buildChain();
    if (!chain?.ctx) return false;

    this.ctx = radioChain.ctx;
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.setMasterVolume(gameSettings.sfxVolume);

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

    BUFFER_TYPES.forEach(type => {
      this._buffers[type] = this.synthesizeBuffer(type);
    });
    this._allocatePools();
    this._initialized = true;
    return true;
  },

  _allocatePools() {
    Object.entries(NON_POSITIONAL_POOL_SIZES).forEach(([type, size]) => {
      this.nonPositionalPool[type] = Array.from({ length: size }, () => ({ busy: false, buffer: this._buffers[type], timer: null }));
    });

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
    if (this._suspended || !this.init()) return false;
    const pool = this.positionalPool[type];
    const buffer = this._buffers[type];
    if (!pool || !buffer) return false;
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
    if (this._suspended || !this.init()) return false;
    const pool = this.nonPositionalPool[type];
    const buffer = this._buffers[type];
    if (!pool || !buffer) return false;
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
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(clampVolume(options.volume ?? 0.55), now);
    source.connect(gain);
    gain.connect(this.masterGain);

    slot.busy = true;
    slot.source = source;
    slot.gain = gain;
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

  synthesizeBuffer(type) {
    if (!this.ctx) return null;
    if (type === 'laser' || type === 'enemy_laser') {
      const duration = type === 'enemy_laser' ? 0.075 : 0.085;
      const start = type === 'enemy_laser' ? 940 : 1220;
      const end = type === 'enemy_laser' ? 260 : 330;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const freq = start + (end - start) * progress;
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        const wave = Math.sin(nextPhase) * 0.78 + Math.sign(Math.sin(nextPhase * 0.5)) * 0.16;
        return [wave * envelope(t, duration, 0.002, 2.1), nextPhase];
      });
    }
    if (type === 'missile') {
      const duration = 0.2;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const freq = 180 + (80 - 180) * progress;
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        const saw = 2 * (nextPhase / (Math.PI * 2) - Math.floor(0.5 + nextPhase / (Math.PI * 2)));
        const noise = (Math.random() * 2 - 1) * 0.18;
        return [(saw * 0.62 + noise) * envelope(t, duration, 0.01, 1.5), nextPhase];
      });
    }
    if (type === 'explosion') {
      const duration = 0.6;
      let last = 0;
      return renderBuffer(this.ctx, duration, t => {
        const progress = t / duration;
        const white = Math.random() * 2 - 1;
        last = last * 0.84 + white * 0.16;
        const thump = Math.sin(Math.PI * 2 * (74 - 32 * progress) * t) * Math.max(0, 1 - progress * 1.7);
        return (last * 0.85 + thump * 0.48) * envelope(t, duration, 0.001, 2.8);
      });
    }
    if (type === 'shield_hit') {
      const duration = 0.12;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const progress = t / duration;
        const freq = 1200 + Math.sin(progress * Math.PI * 8) * 80;
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        return [Math.sin(nextPhase) * envelope(t, duration, 0.003, 2.6), nextPhase];
      });
    }
    if (type === 'ui_confirm' || type === 'ui_deny') {
      const confirm = type === 'ui_confirm';
      const duration = confirm ? 0.16 : 0.2;
      return renderBuffer(this.ctx, duration, (t, i, sampleRate, phase) => {
        const split = duration * 0.5;
        const freq = confirm
          ? (t < split ? 660 : 880)
          : (t < split ? 330 : 220);
        const localT = t < split ? t : t - split;
        const nextPhase = phase + (Math.PI * 2 * freq) / sampleRate;
        return [Math.sin(nextPhase) * envelope(localT, split, 0.004, 2.2) * 0.72, nextPhase];
      });
    }
    return renderBuffer(this.ctx, 0.05, () => 0);
  },

  startEngineHum() {
    this._engineHumRequested = true;
    if (this._suspended || this.engineHumSource || !this.init()) return;
    const now = this.ctx.currentTime;
    const base = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    this.engineHumGain = this.ctx.createGain();
    base.type = 'sine';
    harmonic.type = 'triangle';
    base.frequency.setValueAtTime(52, now);
    harmonic.frequency.setValueAtTime(104, now);
    this.engineHumGain.gain.setValueAtTime(0.001, now);
    this.engineHumGain.gain.linearRampToValueAtTime(0.04, now + 0.12);
    base.connect(this.engineHumGain);
    harmonic.connect(this.engineHumGain);
    this.engineHumGain.connect(this.masterGain);
    base.start(now);
    harmonic.start(now);
    this.engineHumSource = { base, harmonic };
  },

  stopEngineHum(options = {}) {
    if (!options.keepRequested) this._engineHumRequested = false;
    if (!this.ctx || !this.engineHumSource || !this.engineHumGain) {
      this.engineHumSource = null;
      this.engineHumGain = null;
      return;
    }
    const now = this.ctx.currentTime;
    const gain = this.engineHumGain;
    const sources = this.engineHumSource;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      sources.base.stop(now + 0.14);
      sources.harmonic.stop(now + 0.14);
    } catch {}
    window.setTimeout(() => {
      try { sources.base.disconnect(); } catch {}
      try { sources.harmonic.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    }, 180);
    this.engineHumSource = null;
    this.engineHumGain = null;
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
  },

  startStationAmbient() {
    this._stationAmbientRequested = true;
    if (this._suspended || this.ambientSources.length || !this.init()) return;
    const now = this.ctx.currentTime;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.001, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.035, now + 0.35);
    this.ambientGain.connect(this.masterGain);
    [82, 110, 138, 165].forEach((freq, index) => {
      const oscillator = this.ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq + (index - 1.5) * 0.7, now);
      oscillator.connect(this.ambientGain);
      oscillator.start(now);
      this.ambientSources.push(oscillator);
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
      sources.forEach(source => source.stop(now + 0.42));
    } catch {}
    window.setTimeout(() => {
      sources.forEach(source => {
        try { source.disconnect(); } catch {}
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

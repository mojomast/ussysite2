# SFX Engine

`js/flight/sfx.js` exports `sfxEngine`, a procedural Web Audio and Three.js positional sound engine for the Ussyverse flight layer.

## Audio Context

SFX uses the existing `radioChain.ctx` from `js/flight/audio.js`. It never creates a separate `AudioContext`.

Initialization calls `radioChain.buildChain()` only when the shared context does not exist yet, then passes that context into Three.js with `THREE.AudioContext.setContext(radioChain.ctx)` before creating `THREE.AudioListener`.

The SFX master bus is routed directly to `radioChain.ctx.destination`. It does not connect to `radioChain`'s highpass/lowpass/waveshaper radio chain, so weapon, UI, engine, and ambience sounds remain clean while TTS and combat chatter keep their radio treatment.

Flat player weapon/UI sounds only require the shared Web Audio context and route to `ctx.destination` with their own effective gain so weapon fire remains audible even if the positional/master listener path is unavailable. Flat one-shots keep a small audible floor even if an old `sfxVolume` setting was persisted too low. If Three.js positional audio is unavailable, positional sounds fall back to capped flat Web Audio pools instead of disabling all SFX.

For browser debugging, `window.__USSY_SFX__` exposes `testTone()` and `getDebugState()`.

## Public API

- `sfxEngine.init()` creates the shared master gain, listener, procedural buffers, and fixed-size pools.
- `sfxEngine.playPositional(type, mesh, options)` plays a pooled Three.js positional sound near a mesh or position.
- `sfxEngine.playFlat(type, options)` plays a pooled non-positional sound through the SFX master bus.
- `sfxEngine.synthesizeBuffer(type)` builds one reusable `AudioBuffer` for a supported sound type.
- `sfxEngine.startEngineHum()` starts the continuous flight engine drone.
- `sfxEngine.stopEngineHum()` ramps and stops the engine drone.
- `sfxEngine.updateEngineHum(vel)` updates hum gain and frequency from the flight velocity vector.
- `sfxEngine.startStationAmbient()` starts the docked station sine cluster.
- `sfxEngine.stopStationAmbient()` fades station ambience for 400ms and stops all oscillators.
- `sfxEngine.setMasterVolume(v)` applies `gameSettings.sfxVolume` to the SFX bus.
- `sfxEngine.suspend()` gates SFX while the page is hidden without suspending the shared audio context.
- `sfxEngine.resume()` restores the SFX bus and restarts requested continuous sounds.

## Sound Types

- `laser`: player blaster, non-positional, descending bolt with metallic twang, harmonic shimmer, and sub thump.
- `missile`: player missile launch, non-positional, ignition crack, pink-ish rocket whoosh, and descending low rumble.
- `explosion`: enemy kill explosion, positional, overpressure crack, rolling debris body, sub kick, and metallic hull ping.
- `shield_hit`: player damage feedback, non-positional, crack transient, detuned crystal resonance, and low shield pulse.
- `enemy_laser`: enemy fire, positional, darker lower blaster sweep with shorter metallic transient.
- `ui_confirm`: ascending triangle-wave acknowledgement with a quiet cyber shimmer.
- `ui_deny`: descending sawtooth rejection cue with gritty noise texture.

## Sound Design

All one-shot buffers are procedural and synthesized once with `renderBuffer()`. No external audio files are loaded.

Laser buffers use a Star Wars-style blaster shape: an exponential downward sweep, resonant metallic twang transient, perfect-fifth shimmer, and a short low-frequency thump. Player `laser` sweeps `2200Hz -> 240Hz` over `0.11s`; positional `enemy_laser` sweeps `1600Hz -> 180Hz` over `0.13s` so hostile fire reads darker in the spatial mix.

The `missile` cue is a `0.22s` rocket launch: a 15ms ignition crack, a filtered pink-ish noise body with tremolo flicker, and a `90Hz -> 38Hz` descending rumble tone.

The `explosion` cue is a `0.65s` layered kill impact: broadband shockwave crack, two-stage filtered debris/fire noise, `74Hz -> 28Hz` sub kick, and a short `820Hz` metallic ring for hull-strike character.

The `shield_hit` cue is a `0.18s` force-field impact: a filtered crack transient, detuned `1400Hz/1412Hz` crystal resonance sweeping upward toward `1650Hz`, and a `38Hz` body pulse.

UI cues are intentionally synthetic but tactile. `ui_confirm` is a two-note `440Hz -> 660Hz` triangle acknowledgement with a quiet `3300Hz` shimmer. `ui_deny` is a harsher `330Hz -> 220Hz` sawtooth rejection with noise grit.

Continuous engine hum is a four-oscillator stack routed through the SFX bus: `52Hz` sine fundamental, `104Hz` triangle warmth, `156Hz` sawtooth grind, and a detuned `78Hz` sine pulse. `updateEngineHum(vel)` raises pitch with speed and increases the grind layer so high velocity sounds more mechanical.

Docked station ambience is a six-oscillator atmosphere: `36Hz` structural bass, `54Hz` power hum, `110.4Hz` corridor resonance, `165Hz` triangle body, `220.8Hz` upper shimmer, and a nearly subliminal `880Hz` electronics bleed. All layers fade in over `0.5s` and create motion through natural beating instead of LFO nodes.

## Pools

Buffers are pre-synthesized once in `init()`. `AudioBufferSourceNode` instances are intentionally created per playback because the Web Audio spec makes them one-shot.

Non-positional pools:

| Type | Slots |
| --- | ---: |
| `laser` | 8 |
| `missile` | 4 |
| `shield_hit` | 4 |
| `ui_confirm` | 2 |
| `ui_deny` | 2 |

Positional pools:

| Type | Slots |
| --- | ---: |
| `explosion` | 4 |
| `enemy_laser` | 6 |

Positional settings are `distanceModel: 'inverse'`, `refDistance: 12`, `rolloffFactor: 1.2`, and `maxDistance: 120`.

If a pool is exhausted, playback logs `console.warn` and skips the sound. It does not throw and does not allocate extra pool slots.

## Gain Values

The SFX bus uses `gameSettings.sfxVolume` with a conservative internal scale so radio TTS remains dominant. The default `sfxVolume` is `0.55`.

Hook volumes:

| Event | Type | Volume |
| --- | --- | ---: |
| Player primary fire | `laser` | `0.6` |
| Player missile fire | `missile` | `0.7` |
| Player hit | `shield_hit` | `0.8` |
| Enemy killed | `explosion` | `0.9` |
| Enemy fire | `enemy_laser` | `0.5` |
| UI choice/dismiss | `ui_confirm` / `ui_deny` | `0.55` |

Engine hum gain follows `clamp(0.04 + vel.length() * 0.006, 0, 0.18)`. Hum frequency follows `52 + vel.length() * 1.8` Hz, with the sawtooth grind layer scaling from `0.004 + vel.length() * 0.0003`.

## Soft Suspend

`sfxEngine.suspend()` is used for Page Visibility. It sets a soft suspended flag, stops continuous SFX, and ramps the SFX master bus down. It deliberately does not call `audioCtx.suspend()` because the context is shared with TTS and radio playback.

`sfxEngine.resume()` clears the flag and restarts the engine hum or station ambient if those sounds were requested before suspension.

# SFX Engine

`js/flight/sfx.js` exports `sfxEngine`, a procedural Web Audio and Three.js positional sound engine for dogfight mode.

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

- `laser`: player laser, non-positional, short descending tone.
- `missile`: player missile launch, non-positional, saw sweep plus noise.
- `explosion`: enemy kill explosion, positional, filtered noise and low thump.
- `shield_hit`: player damage feedback, non-positional, short high sine ring.
- `enemy_laser`: enemy fire, positional, lower laser sweep.
- `ui_confirm`: ascending two-tone UI acknowledgement.
- `ui_deny`: descending two-tone UI dismiss/reject cue.

## Sound Design

Laser buffers use a Star Wars-style energy bolt shape: a near-instant attack, exponential downward frequency sweep, harmonic fifth shimmer, and a sub-10ms white-noise transient for the initial crack. Player `laser` is brighter and longer at 1800Hz to 280Hz over 90ms, while positional `enemy_laser` is lower and shorter at 1400Hz to 220Hz over 75ms so it reads as distant hostile fire in the spatial mix.

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

Engine hum gain follows `clamp(0.04 + vel.length() * 0.006, 0, 0.18)`. Hum frequency follows `52 + vel.length() * 1.8` Hz.

## Soft Suspend

`sfxEngine.suspend()` is used for Page Visibility. It sets a soft suspended flag, stops continuous SFX, and ramps the SFX master bus down. It deliberately does not call `audioCtx.suspend()` because the context is shared with TTS and radio playback.

`sfxEngine.resume()` clears the flag and restarts the engine hum or station ambient if those sounds were requested before suspension.

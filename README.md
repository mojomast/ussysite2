# USSYSITE2

USSYSITE2 is the USSYVERSE portfolio site: a browser-native Three.js project constellation with a hidden space combat and trade easter egg. The public site is a cybernetic 3D index of projects from `projects.js`; typing `ussy` launches the flight layer where those project nodes become project-backed planets and service hubs.

## How To Run

Open `index.html` in a browser. There is no build step, bundler, or package install required for the static site.

Optional local server, backend TTS, and AI gameplay orchestration use `server.mjs` via `npm start`.

## Easter Egg

Type `ussy` anywhere outside an input field to enter dogfight mode.

## Combat

Dogfight mode now includes enemy classes, weapon loadouts, shield bleedthrough, heat/overheat, adrenaline feedback, station equipment, and a dock-only skill tree. Land at a project-backed planet or dock at a standalone station to use services; press `U` while landed to spend skill points.

## Controls

| Control | Action |
| --- | --- |
| `W` / `S` or arrow up/down | Forward/reverse thrust, drains fuel |
| `A` / `D` or arrow left/right | Strafe |
| `Q` / `E` | Roll |
| Mouse | Mouselook while pointer locked |
| Left mouse | Fire lasers |
| Right mouse | Fire missile |
| `V` | Set nav target from crosshair project |
| `Y` | Toggle autopilot |
| `Shift+C` | Toggle cockpit/chase view |
| `L` | Begin landing when in orbital approach |
| `B` | Open mission board while landed and no modal is active |
| `R` | Toggle throttle hold |
| `T` | Reserved target cycle |
| `U` | Open skill tree while landed |
| `Space` | Confirm/dismiss station and mission messages |
| `M` | Toggle system map |
| `Shift+M` | Toggle TTS radio |
| `Escape` / `Backspace` | Close overlays/back; Escape exits flight mode when pointer is unlocked |

## File Structure

```text
index.html
index.css
projects.js
js/
  main.js
  engine/
  flight/
  tts/
  ui/
  economy/trader.js
docs/
  ARCHITECTURE.md
  ECONOMY.md
  ORCHESTRATOR.md
  sfx-engine.md
  TTS.md
```

`projects.js` remains a standalone script and exposes `window.USSY_PROJECTS` and `window.USSY_CATEGORIES` for module code.

## Module Architecture

- `js/main.js` - Thin browser entry point that starts the DOM bootstrap and animation loop.
- `js/constants.js` - Shared runtime constants used across modules.
- `js/input.js` - Keyboard, mouse, pointer-lock, wheel, and touch input state/listeners.
- `js/engine/core.js` - Holographic core mesh setup and animation helpers.
- `js/engine/nodes.js` - Project data aliases, graph node registries, label metadata, and relationship edge helpers.
- `js/engine/renderer.js` - Three.js scene, camera, ACES/SRGB renderer settings, and resize ownership.
- `js/engine/scene.js` - Scene groups, lighting, and camera animation state helpers.
- `js/engine/starfield.js` - Starfields, debris, dust, and deep-space environment updates.
- `js/economy/reputation.js` - Faction reputation normalization and price modifiers.
- `js/economy/trader.js` - Station services, cargo market, inventory, equipment, fuel, and credit transactions.
- `js/flight/audio.js` - Browser TTS, radio filter chain, audio settings, and combat chatter.
- `js/flight/combat-overhaul.js` - Combat definitions and pure combat math helpers.
- `js/flight/combat-state.js` - Shared combat progression, loadout, XP, and resource state.
- `js/flight/combat.js` - Combat scene object creation plus combat API aggregation.
- `js/flight/enemies.js` - Enemy pool construction, spawning, AI, damage, and projectile collision handling.
- `js/flight/hud.js` - Flight HUD, cockpit radar, nav marker, camera, telemetry, and TTS indicators.
- `js/flight/messages.js` - Radio/game message rendering, typewriter flow, choices, and TTS persona routing.
- `js/flight/mission.js` - Mission contracts, objective persistence, and orchestrator payload helpers.
- `js/flight/navigation.js` - Crosshair targeting, nav targets, autopilot, landing target, and nav-line rendering.
- `js/flight/orchestrator.js` - Client-side director cooldowns, event gating, payload construction, and event application.
- `js/flight/physics.js` - Flight physics tick, basis vectors, thrust, drag, fuel drain, and bounds handling.
- `js/flight/runtime.js` - Thin flight runtime re-export boundary used by `js/main.js`.
- `js/flight/sfx.js` - Shared-context procedural SFX, positional audio pools, engine hum, and dock ambience.
- `js/flight/state.js` - Flight runtime state, persistence, post-processing, mode transitions, and integrated init/tick wiring.
- `js/flight/weapons.js` - Player/enemy projectiles, missiles, beams, heat, trails, and weapon VFX pools.
- `js/tts/engine.js` - Reusable TTS transmission queue and playback coordination primitives.
- `js/ui/console.js` - Console mode, project/category UI, project inspection, and selection actions.
- `js/ui/cursor.js` - Custom neon cursor state and frame updates.
- `js/ui/hero.js` - Hero scroll, wheel, touch, nav dots, and section camera/light reactions.
- `js/ui/inventory-panel.js` - Inventory, station services, equipment, cargo, and skill-tree panel rendering.
- `js/ui/nodes-overlay.js` - Project label overlay, hover state, cursor hover feedback, and node selection visuals.
- `js/ui/orbit.js` - Orbit camera drag, wheel zoom, and camera target synchronization.

## TTS

The browser never receives the OpenRouter API key. `js/flight/audio.js` calls the same-origin `/api/tts` endpoint, and `server.mjs` proxies the request to OpenRouter using `OPENROUTER_API_KEY` from the server environment.

Defaults:

```bash
OPENROUTER_TTS_MODEL=hexgrad/kokoro-82m
OPENROUTER_TTS_VOICE=onyx
OPENROUTER_TTS_FORMAT=pcm16
OPENROUTER_TTS_SAMPLE_RATE=24000
HOST=127.0.0.1
PORT=3000
```

Kokoro is the default backend TTS model. OpenAI-style voice names are mapped server-side to Kokoro voice IDs, and the backend returns the upstream `audio/*` response to the browser for Web Audio playback.

To switch back to GPT Audio, set `OPENROUTER_TTS_MODEL=openai/gpt-audio`. See `docs/TTS.md` for the voice map, endpoint differences, and multi-channel audio behavior.

## Economy

The hidden flight mode includes a lightweight TradeWars/Elite-style economy. The player starts with credits, fuel, and an empty cargo hold. Project-backed planets and standalone stations expose deterministic markets, lore-specific merchants, a docked services grid, and mission boards that turn real project relationships into delivery, recon, intel, and escort contracts.

## Objectives

Dogfight mode now opens with a deployment choice: run the guided tutorial or enter free roam with the director enabled. The tutorial covers combat, landing, and a cargo-market buy/sell route. The flight HUD includes an objectives panel toggled with `O`, showing the current objective and available multi-step contracts.

## Mission System

`js/flight/mission.js` executes the built-in multi-step contracts. Patrol Sweep spawns and tracks combat kills before docking for bounty payment. Constellation Survey assigns station landing objectives and enforces the second stop at a different project. Market Proving Run watches successful buy/sell trade callbacks and requires changing markets before sale.

The orchestrator now dispatches event types into contracts instead of only showing waypoint text: combat and bounty events start kill contracts, trade or contraband pressure starts market runs, and distress/anomaly/survey events start landing routes. Active missions are guarded so a new director event cannot overwrite current progress.

## Audio Settings

In flight, press `M` to open audio settings for radio volume, combat chatter volume, SFX volume, TTS mute, and quiet defaults. Radio transmissions default quieter than before, and all in-game voices are routed through the radio filter chain so clean and distorted voice paths do not mix.

## SFX Engine

Dogfight mode uses `js/flight/sfx.js` for procedural laser, missile, explosion, shield, UI, engine hum, and station ambience sounds. The engine shares `radioChain.ctx`, routes its own master gain directly to the audio destination, pre-synthesizes reusable `AudioBuffer`s, and caps playback with fixed-size pools. Adjust `sfxVolume` from the in-flight audio settings menu; the value persists with the other flight audio settings. See `docs/sfx-engine.md` for the full API and pool layout.

## How It Works

The client runs all rendering, flight, combat, trade, objective, mission, and HUD state locally. After the tutorial completes or free roam is selected, `gameOrchestrator` begins sparse polling of `/api/orchestrate`; the server asks a cheap Gemini Flash model whether to fire a post-tutorial event. Events return as JSON and are rendered through the existing `showGameMessage()` radio/HUD system.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | unset | Server-side OpenRouter key for TTS and orchestration |
| `OPENROUTER_TTS_MODEL` | `hexgrad/kokoro-82m` | TTS model |
| `OPENROUTER_TTS_VOICE` | `onyx` | TTS voice ID |
| `OPENROUTER_TTS_FORMAT` | `pcm16` | TTS audio format |
| `OPENROUTER_TTS_SAMPLE_RATE` | `24000` | PCM sample rate |
| `ORCHESTRATOR_MODEL` | `google/gemini-2.5-flash-preview` | Cheap post-tutorial game master model |
| `ORCHESTRATOR_ENABLED` | `true` | Set `false` to disable `/api/orchestrate` events |
| `PORT` | `3000` | Local server port |
| `HOST` | `127.0.0.1` | Local server host |
| `PUBLIC_ORIGIN` | unset | Optional allowed browser origin |

## Adding Projects

Edit the `USSY_PROJECTS` array in `projects.js`. New projects automatically receive a graph node and a station profile based on category.

Flight-system planet ids are the same project ids from `USSY_PROJECTS`. `js/flight/world.js` is the canonical world model, and `worldToThree(posArray, THREE)` converts authored world coordinates for rendering, navigation, proximity, HUD, and persistence systems.

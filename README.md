# USSYSITE2

USSYSITE2 is the USSYVERSE portfolio site: a browser-native Three.js project constellation with a hidden space combat and trade easter egg. The public site is a cybernetic 3D index of projects from `projects.js`; typing `ussy` launches the flight layer where those project nodes become stations.

## How To Run

Open `index.html` in a browser. There is no build step, bundler, or package install required for the static site.

Optional local server, backend TTS, and AI gameplay orchestration use `server.mjs` via `npm start`.

## Easter Egg

Type `ussy` anywhere outside an input field to enter dogfight mode.

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
| `P` | Toggle autopilot |
| `C` | Toggle cockpit/chase view |
| `L` | Land and restock at nearby project station |
| `T` | Open trade menu while landed |
| `Space` | Confirm/dismiss station and mission messages |
| `M` | Toggle TTS radio |
| `Escape` | Exit flight mode when pointer is unlocked |

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
  TTS.md
```

`projects.js` remains a standalone script and exposes `window.USSY_PROJECTS` and `window.USSY_CATEGORIES` for module code.

## TTS

Browser Web Speech API is used by default. Optional backend/AI voice support can be enabled from the browser console with:

```js
window.setTTSKey('your-key')
```

## Economy

The hidden flight mode includes a lightweight TradeWars/Elite-style economy. The player starts with credits, fuel, and an empty cargo hold. Project nodes act as stations with deterministic markets: production goods are cheap, demand goods sell high, and prices vary by station/commodity hash.

## How It Works

The client runs all rendering, flight, combat, trade, mission, and HUD state locally. After the tutorial handoff completes, `gameOrchestrator` begins sparse polling of `/api/orchestrate`; the server asks a cheap Gemini Flash model whether to fire a post-tutorial event. Events return as JSON and are rendered through the existing `showGameMessage()` radio/HUD system.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | unset | Server-side OpenRouter key for TTS and orchestration |
| `OPENROUTER_TTS_MODEL` | `openai/gpt-audio` | TTS model |
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

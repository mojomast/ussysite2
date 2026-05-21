# USSYSITE2

USSYSITE2 is the USSYVERSE portfolio site: a browser-native Three.js project constellation with a hidden space combat and trade easter egg. The public site is a cybernetic 3D index of projects from `projects.js`; typing `ussy` launches the flight layer where those project nodes become stations.

## How To Run

Open `index.html` in a browser. There is no build step, bundler, or package install required for the static site.

Optional local server and backend TTS support still use `server.mjs` via `npm start`.

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

## Adding Projects

Edit the `USSY_PROJECTS` array in `projects.js`. New projects automatically receive a graph node and a station profile based on category.

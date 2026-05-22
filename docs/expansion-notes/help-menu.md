# Help Menu Architecture

Phase 1 research note for Phase 6 help menu work. Source dependency `docs/expansion-notes/controls-audit.md` was present before this note was written. Read in full: `controls-audit.md`, `index.html`, `index.css`, `js/flight/state.js`, and `js/flight/hud.js`. No application code changes were made.

## Current Modal And Overlay Pattern

Existing overlays are plain DOM panels layered above the WebGL canvas and controlled with `hidden`, `.hidden`, body classes, or `.active` classes.

| Overlay | HTML | Visibility Pattern | Z-index | Notes |
|---|---|---|---|---|
| Game message | `#game-message-system` | `.active` only visible under `body.flight-active` | `9500` | Top-center modal-like message with choices. Uses `pointer-events: auto` only while active. |
| Combat debrief | `#combat-debrief` | `.active` | `9800` | Center modal. Higher than messages. |
| System map | `#system-map-overlay.system-map.hidden` | `.hidden` toggled by `setSystemMapVisible()` | `60` | Absolute full-screen overlay inside document flow; visually behind cockpit HUD z-indexes because cockpit panels are fixed at `9000+`. |
| Inventory | `#inventory-panel[hidden]` | `hidden` attr | `9400` | Fixed centered dialog. Existing inline close hides the panel only. |
| Loadout | `#loadout-panel[hidden]` | `hidden` attr | `9450` | Fixed centered dialog. Slightly above inventory, below game message. |
| Cockpit HUD | `#cockpit-overlay` and fixed children | `body.flight-active` and `flight-third-person` | overlay `9000`; panels `9100` to `9200` | HUD stays visible in flight unless docked/third-person conditions reduce it. |
| Master warning | `#hud-master-warning` | `.active` | `9600` | Above game messages for critical warning. |
| Custom cursor | `#custom-cursor` | always present | `10000` | Highest visible UI layer. |

Recommended help overlay layer: `z-index: 9700`. This places help above game messages, inventory, loadout, and master warning, but below combat debrief and custom cursor. If help should never cover combat debrief, keep `9700`. If pause/help should be the absolute top modal, use `9900` and leave cursor at `10000`.

## Key Binding Recommendation

Use `H` as the primary help key and `F1` as an alternate.

Evidence from `controls-audit.md`: `KeyH` and `F1` are both unbound. `KeyF` is already cold jump when engine skill `eng_5` is unlocked, so do not use plain `F` for help.

Recommended binding behavior:

| Input | Action |
|---|---|
| `H` | Toggle help overlay. |
| `F1` | Toggle help overlay and call `event.preventDefault()` to suppress browser help. |
| `Escape` | Close help if open before lower-priority back/exit behavior. |
| `P` | Pause/menu, reserved after moving autopilot to `Y`. |

## HTML Structure

Place the help overlay near the other flight overlays, after `#system-map-overlay` or after `#loadout-panel`. It should be a real dialog, initially hidden, and independent of game messages.

```html
<div id="help-menu" class="help-menu" hidden role="dialog" aria-modal="true" aria-labelledby="help-menu-title">
  <div class="help-menu-shell">
    <header class="help-menu-header">
      <div>
        <span class="help-menu-kicker">OPERATOR REFERENCE</span>
        <h2 id="help-menu-title">HELP MENU</h2>
      </div>
      <button id="help-menu-close" class="help-menu-close" type="button" aria-label="Close help menu">[ESC]</button>
    </header>

    <nav class="help-tabs" role="tablist" aria-label="Help sections">
      <button id="help-tab-controls" class="help-tab active" type="button" role="tab" aria-selected="true" aria-controls="help-panel-controls" data-help-tab="controls">CONTROLS</button>
      <button id="help-tab-how" class="help-tab" type="button" role="tab" aria-selected="false" aria-controls="help-panel-how" data-help-tab="how">HOW TO PLAY</button>
      <button id="help-tab-universe" class="help-tab" type="button" role="tab" aria-selected="false" aria-controls="help-panel-universe" data-help-tab="universe">UNIVERSE</button>
      <button id="help-tab-tips" class="help-tab" type="button" role="tab" aria-selected="false" aria-controls="help-panel-tips" data-help-tab="tips">TIPS & TRICKS</button>
    </nav>

    <div class="help-menu-body">
      <section id="help-panel-controls" class="help-panel active" role="tabpanel" aria-labelledby="help-tab-controls"></section>
      <section id="help-panel-how" class="help-panel" role="tabpanel" aria-labelledby="help-tab-how" hidden></section>
      <section id="help-panel-universe" class="help-panel" role="tabpanel" aria-labelledby="help-tab-universe" hidden></section>
      <section id="help-panel-tips" class="help-panel" role="tabpanel" aria-labelledby="help-tab-tips" hidden></section>
    </div>

    <footer class="help-menu-footer">
      <span><kbd>H</kbd>/<kbd>F1</kbd> CLOSE HELP</span>
      <span><kbd>ESC</kbd> BACK</span>
      <span><kbd>P</kbd> PAUSE</span>
    </footer>
  </div>
</div>
```

## CSS Patterns

Reuse the existing cyber HUD language instead of creating a separate visual system:

| Existing Pattern | Reuse For Help |
|---|---|
| `.hud-panel` glass panel style | Shell background, borders, corner treatment. |
| `.game-message-system` strong top border and clipped polygon | Modal silhouette and warning-style presence. |
| `.objective-view-btn` tab buttons | Tab button baseline. |
| `.inspector-section-lbl` | Section headings inside each tab. |
| `.game-message-choice kbd` | Keyboard chips. |
| `.projects-scroll-container` scrollbar/mask patterns | Scrollable help content. |

Recommended new CSS selectors:

```css
.help-menu {
  position: fixed;
  inset: 0;
  z-index: 9700;
  display: grid;
  place-items: center;
  padding: clamp(14px, 3vw, 34px);
  background: rgba(3, 6, 15, 0.72);
  pointer-events: auto;
}

.help-menu[hidden] { display: none !important; }

.help-menu-shell {
  width: min(1080px, 96vw);
  max-height: min(820px, 88vh);
  display: flex;
  flex-direction: column;
  background: rgba(5, 9, 18, 0.96);
  border: 1px solid rgba(0, 240, 255, 0.34);
  border-top: 4px solid rgba(255, 204, 0, 0.72);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.76), 0 0 44px rgba(0, 240, 255, 0.18);
  clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%, 0 18px);
}

.help-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 14px;
  border-top: 1px solid rgba(0, 240, 255, 0.14);
  border-bottom: 1px solid rgba(0, 240, 255, 0.14);
}

.help-tab {
  position: relative;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(240, 243, 248, 0.72);
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  cursor: pointer;
}

.help-tab.active {
  color: rgba(3, 6, 15, 0.94);
  background: rgba(0, 240, 255, 0.84);
  border-color: rgba(0, 240, 255, 0.95);
}

.help-tab.active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -7px;
  height: 3px;
  background: var(--cyber-yellow);
  box-shadow: 0 0 12px rgba(255, 204, 0, 0.7);
}

.help-menu-body {
  overflow-y: auto;
  padding: clamp(14px, 2vw, 22px);
  scrollbar-color: rgba(0, 240, 255, 0.45) rgba(255, 255, 255, 0.04);
}

.help-panel[hidden] { display: none !important; }

.help-control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.help-control-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 240, 255, 0.12);
  background: rgba(255, 255, 255, 0.035);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

@media (max-width: 760px) {
  .help-tabs { grid-template-columns: 1fr 1fr; }
  .help-menu-shell { max-height: 92vh; }
}
```

## Tab Indicator Wireframe

```text
+------------------------------------------------------------------+
| OPERATOR REFERENCE                                      [ESC]    |
+------------------------------------------------------------------+
| [ CONTROLS ]  [ HOW TO PLAY ]  [ UNIVERSE ]  [ TIPS & TRICKS ]   |
|      === active amber underline                                  |
+------------------------------------------------------------------+
|                                                                  |
|  Active tab content scrolls here                                 |
|                                                                  |
+------------------------------------------------------------------+
| H/F1 CLOSE HELP        ESC BACK        P PAUSE                    |
+------------------------------------------------------------------+
```

## Pause Integration

Add `flightState.paused` as a boolean owned by flight state. The main loop should check it inside `tick()` before simulation updates, not by stopping `requestAnimationFrame`.

Recommended behavior in `tick()`:

1. Continue rendering, camera interpolation, labels, cursor, and HUD visibility so the paused screen remains responsive.
2. When `isFlightActive && flightState.paused`, skip `updateFlight(time)`, `updateRouteAutopilot(...)`, `updateSystemDocking()`, `pollOrchestrator()`, combat updates indirectly triggered by physics, price drift, autosave-on-combat cadence, and engine hum velocity changes.
3. Still allow `updateFlightHud(false)` to render `PAUSED` status and still allow help tab input/clicks.
4. Opening help should set `flightState.paused = true` only in active flight. Closing help should restore the previous pause state, not blindly unpause if the user opened help from an already paused menu.

State shape recommendation:

```js
flightState.paused = false;
flightState.pauseReasons = new Set(); // optional if multiple overlays can pause
```

Minimal integration if avoiding a set:

```js
const wasPausedBeforeHelp = flightState.paused;
flightState.paused = true;
// on close
flightState.paused = wasPausedBeforeHelp;
```

Better integration for multiple overlays:

```js
function setPauseReason(reason, active) {
  if (!flightState.pauseReasons) flightState.pauseReasons = new Set();
  if (active) flightState.pauseReasons.add(reason);
  else flightState.pauseReasons.delete(reason);
  flightState.paused = flightState.pauseReasons.size > 0;
}
```

Input priority recommendation:

1. `Escape` closes topmost overlay: combat debrief if applicable, help, loadout, inventory, system map, game message, pause menu.
2. `H`/`F1` toggles help and pauses active flight.
3. `P` toggles pause/menu only after pause/menu exists; autopilot now uses `Y`.
4. Flight controls are ignored while `flightState.paused` is true.

## Content Outline

### CONTROLS

Base this tab on `controls-audit.md` canonical control set, with current conflicts called out until Phase 6 remaps land.

Flight:

| Input | Action |
|---|---|
| Mouse move | Look/aim ship while pointer locked. |
| `W` / `ArrowUp` | Forward thrust. |
| `S` / `ArrowDown` | Reverse thrust/brake. |
| `A` / `ArrowLeft` | Strafe left. |
| `D` / `ArrowRight` | Strafe right. |
| `Q` | Roll left. |
| `E` | Roll right. |
| `Shift` | Afterburner when unlocked. |
| `G` | Match speed / emergency brake. |
| `F` | Cold jump when unlocked. Do not advertise as help. |
| `R` | Current throttle hold replacement for old `T`. |
| `Z` / `X` | Throttle level up/down while throttle mode is enabled. Current code: `Z` increases, `X` decreases. |

Combat:

| Input | Action |
|---|---|
| Left mouse | Primary fire. |
| Right mouse | Secondary fire. |
| `C` | Evasion roll. |
| `T` | Reserved Phase 6 target cycle; runtime is currently a safe no-op. |

Navigation:

| Input | Action |
|---|---|
| `V` | Set navigation target from crosshair. |
| `Y` | Current autopilot replacement for old `P`. |
| `M` | System map. |
| `L` | Surface approach / land. |
| Wheel in console | Zoom orbit camera. |
| Double-click scene in console | Reset console camera. |

UI:

| Input | Action |
|---|---|
| `H` / `F1` | Help overlay. Confirmed unbound. |
| `P` | Pause/menu reserved after moving autopilot. |
| `I` | Inventory/manifest. |
| `B` | Mission board when no modal/message is active. |
| `O` | Objectives. |
| `U` | Upgrades/skills while landed. |
| `Escape` | Close topmost overlay/back; exit flight only from clear state. |
| `Space` | Dismiss message / activate focused UI. |
| `1`-`6` | Modal/menu choices. |
| Click button/card | Activate UI action. |

Conflict callouts to include at bottom of CONTROLS:

| Conflict | Help Copy |
|---|---|
| `P` previously autopilot | Resolved: autopilot moved to `Y`; `P` is reserved for pause. |
| `T` previously throttle/station access | Resolved: throttle moved to `R`; `T` is reserved for target cycle. |
| `B` previously modal Back | Resolved: `Escape`/Backspace are modal Back; `B` is mission board outside active modals/messages. |
| `Escape` partial close | Phase 6 should make Escape a topmost-overlay dispatcher. |

### HOW TO PLAY

Suggested sections:

| Section | Content |
|---|---|
| Launch | Type the hidden launch code from non-flight mode to enter dogfight mode. Pick tutorial or free roam from deployment choice. |
| Fly | Use mouse look, thrust/strafe, roll, afterburner, throttle hold, and match speed to control ship movement. |
| Fight | Left mouse fires primary, right mouse fires secondary, watch shields/armor/energy/heat/ammo/missiles, use `C` to evade. |
| Navigate | Aim at a project and press `V` to set a nav target. Use `M` for the system map. Use autopilot once routed. |
| Land/Dock | Approach a project or station and press `L`; docking opens services, trade, equipment, missions, and upgrades. |
| Progress | Complete tutorial, contracts, distress calls, bounty waves, and trade runs. Earn credits, XP, skill points, and reputation. |
| Survive | Watch fuel, hull, shields, heat, and hostile contacts. Use stations to restock and refuel. |

### UNIVERSE

Suggested sections:

| Section | Content |
|---|---|
| What This Is | The Ussyverse maps real projects as an explorable 3D constellation and dogfight/trade layer. |
| Project Nodes | Each node represents a project with source/runtime links, technical specs, implementation notes, and relationship edges. |
| Factions | Station/faction identity follows project categories via reputation normalization. |
| Stations | Project nodes and system stations are service hubs for restock, equipment, cargo, contracts, and upgrades. |
| Director | Free roam can inject comms, bounties, distress calls, contraband events, anomalies, and silence events. |
| Economy | Cargo markets, refuel, equipment, credits, fuel, and reputation shape route decisions. |

### TIPS & TRICKS

Suggested tips:

| Tip | Copy |
|---|---|
| Pointer lock | If mouse look is released, click the viewport to recapture. |
| Autopilot safety | Manual flight input disables basic autopilot; route autopilot should be abortable from nav UI. |
| Heat discipline | Stop firing when overheated; watch heat bars before entering a bounty wave. |
| Match speed | Use `G` to match a target or brake in emergencies. |
| Dock often | Docking restocks ammo, missiles, shields, armor, energy, and fuel depending on services/state. |
| Use objectives panel | Toggle `O` or use the objectives tabs to find current and available objectives. |
| Mission board | `B` is reserved; use it only outside active modal text. Station service choices remain available. |
| Map awareness | Use `M` to understand station/planet routes and route autopilot context. |
| Skill unlocks | Engine skills unlock afterburner/cold jump behaviors; combat skills change survivability and weapon uptime. |
| Mobile/coarse pointers | Current controls are keyboard/mouse oriented; no gamepad bindings were found. |

## Concise Summary

Implement help as a fixed DOM dialog at `z-index: 9700`, using existing HUD/message styling and a four-tab layout: `CONTROLS`, `HOW TO PLAY`, `UNIVERSE`, `TIPS & TRICKS`. Bind `H` and `F1` because both are unbound; avoid `F` because it is cold jump. Base controls copy on `controls-audit.md`, explicitly noting Phase 6 remaps for `P`, `T`, `B`, and `Escape`. Integrate pause with `flightState.paused` checked by `tick()` so simulation stops while rendering and help UI remain responsive.

# Help Menu Audit

Phase 1 investigation only. Files read in full: `js/flight/help.js`, `js/input.js`, `index.html`.

## Final 30 Lines Truncation Verdict

- `js/flight/help.js`: not truncated. Read reached line 253, reported as end of file.
- Final 30 lines are lines 224-253, ending inside and completing `configureHelpMenu()`.
- Missing code if truncated: none.
- Last complete export: `export function configureHelpMenu(options = {})` at lines 242-253.
- Other complete exports in `help.js`: `HELP_TABS`, `HELP_CONTROLS`, `HELP_TIPS`, `renderHelpContent`, `switchHelpTab`, `isHelpMenuOpen`, `openHelpMenu`, `closeHelpMenu`, `toggleHelpMenu`, `configureHelpMenu`.

## input.js Authoritative Key Registry / Key Switch

`js/input.js` is the authoritative runtime registry for keys because it owns `keydown`, `keyup`, pointer, wheel, and double-click listeners. Bound keys and action labels visible in this file:

| Input | Runtime action in `input.js` |
| --- | --- |
| Typed `ussy` while not in flight | Unlock audio if available and enter flight mode. |
| `H` / `F1` | Toggle help menu through injected `toggleHelpMenu`. |
| `Escape` when help menu is open | Toggle/close help menu through injected `toggleHelpMenu`. |
| `Escape` / `Backspace` while loadout panel open | Close `#loadout-panel`. |
| `Escape` / `Backspace` while inventory panel open | Close `#inventory-panel`. |
| `Escape` / `Backspace` while system map open | Close `#system-map-overlay`. |
| Message choice keys | Delegated to `handleGameMessageChoice(event)`. Exact key list is outside `input.js`. |
| `Escape` / `Backspace` while game message active | Dismiss game message. |
| `Escape` during surface escape state | Delegated to `handleSurfaceEscape()`. |
| `Space` | Dismiss game message. |
| `Backspace` after earlier close handling | Prevent browser navigation; no additional action. |
| `V` | Set navigation from crosshair. |
| `Y` | Toggle autopilot. |
| `Shift+C` | Toggle flight view. |
| `O` | Toggle objectives view. |
| `L` | Land on nearest project / surface action via `landOnNearestProject()`. |
| `B` | Open mission board if available; otherwise show faction mission when landed and no active message. |
| `T` | Reserved/no-op; prevents default and returns. |
| `I` | Toggle inventory panel. |
| `U` | Open skill tree only when landed and no active game message. |
| `M` | Adds `KeyM` to `flightState.keys`; downstream map handling is outside this file. |
| `Shift+M` | Toggle flight TTS. |
| `Escape` while pointer is not locked | Exit flight mode. |
| `W` / `A` / `S` / `D` | Manual flight keys; disable autopilot and add to `flightState.keys`. |
| Arrow keys | Manual flight keys; disable autopilot and add to `flightState.keys`. |
| `Q` / `E` | Manual flight keys; disable autopilot and add to `flightState.keys`. |
| Left/Right `Shift` | Manual flight key; disable autopilot and add to `flightState.keys`. |
| Any other flight key not returned earlier | Added to `flightState.keys` for downstream systems. This is how `G`, `F`, `R`, `Z`, `X`, and unhandled flight controls can still be consumed outside `input.js`. |
| Key up for any flight key | Removes `event.code` from `flightState.keys`. |
| Left mouse in flight | Add button `0` to `flightState.mouseButtons`; play laser SFX if available. |
| Right mouse in flight | Add button `2` to `flightState.mouseButtons`; play missile SFX if available. |
| Click flight viewport while pointer unlocked | Request pointer lock. |
| Mouse move while pointer locked | Apply local flight rotation; large movement disables autopilot. |
| Console pointer drag | Orbit camera through orbit UI helpers. |
| Console wheel | Orbit zoom through orbit UI helpers. |
| Console scene click | Select project under pointer. |
| Console scene double-click | Reset camera view. |

## HELP_CONTROLS Comparison

| Help entry | Runtime status from `input.js` | Discrepancy |
| --- | --- | --- |
| Mouse move: look/aim ship while pointer locked | Present in `onMouseMove`. | None. |
| W / ArrowUp: forward thrust | Present as manual keys stored in `flightState.keys`; actual thrust handling is downstream. | None from `input.js`; downstream implementation not audited here. |
| S / ArrowDown: reverse thrust/brake | Present as manual keys stored in `flightState.keys`. | None from `input.js`; downstream implementation not audited here. |
| A / ArrowLeft: strafe left | Present as manual keys stored in `flightState.keys`. | None from `input.js`; downstream implementation not audited here. |
| D / ArrowRight: strafe right | Present as manual keys stored in `flightState.keys`. | None from `input.js`; downstream implementation not audited here. |
| Q: roll left | Present as manual key stored in `flightState.keys`. | None from `input.js`; downstream implementation not audited here. |
| E: roll right | Present as manual key stored in `flightState.keys`. | None from `input.js`; downstream implementation not audited here. |
| Shift: afterburner when unlocked | Present as manual key stored in `flightState.keys`. | None from `input.js`; downstream unlock/use not audited here. |
| G: match speed / emergency brake | Not explicitly switched; falls through to `flightState.keys`. | Help claims action, but `input.js` has no action label or explicit binding. |
| F: cold jump when unlocked | Not explicitly switched; falls through to `flightState.keys`. | Help claims action, but `input.js` has no action label or explicit binding. |
| R: toggle throttle hold | Not explicitly switched; falls through to `flightState.keys`. | Help claims action, but `input.js` has no action label or explicit binding. |
| Z / X: throttle level up/down | Not explicitly switched; falls through to `flightState.keys`. | Help claims action, but `input.js` has no action label or explicit binding. |
| Left mouse: primary fire | Present in `onPointerDown`; button `0`. | None. |
| Right mouse: secondary fire | Present in `onPointerDown`; button `2`. | None. |
| C: evasion roll | `input.js` only handles `Shift+C` for flight view; plain `C` falls through to `flightState.keys`. | Help omits `Shift+C` flight view and claims plain `C` evasion without explicit switch. |
| T: cycle target reserved/no-op | Present as explicit no-op. | None. |
| V: set navigation target | Present. | None. |
| Y: toggle autopilot | Present. | None. |
| M: system map | `KeyM` is added to `flightState.keys`; `Shift+M` toggles TTS. | Help omits `Shift+M` TTS; system-map action is not explicit in `input.js`. |
| L: surface approach / land | Present through `landOnNearestProject()`. | None. |
| Wheel in console: zoom orbit camera | Present through `onSceneWheel`. | None. |
| Double-click scene in console: reset console camera | Present through `canvasContainer` `dblclick`. | None. |
| H / F1: help overlay | Present. | None. |
| P: pause/menu reserved | Not handled explicitly; falls through in flight. | Help says reserved, but `input.js` does not reserve/prevent it specially. |
| I: inventory/manifest | Present. | None. |
| B: mission board | Present. | None. |
| O: objectives | Present. | None. |
| U: upgrades/skills while landed | Present with landed/message guards. | None. |
| Escape / Backspace: close topmost overlay/back; exit flight only from clear state | Partially present. Escape closes help; Escape/Backspace close loadout, inventory, map, messages; Escape handles surface escape and flight exit. | Backspace does not close help. Help close case is outside the general back/close block. |
| Space: dismiss message / activate focused UI | Present only as dismiss game message. | Focused UI activation is browser/default behavior, not implemented as a key switch in `input.js`. |
| 1-6: modal/menu choices | Delegated to `handleGameMessageChoice(event)`. | Exact `1-6` registry is not in `input.js`. |
| Click button/card: activate UI action | Browser/default and individual listeners. | Not a centralized binding in `input.js`. |

## Source-of-Truth Gap

- `help.js` exports `HELP_CONTROLS`, but does not export `BINDINGS` or `KEY_MAP`.
- `input.js` does not import `help.js` and does not consume `HELP_CONTROLS`.
- There is no shared binding source of truth between rendered help copy and runtime input handling.
- Current result: help text can drift from runtime behavior, especially for downstream `flightState.keys` consumers and reserved keys.

## index.html #help-menu Panel / Tab Audit

- `#help-menu` exists at lines 487-514 with `hidden`, `role="dialog"`, `aria-modal="true"`, `aria-hidden="true"`, and `aria-labelledby="help-menu-title"`.
- Shell exists as `.help-menu-shell.hud-interactive`.
- Close button exists as `#help-menu-close`, label `[ESC]`, and `aria-label="Close help menu"`.
- Tablist exists as `.help-tabs` with `role="tablist"` and `aria-label="Help sections"`.
- Tabs match `HELP_TABS`: `#help-tab-controls`, `#help-tab-how`, `#help-tab-universe`, `#help-tab-tips`.
- Panels match tabs: `#help-panel-controls`, `#help-panel-how`, `#help-panel-universe`, `#help-panel-tips`.
- Initial selected state matches `activeTab = 'controls'`: controls tab has `active` and `aria-selected="true"`; controls panel has `active` and is not hidden; other panels are hidden.
- Panels are empty in HTML and populated by `renderHelpContent()` from `help.js`.
- Footer says `H/F1 CLOSE HELP`, `ESC BACK`, and `P PAUSE RESERVED`.
- Footer does not mention Backspace, even though `HELP_CONTROLS` lists `Escape / Backspace` as back/close.

## Escape Handler Location And Ownership

- Current help Escape handler is in `js/input.js` `onGlobalKeyDown`, lines 251-255: if `Escape` and help is open, prevent default and toggle help.
- General back/close handling is also in `onGlobalKeyDown`, lines 265-285 for loadout, inventory, and map.
- Message back handling is lines 291-295.
- Surface Escape handling is lines 296-299.
- Clear-state flight exit is lines 366-370.
- `help.js` owns open/close/toggle behavior and the close button click listener, but it does not own global keyboard handling.
- Recommended ownership: keep global key routing in `input.js`, but consolidate Help into the same topmost overlay/back-close path as other overlays. `help.js` should remain the UI module that exposes `isHelpMenuOpen`, `openHelpMenu`, `closeHelpMenu`, and `toggleHelpMenu`.
- Specific gap: Backspace should either close Help if Help is topmost, or the help copy should stop claiming Backspace closes the topmost overlay.

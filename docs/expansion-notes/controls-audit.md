# Controls Audit

Phase 1 research source of truth for Phase 6 control/help-menu work.

Scope read in full: `index.html`; all current source files under `js/`; all files under `js/flight/`; all files under `js/engine/`. Search scope covered the requested key, pointer, click, wheel, scroll, and gamepad patterns. No application code changes were made.

## Full Controls Table

| Key/Input | Action | File | Line | Category |
|---|---|---|---|---|
| `u`, `s`, `s`, `y` typed while not in flight | Hidden launch code enters flight mode | `js/input.js` | 206 | DEBUG |
| `Escape` | Close inventory panel if open | `js/input.js` | 220 | UI |
| Message choice key or code | Activates current game-message choice | `js/input.js` | 229 | UI |
| `Space` | Dismiss game message | `js/input.js` | 233 | UI |
| `KeyV` | Set navigation target from crosshair | `js/input.js` | 240 | NAVIGATION |
| `KeyP` | Toggle autopilot | `js/input.js` | 245 | NAVIGATION |
| `Shift+KeyC` | Toggle cockpit/third-person flight view | `js/input.js` | 250 | FLIGHT |
| `KeyO` | Toggle objectives view | `js/input.js` | 255 | UI |
| `KeyL` | Land on nearest project node | `js/input.js` | 260 | NAVIGATION |
| `KeyT` while landed at station and no message | Open station menu | `js/input.js` | 265 | UI |
| `KeyI` | Toggle inventory panel | `js/input.js` | 270 | UI |
| `KeyU` while landed and no message | Open skill tree | `js/input.js` | 275 | UI |
| `KeyM` | Set key state for system map toggle | `js/input.js` | 280 | NAVIGATION |
| `Shift+KeyM` | Toggle flight TTS | `js/input.js` | 283 | UI |
| `Escape` when flight active and pointer is unlocked | Exit flight mode | `js/input.js` | 288 | UI |
| `KeyW` | Manual forward thrust, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `KeyA` | Manual left strafe, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `KeyS` | Manual reverse thrust, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `KeyD` | Manual right strafe, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `ArrowUp` | Manual forward thrust, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `ArrowDown` | Manual reverse thrust, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `ArrowLeft` | Manual left strafe, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `ArrowRight` | Manual right strafe, disables autopilot | `js/input.js` | 17, 293 | FLIGHT |
| `KeyQ` | Manual roll left, disables autopilot | `js/input.js`, `js/flight/physics.js` | 17, 112 | FLIGHT |
| `KeyE` | Manual roll right, disables autopilot | `js/input.js`, `js/flight/physics.js` | 17, 113 | FLIGHT |
| `ShiftLeft` | Afterburner when engine skill unlocked, disables autopilot | `js/input.js`, `js/flight/physics.js` | 17, 116 | FLIGHT |
| `ShiftRight` | Afterburner when engine skill unlocked, disables autopilot | `js/input.js`, `js/flight/physics.js` | 17, 116 | FLIGHT |
| Any keyup code | Remove released key from flight key state | `js/input.js` | 297 | FLIGHT |
| Left pointer button | Track primary fire button, play laser SFX, request pointer lock if needed | `js/input.js` | 303 | COMBAT |
| Right pointer button | Track secondary fire button, play missile SFX, request pointer lock if needed | `js/input.js` | 303 | COMBAT |
| Pointer down outside HUD in console | Begin orbit drag | `js/input.js`, `js/ui/orbit.js` | 318, 33 | NAVIGATION |
| Pointer move while orbit dragging | Rotate console camera orbit | `js/input.js`, `js/ui/orbit.js` | 324, 45 | NAVIGATION |
| Pointer up/cancel in flight | Clear tracked mouse button | `js/input.js` | 328 | COMBAT |
| Pointer up/cancel in console | End orbit drag | `js/input.js`, `js/ui/orbit.js` | 328, 58 | NAVIGATION |
| Context menu in flight | Prevent right-click browser menu | `js/input.js` | 337 | UI |
| Wheel in console viewport | Zoom orbit camera | `js/input.js`, `js/ui/orbit.js` | 343, 70 | NAVIGATION |
| Mouse move while pointer locked | Mouselook pitch/yaw, disables autopilot on movement | `js/input.js` | 347 | FLIGHT |
| Mouse move outside flight | Move custom cursor and update raycast pointer | `js/input.js` | 355 | UI |
| Touch start | Update pointer from touch position | `js/input.js` | 359 | UI |
| Scene click in flight | Request pointer lock if needed | `js/input.js` | 365 | FLIGHT |
| Scene click in console on node | Select/inspect project node | `js/input.js` | 365 | UI |
| Canvas double-click | Reset console camera view | `js/input.js` | 415 | NAVIGATION |
| `KeyF` | Cold jump if engine skill `eng_5` unlocked | `js/flight/physics.js` | 127 | FLIGHT |
| `KeyG` | Match target velocity or emergency brake | `js/flight/physics.js` | 137 | FLIGHT |
| `KeyC` | Evasion roll | `js/flight/physics.js` | 165 | COMBAT |
| `KeyT` | Toggle throttle mode | `js/flight/physics.js` | 184 | FLIGHT |
| `KeyZ` | Increase throttle level while throttle mode is enabled | `js/flight/physics.js` | 196 | FLIGHT |
| `KeyX` | Decrease throttle level while throttle mode is enabled | `js/flight/physics.js` | 197 | FLIGHT |
| Left pointer held | Fire primary weapon | `js/flight/physics.js` | 246 | COMBAT |
| Right pointer held | Fire secondary weapon | `js/flight/physics.js` | 247 | COMBAT |
| `KeyM` key state | Toggle system map once per press | `js/flight/state.js` | 1720 | NAVIGATION |
| Navigation engage button click | Plot route autopilot | `js/flight/state.js` | 1712 | NAVIGATION |
| Navigation abort button click | Disengage route autopilot | `js/flight/state.js` | 1713 | NAVIGATION |
| System map close button click | Hide system map overlay | `js/flight/state.js` | 1717 | UI |
| Capture-phase `KeyT` | Force throttle key into flight key state despite normal handler returning | `js/flight/state.js` | 1753 | FLIGHT |
| Capture-phase `KeyC` | Force evasion key into flight key state despite `Shift+C` view binding | `js/flight/state.js` | 1753 | COMBAT |
| Objectives panel click on view tab | Switch objectives panel view | `js/flight/state.js` | 610, 1854 | UI |
| Objectives panel click on start objective | Start selected mission contract | `js/flight/state.js` | 1854 | UI |
| `Digit1` in deployment choice | Start tutorial | `js/flight/state.js` | 1877 | UI |
| `Digit2` in deployment choice | Start free roam with director | `js/flight/state.js` | 1878 | UI |
| `Digit1` in mission detail | Accept mission when available | `js/flight/state.js` | 2158 | UI |
| `Digit2` in mission detail | Return to mission board | `js/flight/state.js` | 2156 | UI |
| `Digit1` in faction mission | Accept generated mission when available | `js/flight/state.js` | 2178 | UI |
| `Digit2` in faction mission | Return to station menu/trade menu | `js/flight/state.js` | 2175 | UI |
| Number keys in mission board | Accept mission row | `js/flight/state.js` | 2196 | UI |
| `KeyB` in mission board | Back to station menu | `js/flight/state.js` | 2209 | UI |
| `Digit1` in station services | Restock | `js/flight/state.js` | 2559 | UI |
| `Digit2` in station services | Equipment | `js/flight/state.js` | 2560 | UI |
| `Digit3` in station services | Cargo market | `js/flight/state.js` | 2561 | UI |
| `Digit4` in station services | Mission board | `js/flight/state.js` | 2562 | UI |
| `Space` in station services | Dismiss | `js/flight/state.js` | 2563 | UI |
| Number keys in equipment market | Buy/equip selected weapon | `js/flight/state.js` | 2580 | UI |
| `KeyB` in equipment market | Back to station menu | `js/flight/state.js` | 2589 | UI |
| `Digit1` in purchase denied | Return to equipment | `js/flight/state.js` | 2612 | UI |
| `Digit1` in system updated | Return to equipment | `js/flight/state.js` | 2627 | UI |
| `Digit2` in system updated | Return to station menu | `js/flight/state.js` | 2628 | UI |
| `Digit1` in ship upgrades | Hull branch | `js/flight/state.js` | 2640 | UI |
| `Digit2` in ship upgrades | Shields branch | `js/flight/state.js` | 2641 | UI |
| `Digit3` in ship upgrades | Weapons branch | `js/flight/state.js` | 2642 | UI |
| `Digit4` in ship upgrades | Engines branch | `js/flight/state.js` | 2643 | UI |
| `Space` in ship upgrades | Close | `js/flight/state.js` | 2644 | UI |
| Number keys in skill branch | Confirm selected unlock path | `js/flight/state.js` | 2656 | UI |
| `KeyB` in skill branch | Back to skill tree | `js/flight/state.js` | 2662 | UI |
| `Digit1` in unlock confirm | Confirm skill unlock | `js/flight/state.js` | 2680 | UI |
| `Digit2` in unlock confirm | Cancel skill unlock | `js/flight/state.js` | 2681 | UI |
| `Space` in orchestrator acknowledgement | Acknowledge/dismiss event | `js/flight/state.js` | 2798 | UI |
| `Digit1` in distress event | Respond and set nav route | `js/flight/state.js` | 2830 | NAVIGATION |
| `Digit2` in distress event | Ignore distress signal | `js/flight/state.js` | 2850 | UI |
| `Digit1` in contraband event | Jettison cargo | `js/flight/state.js` | 2863 | UI |
| `Digit2` in contraband event | Refuse and spawn enforcers | `js/flight/state.js` | 2875 | COMBAT |
| `Space` in anomaly/silence/default event | Acknowledge/dismiss event | `js/flight/state.js` | 2893, 2905 | UI |
| Dynamic digit choice in orchestrator event | Resolve orchestrator choice | `js/flight/state.js` | 2897 | UI |
| `Digit1` in audio settings | Radio volume menu | `js/flight/state.js` | 2995 | UI |
| `Digit2` in audio settings | Chatter volume menu | `js/flight/state.js` | 2996 | UI |
| `Digit3` in audio settings | SFX volume menu | `js/flight/state.js` | 2997 | UI |
| `Digit4` in audio settings | Toggle TTS | `js/flight/state.js` | 2998 | UI |
| `Digit5` in audio settings | Restore quiet defaults | `js/flight/state.js` | 2999 | UI |
| `Space` in audio settings | Dismiss | `js/flight/state.js` | 3000 | UI |
| Number keys in volume menu | Apply selected volume preset | `js/flight/state.js` | 3020 | UI |
| `KeyB` in volume menu | Back to audio settings | `js/flight/state.js` | 3026 | UI |
| Game message choice button click | Activate rendered choice | `js/flight/messages.js` | 101 | UI |
| Game message footer choice click | Activate footer choice | `js/flight/messages.js` | 117 | UI |
| `event.key` or `event.code` matching active choices | Activate game-message choice | `js/flight/messages.js` | 168 | UI |
| Loadout weapon option click | Buy/equip loadout option | `js/flight/loadout.js` | 80 | UI |
| Loadout buy armor click | Buy armor service | `js/flight/loadout.js` | 173 | UI |
| Loadout buy shield click | Buy shield service | `js/flight/loadout.js` | 179 | UI |
| Loadout close click | Close loadout and return to station menu | `js/flight/loadout.js` | 184 | UI |
| `KeyU` in trade dock footer | Undock | `js/economy/trader.js` | 208 | UI |
| `Digit1` in trade menu | Trade hub | `js/economy/trader.js` | 212 | UI |
| `Digit2` in trade menu | Refuel | `js/economy/trader.js` | 213 | UI |
| `Digit3` in trade menu | Cargo hold | `js/economy/trader.js` | 214 | UI |
| `Digit4` in trade menu | Shipyard | `js/economy/trader.js` | 215 | UI |
| `Digit5` in trade menu | Visual loadout | `js/economy/trader.js` | 216 | UI |
| `Digit6` in trade menu | Missions | `js/economy/trader.js` | 217 | UI |
| Number keys in trade hub/market/black market | Select market page/action/back row | `js/economy/trader.js` | 247, 296, 323 | UI |
| Number keys in weapon shop/shipyard/skill tree | Select shop, buy, equip, unlock, or back | `js/economy/trader.js` | 368, 381, 399, 430, 433, 487 | UI |
| `KeyB` in weapon detail | Back to weapon shop | `js/economy/trader.js` | 436 | UI |
| Number keys in trade/refuel/cargo dialogs | Confirm/refuse/select quantity/back | `js/economy/trader.js` | 530, 540, 655, 696 | UI |
| Hero container scroll | Update hero section nav and camera/light state | `js/ui/hero.js` | 67 | UI |
| Hero container wheel on final card | Enter console mode | `js/ui/hero.js` | 68 | UI |
| Hero touch start/end swipe | Enter console mode from final card | `js/ui/hero.js` | 69 | UI |
| Hero nav dot click | Scroll hero to section | `js/ui/hero.js` | 79 | UI |
| `Enter` on hero nav dot | Activate hero nav dot | `js/ui/hero.js` | 85 | UI |
| Space character on hero nav dot | Activate hero nav dot | `js/ui/hero.js` | 85 | UI |
| Project item click | Inspect/select project | `js/ui/console.js` | 56 | UI |
| `Enter` on project item | Inspect/select project | `js/ui/console.js` | 60 | UI |
| Space character on project item | Inspect/select project | `js/ui/console.js` | 60 | UI |
| Category card click | Filter project graph by category | `js/ui/console.js` | 89 | UI |
| `Enter` on category card | Activate category card | `js/ui/console.js` | 108 | UI |
| Space character on category card | Activate category card | `js/ui/console.js` | 108 | UI |
| Enter console button click | Activate graph console | `js/ui/console.js` | 116 | UI |
| Back to hero button click | Deactivate graph console | `js/ui/console.js` | 117 | UI |
| HUD header title click | Deactivate graph console | `js/ui/console.js` | 118 | UI |
| Inventory close inline click | Hide inventory panel | `index.html` | 619 | UI |
| Browser scroll/wheel/click/double-click described in copy | User-facing graph instruction text only | `index.html` | 199 | UI |
| `Space` displayed in message footer | User-facing dismiss hint | `index.html` | 407 | UI |
| Cockpit help text: mouselook, W/S, A/D, T, Z/X, G, C, LMB, RMB, V, P, I | User-facing help strip | `index.html` | 552 | UI |

## Requested Pattern Match Notes

Requested keydown/keyup, `event.key`, `event.code`, pointer, click, wheel, scroll, and related patterns matched in the files represented above. No `gamepadconnected` or `gamepadbuttondown` bindings were found. No `Tab` binding was found. No `dblclick` binding was found outside `js/input.js:415`. The literal `case 'Key`, `case 'Arrow`, `case 'Space`, `case 'Escape`, and `case 'Tab` switch patterns were not present; controls use `if` checks and choice objects instead of switch cases.

## Conflict Report

| Severity | Inputs | Conflict | Evidence | Recommendation |
|---|---|---|---|---|
| HARD CONFLICT | `KeyT` | Existing throttle toggle and landed station-menu reopen conflict with requested Phase 6 target cycle `T`. | `js/input.js:265`, `js/flight/physics.js:184`, `js/flight/state.js:1753`; help strip says `T THROTTLE` at `index.html:552`. | Reserve `T` for target cycle in flight. Move throttle mode to `R` or `Alt+W`/`Alt+S`, and keep station services on `B`/interaction menu while landed. |
| HARD CONFLICT | `KeyP` | Existing autopilot toggle conflicts with common expected `P` pause. | `js/input.js:245`; HUD says `P AUTO` at `index.html:552`. | Move autopilot to `Y` or `Shift+P`; reserve `P` for pause/menu overlay. |
| HARD CONFLICT | `KeyB` | Existing message/menu Back key conflicts with requested mission board `B`. | `js/flight/state.js:2209`, `2589`, `2662`, `3026`; `js/economy/trader.js:436`. | Use `B` for mission board only when no modal/message is active; keep modal Back as `Escape` or `Backspace`. |
| CONTEXT CONFLICT | `KeyC` and `Shift+KeyC` | Unmodified `C` is evasion roll; modified `Shift+C` toggles camera view. Capture-phase assist key capture intentionally keeps `C` in flight key state. | `js/input.js:250`, `js/flight/physics.js:165`, `js/flight/state.js:1753`. | Keep only if help clearly distinguishes `C Evade` and `Shift+C View`. |
| CONTEXT CONFLICT | `Space` | Space dismisses game messages and activates focused UI controls in hero/console. | `js/input.js:233`, `js/ui/hero.js:85`, `js/ui/console.js:60`, `js/ui/console.js:108`. | Keep modal priority; document that Space is not a flight action. |
| CONTEXT CONFLICT | `Escape` | Escape closes inventory only, exits flight only when pointer is unlocked, and does not close several overlays/messages. | `js/input.js:220`, `js/input.js:288`, `index.html:619`. | Canonicalize Escape as universal close/back/pause, with flight exit requiring hold or confirmation. |
| CONTEXT CONFLICT | `KeyU` | Opens skill tree while landed; undocks from trade menu footer. | `js/input.js:275`, `js/economy/trader.js:208`. | Keep if modal-scoped, but prefer `U` for upgrades only and assign undock to `Launch` button or `Escape`/`Backspace`. |
| CONTEXT CONFLICT | `KeyM` and `Shift+KeyM` | Unmodified `M` toggles map; modified `Shift+M` toggles TTS. | `js/input.js:280`, `js/input.js:283`, `js/flight/state.js:1720`. | Keep if help names both; no Phase 6 hard conflict unless `M` becomes mission board. |
| CONTEXT CONFLICT | Pointer left/right | In flight, left/right pointer are weapons; in console, left pointer selects/drags. | `js/input.js:303`, `js/input.js:318`, `js/input.js:365`. | Keep mode-scoped. |

## Gap Report

| Gap | Current State | Recommendation |
|---|---|---|
| `P` pause | `P` is autopilot. | Reserve `P` for pause/menu. Move autopilot off `P`. |
| `H` help | No `KeyH` binding. | Add `H` and `F1` help overlay bindings. |
| `F1` help | No `F1` binding. | Add as alternate help key. |
| `Tab` target cycle | No `Tab` binding. | Avoid browser focus conflict unless using pointer lock and `preventDefault`; prefer `T` per requested new feature. |
| `T` target cycle | `T` is throttle/station menu. | Resolve hard conflict by moving throttle/station access. |
| `B` mission board | `B` is modal Back. Mission board currently appears as digit choices in station menus. | Use `B` as mission board when no active modal; use `Escape`/Backspace for Back. |
| `Escape` overlay close | Escape only closes inventory or exits flight when pointer is unlocked. | Make Escape close topmost overlay/message/map/loadout/inventory first. |
| Ambient traffic debug | No explicit debug key found. | Add debug-only chord such as `Shift+F9`; do not occupy single-letter flight keys. |
| Bounty escape | No explicit escape/evade bounty binding beyond general `C` evasion/cold jump skill. | Assign `J` for jump/escape or use objective choice UI; avoid `B` because mission board. |
| Surface approach `L` | `L` currently lands on nearest project. | Keep `L` as surface approach/land if feature is an extension of landing. Rename help to `L Approach/Land`. |
| Help menu canonical source | Help text exists as static HUD strip only. | Generate help menu from canonical set below so HUD strip and overlay cannot drift. |
| Gamepad | No gamepad bindings found. | Leave unassigned unless Phase 6 explicitly adds gamepad support. |

## Canonical Control Set For Help Menu

| Input | Canonical Action | Category | Notes |
|---|---|---|---|
| Mouse move | Look/aim ship while pointer locked | FLIGHT | Current behavior. |
| Left mouse | Primary fire | COMBAT | Current behavior. |
| Right mouse | Secondary fire | COMBAT | Current behavior. |
| `W` / `ArrowUp` | Forward thrust | FLIGHT | Current behavior. |
| `S` / `ArrowDown` | Reverse thrust/brake | FLIGHT | Current behavior. |
| `A` / `ArrowLeft` | Strafe left | FLIGHT | Current behavior. |
| `D` / `ArrowRight` | Strafe right | FLIGHT | Current behavior. |
| `Q` | Roll left | FLIGHT | Current behavior. |
| `E` | Roll right | FLIGHT | Current behavior. |
| `Shift` | Afterburner | FLIGHT | Current behavior when unlocked. |
| `C` | Evasion roll | COMBAT | Current behavior. |
| `G` | Match speed / emergency brake | FLIGHT | Current behavior. |
| `F` | Cold jump | FLIGHT | Current behavior when unlocked; do not use for help because requested help alternate is `F1`. |
| `L` | Surface approach / land | NAVIGATION | Current land binding, renamed for Phase 6. |
| `V` | Set nav target from crosshair | NAVIGATION | Current behavior. |
| `Y` or `Shift+P` | Toggle autopilot | NAVIGATION | Recommended replacement for current `P`. |
| `M` | System map | NAVIGATION | Current behavior. |
| `T` | Cycle target | COMBAT | Requested Phase 6 binding; requires moving throttle. |
| `R` | Toggle throttle hold | FLIGHT | Recommended replacement for current `T`. |
| `Z` / `X` | Throttle level up/down | FLIGHT | Current behavior after throttle mode. Consider `Z` decrease, `X` increase if using left-to-right semantics; current code has `Z` increase and `X` decrease. |
| `I` | Inventory/manifest | UI | Current behavior. |
| `B` | Mission board | UI | Requested Phase 6 binding; modal Back must move away from `B`. |
| `O` | Objectives | UI | Current behavior. |
| `U` | Upgrades/skills | UI | Current behavior while landed. |
| `H` / `F1` | Help overlay | UI | Requested Phase 6 binding. |
| `P` | Pause/menu | UI | Expected common key; requires moving autopilot. |
| `Escape` | Close topmost overlay/back; exit flight only from clear state | UI | Required cleanup for overlays. |
| `Space` | Dismiss message / activate focused UI | UI | Current behavior. |
| `1`-`6` | Modal/menu choices | UI | Current behavior. |
| Click UI button/card | Activate UI action | UI | Current behavior. |
| Wheel | Hero scroll or console zoom | NAVIGATION | Current behavior. |
| Double-click scene | Reset console camera | NAVIGATION | Current behavior. |

## New Feature Keys To Reserve

| Feature | Needed Key | Status | Recommendation |
|---|---|---|---|
| Surface approach | `L` | Existing land binding | Keep and rename as approach/land. |
| Mission board | `B` | Conflicts with modal Back | Reserve `B`; move Back to `Escape`/Backspace. |
| Ambient traffic debug | Suggested `Shift+F9` | Unused | Use debug chord only; avoid single-letter bindings. |
| Bounty escape | Suggested `J` | Unused | Add as jump/escape objective action if feature needs active input. |
| Help | `H` / `F1` | Unused | Add both. |
| Target cycle | `T` | Hard conflict | Reserve `T`; move throttle. |
| Escape overlay close | `Escape` | Partial | Make universal topmost overlay close. |

## Hard Conflict Resolution Recommendations

1. Move autopilot from `P` to `Y` or `Shift+P`, then reserve `P` for pause/menu.
2. Move throttle toggle from `T` to `R`, then reserve `T` for target cycle.
3. Move modal Back from `B` to `Escape`/Backspace, then reserve `B` for mission board.
4. Implement Escape as a topmost-overlay dispatcher in this order: loadout, inventory, system map, game message, help, pause, pointer unlock/flight exit.
5. Update `index.html:552` help strip and any Phase 6 help overlay from the canonical set above, not ad hoc text.

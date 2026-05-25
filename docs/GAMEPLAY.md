# Gameplay

## Flight Loop

Type `ussy` to enter flight mode. The ship uses mouse look plus keyboard thrust and strafing. Dock at project nodes to refuel, trade, manage inventory, and accept contracts.

## Controls Reference

### Flight & Movement

| Key | Action |
| --- | --- |
| Mouse Move | Look / aim ship (pointer locked) |
| `W` / Arrow Up | Forward thrust |
| `S` / Arrow Down | Reverse thrust / brake |
| `A` / Arrow Left | Strafe left |
| `D` / Arrow Right | Strafe right |
| `Q` | Roll left |
| `E` | Roll right |
| `Shift` | Afterburner (when unlocked) |
| `G` | Match speed / emergency brake |
| `F` | Cold jump (when unlocked) |
| `R` | Toggle throttle hold |
| `Z` / `X` | Throttle level up / down (throttle hold active) |
| `Shift+C` | Toggle cockpit / third-person view |

### Combat

| Key | Action |
| --- | --- |
| Left Mouse Button | Primary fire |
| Right Mouse Button | Secondary fire / missile |
| `C` | Evasion roll |

### Navigation

| Key | Action |
| --- | --- |
| `V` | Set nav target from crosshair |
| `Y` | Toggle autopilot |
| `J` | Activate jump gate in range |
| `H` | Hyperspace jump when unlocked |
| `M` | System map; click nodes to plot routes |
| `L` | Surface approach / land |

### HUD & Menus

| Key | Action |
| --- | --- |
| `F1` | Help overlay in flight |
| `O` | Objectives panel |
| `I` | Inventory / manifest |
| `B` | Mission board (when docked or no modal active) |
| `U` | Upgrades / skills (when landed) |
| `Tab` | Settings menu |
| `Escape` | Close topmost overlay / exit flight (pointer unlocked) |
| `Space` | Dismiss message / activate focused UI |
| `1`-`6` | Modal / menu choices |

### System

| Key | Action |
| --- | --- |
| `ussy` typed | Enter flight mode from console |
| `Shift+M` | Toggle flight TTS |

## Settings

Press `Tab` in console or flight mode to open the six-tab settings menu: Audio, Graphics, Gameplay, TTS, Controls, and Accessibility. Settings persist in the URL hash `:cfg:` slot and are restored before flight resources are applied. The menu controls SFX/radio/chatter/TTS volume, backend TTS, browser-local TTS rate/pitch, bloom strength/threshold/radius, pixel ratio, particle density, flight assist default, mouse invert, mouse sensitivity, crosshair style, reduced motion, and HUD scale. Backend TTS voices may ignore the browser-local rate/pitch controls. Graphics slider changes debounce for 80ms before applying renderer and bloom setters.

## Tutorial Overlay

On first flight entry, the controls reference overlay appears when `gameOrchestrator.tutorialComplete` is false and `tutorialOverlayDismissed` is false. It can be dismissed for the run or marked `DON'T SHOW AGAIN`, which writes the setting through the hash-backed settings store. The overlay does not pause the game loop, and dismissing it immediately relocks mouselook on pointer-lock devices.

## Star System

The expanded flight system is authored in `js/flight/world.js` with system-space coordinates in `[x, y, z]` units. `worldToThree(posArray, THREE)` is the canonical converter from authored world coordinates to Three.js vectors, and project nodes, planet meshes, proximity checks, navigation, starfield exclusions, stations, HUD nearest-body logic, and persistence all use that unified world-space model.

Ambient dust and fine particles recycle around the player instead of filling the full 50k system with geometry. Region cells tint the particulate field deterministically so long flights retain visual texture without growing object counts.

### Planets

`PLANETS` contains 23 project-backed planets matching `USSY_PROJECTS`. Planet ids are project ids, not separate expansion-only ids, so navigation, surface state, nearest-body persistence, project landing, and station-profile lookups can all refer to the same stable project body.

Examples: `devussy`, `openclawssy`, `nexussy`, `ussycode`, `templeossy`, and `rpg-dm-bot` are planets in the 50k system.

### Stations

| Station | Description | Coordinates |
| --- | --- | --- |
| Relay Station 7 | Outpost station focused on missions and relay services. | `[2600, 0, -4200]` |
| Hub Alpha | Trading hub with market access and missions. | `[-3600, 0, 6200]` |
| Fort Kova | Military base with mission services and defensive silhouette. | `[14500, 0, 2400]` |

### Jump Points

| Jump Point | Description | Coordinates |
| --- | --- | --- |
| Inner Ring Jump | Inner-system fast-travel anchor. | `[0, 0, 9500]` |
| Mid Ring Jump | Mid-system route anchor. | `[0, 0, 24500]` |
| Outer Jump Gate | Outer-system gate for the larger 50k route network. | `[0, 0, -41000]` |

### Jump Gates

Six physical jump gates form the public transit network for long-distance flight. Fly within `12u` of a gate and press `J` to activate the first linked outbound gate; route autopilot can also use low-cost gate edges to cross the system efficiently.

## Hyperspace Drive

`HYPERSPACE DRIVE` is a high-tier skill unlock on the weapons branch. It costs `5` skill points, requires `weap_3` / `OVERCLOCKED COILS`, and enables direct point-to-point travel without the jump-gate bus. Press `H` with a nav target set to charge the drive, drain energy, jump to the target, and start a 60 second cooldown. Pilots without the unlock route through jump gates for distant trips.

## Navigation

Press `M` in flight to toggle the system map overlay. Opening the map releases mouselook and clears held inputs so thrust/fire do not continue while the pointer is on the HUD. The overlay draws the navigation graph, planets, stations, jump points, gates, route edges, and the player's current position. Click any rendered node to plot a route to it; project-backed planets also become the normal nav target when their scene node is available. The navigation panel controls still work: `ENGAGE` plots a route to the current nav target when available, otherwise to the nearest planet/station fallback, and `ABORT` disengages autopilot.

Autopilot uses the route state machine `IDLE -> PLOTTING -> ENGAGED -> DECELERATING -> ARRIVED`. A successful route plot shows the route mode (`VIA GATE NETWORK`, `HYPERSPACE DIRECT`, or `LOCAL ROUTE`) while `PLOTTING` resolves the course, then the ship moves through graph waypoints under autopilot control. Long segments can spool hyperspeed from normal cruise up toward an 80x multiplier; final approach drops back to normal speed before arrival.

If plotting fails, the HUD reports `NO NAV ROUTE AVAILABLE` or the autopilot `blockedReason` such as `NO ROUTE FOUND`. Manual override, landing/docking, boss activity, nearby hostiles, hull-critical state, target loss, or hostile interdiction can interrupt travel and set messages such as `AUTOPILOT DISENGAGED: HOSTILE INTERDICTION`.

## Surface Approach

Planet proximity uses the surface state machine in `js/flight/surface.js`. Flying inside `planet.radius * 1.6` enters approach, inside `planet.radius * 1.2` enters orbital state, and `L` begins a short landing sequence. Landed planets show a surface services panel; hostile and anomaly worlds can surface unique actions, while departure reverses the landing progress and returns to normal flight.

Approach and landing temporarily pause or constrain route travel, update the surface HUD with altitude/status, and add close-atmosphere camera/FOV treatment from the flight loop.

## Missions

Stations with mission services expose the mission board with `B` while docked or landed. Boards generate deterministic delivery, patrol, escort, scan, and bounty contracts from the station and navigation graph. The player can accept up to three active missions; accepted missions appear in the active sidebar and progress from local events such as route arrival, scan proximity, and bounty kills.

Mission states use `AVAILABLE`, `ACTIVE`, `COMPLETE`, `FAILED`, and `EXPIRED`. Timed missions expire from elapsed mission time, completion grants credits/fuel/reputation, and declined or completed mission ids are filtered out of future board generation.

## Ambient Traffic And Bounties

Civilian traffic is simulated separately from combat enemies. Freighters, shuttles, and couriers travel between world nodes, dock briefly, flee nearby hostiles, and can be destroyed by heavy combat without becoming combatants. The system map draws civilian contacts by type.

The bounty hunter system tracks `traderState.bountyLevel`. At bounty thresholds `500`, `1500`, and `3000`, hunter intercepts can trigger on node arrival, spawning scout, wing, or squadron groups from `VEGA_CORP`, `IRONCLAD_GUILD`, or `RED_AXIS`. Hunters interrupt autopilot, appear as red triangle system-map contacts, increase bounty if they flee, and reduce bounty when destroyed.

## Combat

Enemies spawn with formation roles. `aggressor` units push directly toward the player, `flanker` units steer toward a 90-degree side orbit, and `support` units hold around 60 units and only close or retreat outside their preferred band.

## Reputation

Security reputation now has combat consequences. At `security < -30`, the faction can dispatch one elite `BOUNTY HUNTER` at a time; destroying it pays a 220cr reward and raises security reputation back toward the hostile floor. Bounty hunters and other nearby hostiles can interrupt autopilot/hyperspeed as hostile interdictions. At `security > 40`, a friendly scout escort can join for 25 seconds, orbiting the player and firing at the weakest hostile before fading out.

The expansion bounty system is separate from security reputation consequences: it is driven by `traderState.bountyLevel` and can create tiered hunter intercepts after navigation node arrivals.

## Radar

The cockpit minimap plots active targets within radar range. Active, non-stunned enemies also show a short red velocity projection line from their contact dot, capped to 14px, with dreadnoughts using a thicker/brighter projection. Desktop radar refreshes are throttled to 150ms to reduce HUD CPU work while preserving target readability.

Kill streaks chain within a four-second window. Rewards scale to `1.5x` at two kills, `2x` at three kills, and `3x` at five kills. The HUD flashes the active streak near the economy/status panel.

The cockpit economy/status panel includes a four-line kill feed. It logs enemy kills with class and credit reward, shield and hull critical warnings, bounty wave clears, and dreadnought spawns. Entries render newest-first, fade the fourth slot, and expire after four seconds.

## Loadout Screen

Dock at a project station and choose `LOADOUT` from station services to open the visual loadout terminal. The panel shows equipped primary and secondary weapon names plus damage, fire rate, and range, lists alternate slot-compatible weapons, and lets the player buy/equip weapons without leaving the dock flow. Purchases deduct `traderState.credits`; insufficient funds flash the selected control for 600ms without changing loadout state.

The same terminal exposes quick service buys: armor repair adds `+20` hull capped at `maxHull` for `80CR`, and shield service adds `+1` `maxShieldHp` for `150CR`.

Wave announcements use the resolved enemy classes in each spawn batch, for example `3x SWARM SPECIALIST, 1x NEXUSSY OPERATOR`. Dreadnought spawns trigger a critical message, TTS warning, and red cockpit edge flash.

## Boss Encounters

Boss encounters trigger when the player score reaches `1500`, `4000`, and `8000`. Each threshold advances once, announces the inbound contact, then spawns a HERMES-DREADNOUGHT roughly 80 units ahead after 2.8 seconds.

Boss dreadnoughts override the regular class stats with `18` hull, `6` shield HP, `3.2x` scale, and a dedicated cockpit health bar. Their attack phase is based on remaining hull: phase 1 fires 4-shot bursts, phase 2 at 66% hull fires 6-shot bursts with a 0.7s cooldown, and phase 3 at 33% hull fires 8-shot bursts with a 0.5s cooldown plus one elite escort every 12 seconds when no elite is active.

Destroying the boss clears the boss HUD/state, plays the large explosion at full volume, awards `+1200` score and credits, and announces `DREADNOUGHT DESTROYED +1200CR`. Enemy death flash feedback is driven through the Web Animations API rather than forcing a layout reflow to restart CSS animation state.

Delayed enemy spawns now enter with a short approach burst once their delay expires, so waves lunge into the arena instead of drifting in from their spawn point. Elite aggressors and flankers add a side-to-side strafe relative to the player's current right vector, while support elites keep the longer-range support behavior.

Gunboats can deploy up to two stationary turrets when opening a burst. Elites cloak once when reduced to half health, fading almost invisible for 2.2 seconds before restoring their class opacity. Phantoms split on first death into two one-health child phantoms that cannot split again.

## Enemy Visual Design

Enemy visuals are class-driven in `js/flight/enemies.js`. Every pooled enemy owns a small engine `PointLight` that is created with the pool, recolored on spawn, pulsed while active, boosted during burst fire, and turned off when inactive or recycled.

| Enemy | Visual Identity |
| --- | --- |
| Scout | Fast drone-like tumble around a tilted axis with the class engine glow color. |
| Interceptor | Moderate pure-roll rotation that reads like a fast approach craft. |
| Gunboat | Slow yaw-only rotation with deliberate heavy-ship motion. |
| Elite | Sharp diagonal spins plus non-support strafe oscillation for a harder target profile; once per spawn, a half-health cloak drops opacity to near invisible. |
| Dreadnought | No tumble, `2.4x` pooled group scale, brighter engine glow, critical spawn alert, longer death flash, and large explosion SFX. |
| Phantom | Fast disorienting spin with randomized opacity flicker across body and wing materials; first death splits into two weak child phantoms. |

Enemy death flashes the cockpit overlay using the destroyed class color. Standard enemies use a short 180ms flash and engine glow spike; dreadnought kills use a 400ms flash and stronger glow/audio burst.

## Assists

Match speed displays `SPEED MATCH ACTIVE` under the reticle while the assist is engaged. Evasion uses `C`, applies a lateral burst, starts a cooldown, flashes the cockpit overlay, and rolls the camera briefly.

## Docking

Project-backed planets still use the existing station services flow. Standalone system stations use proximity-based docking: flying within `120` units of Relay Station 7, Hub Alpha, or Fort Kova automatically docks, stops velocity, opens station services, and releases mouselook.

Mission-capable stations allow `B` to open the board from the docked/landed state. The mission board pauses flight through `flightState.pauseReasons` and closes with `Escape`.

## Help Menu

The in-flight pilot manual opens with `F1`; outside flight, `H` can also open help. It contains `CONTROLS`, `HOW TO PLAY`, `UNIVERSE`, and `TIPS & TRICKS` tabs, pauses flight while open, and closes before other overlays when `Escape` is pressed.

## Post-Combat Debrief

When a combat wave clears, the game queues a debrief overlay for five seconds or until any keypress. It reports kills, accuracy, credits earned, XP earned, and peak streak. Session stats reset when a new sortie, respawn, or wave starts.

## Persistence

Dogfight runs save to `sessionStorage` only. The game restores a valid previous run when flight mode starts, saves manually when docking, undocking, or buying a skill, and autosaves once per minute while enemies are active. Manual saves show `STATE SAVED`; autosaves stay silent.

Run-state schema v3 persists active missions, completed mission ids, bounty level, player position, last visited body, active autopilot target, and the minimal surface restore fields `state` and `planetId`. User settings persist separately in the shareable `:cfg:` hash slot. Civilian traffic fleets and active bounty hunter intercepts remain runtime-only.

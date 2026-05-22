# Gameplay

## Flight Loop

Type `ussy` to enter flight mode. The ship uses mouse look plus keyboard thrust and strafing. Dock at project nodes to refuel, trade, manage inventory, and accept contracts.

## Controls

| Key | Action |
| --- | --- |
| `R` | Toggle static throttle |
| `Z` / `X` | Increase / decrease throttle |
| `G` | Match nearest enemy velocity, or brake if no target is available |
| `C` | Evasion roll with cockpit flash and roll camera kick |
| `F` | Cold jump when the engine skill is unlocked |
| `M` | Toggle the system map overlay |
| `V` | Set nav target from the crosshair |
| `Y` | Toggle autopilot |
| `Shift+C` | Toggle cockpit / third-person camera |

## Star System

The expanded flight system is authored in `js/flight/world.js` with system-space coordinates in `[x, y, z]` units.

### Planets

| Body | Description | Coordinates |
| --- | --- | --- |
| Nexus Prime | Homeworld hub world with an associated station presence. | `[0, 0, 0]` |
| Cinder | Hostile inner-system planet with a hot red/orange atmosphere and no station. | `[8000, 0, 3000]` |
| Vaultholm | Large trading world with green atmosphere and station support. | `[-12000, 0, -5000]` |
| The Breach | Small anomaly world with a purple atmosphere and station support near the outer route. | `[20000, 0, -15000]` |

### Stations

| Station | Description | Coordinates |
| --- | --- | --- |
| Relay Station 7 | Outpost station focused on missions and relay services. | `[4000, 0, -2000]` |
| Hub Alpha | Trading hub with market access and missions. | `[-6000, 0, 8000]` |
| Fort Kova | Military base with mission services and defensive silhouette. | `[15000, 0, 5000]` |

### Jump Points

| Jump Point | Description | Coordinates |
| --- | --- | --- |
| Inner Ring Jump | Inner-system fast-travel anchor. | `[3500, 0, 3500]` |
| Mid Ring Jump | Mid-system route anchor. | `[-9000, 0, 2000]` |
| Outer Jump Gate | Outer-system gate near The Breach route. | `[18000, 0, -10000]` |

## Navigation

Press `M` in flight to toggle the system map overlay. The overlay draws the navigation graph, planets, stations, jump points, route edges, and the player's current position. Route engagement currently uses the navigation panel controls: `ENGAGE` plots a route to the current nav target when available, otherwise to the nearest planet/station fallback, and `ABORT` disengages autopilot.

Autopilot uses the route state machine `IDLE -> PLOTTING -> ENGAGED -> DECELERATING -> ARRIVED`. A successful route plot shows `ROUTE PLOTTED: <TARGET>` while `PLOTTING` resolves the course, then the ship moves through graph waypoints under autopilot control. Long segments can spool hyperspeed from normal cruise up toward an 80x multiplier; final approach drops back to normal speed before arrival.

If plotting fails, the HUD reports `NO NAV ROUTE AVAILABLE` or the autopilot `blockedReason` such as `NO ROUTE FOUND`. Manual override, landing/docking, boss activity, nearby hostiles, hull-critical state, target loss, or hostile interdiction can interrupt travel and set messages such as `AUTOPILOT DISENGAGED: HOSTILE INTERDICTION`.

## Combat

Enemies spawn with formation roles. `aggressor` units push directly toward the player, `flanker` units steer toward a 90-degree side orbit, and `support` units hold around 60 units and only close or retreat outside their preferred band.

## Reputation

Security reputation now has combat consequences. At `security < -30`, the faction can dispatch one elite `BOUNTY HUNTER` at a time; destroying it pays a 220cr reward and raises security reputation back toward the hostile floor. Bounty hunters and other nearby hostiles can interrupt autopilot/hyperspeed as hostile interdictions. At `security > 40`, a friendly scout escort can join for 25 seconds, orbiting the player and firing at the weakest hostile before fading out.

## Radar

The cockpit minimap plots active targets within radar range. Active, non-stunned enemies also show a short red velocity projection line from their contact dot, capped to 14px, with dreadnoughts using a thicker/brighter projection.

Kill streaks chain within a four-second window. Rewards scale to `1.5x` at two kills, `2x` at three kills, and `3x` at five kills. The HUD flashes the active streak near the economy/status panel.

The cockpit economy/status panel includes a four-line kill feed. It logs enemy kills with class and credit reward, shield and hull critical warnings, bounty wave clears, and dreadnought spawns. Entries render newest-first, fade the fourth slot, and expire after four seconds.

## Loadout Screen

Dock at a project station and choose `LOADOUT` from station services to open the visual loadout terminal. The panel shows equipped primary and secondary weapon names plus damage, fire rate, and range, lists alternate slot-compatible weapons, and lets the player buy/equip weapons without leaving the dock flow. Purchases deduct `traderState.credits`; insufficient funds flash the selected control for 600ms without changing loadout state.

The same terminal exposes quick service buys: armor repair adds `+20` hull capped at `maxHull` for `80CR`, and shield service adds `+1` `maxShieldHp` for `150CR`.

Wave announcements use the resolved enemy classes in each spawn batch, for example `3x SWARM SPECIALIST, 1x NEXUSSY OPERATOR`. Dreadnought spawns trigger a critical message, TTS warning, and red cockpit edge flash.

## Boss Encounters

Boss encounters trigger when the player score reaches `1500`, `4000`, and `8000`. Each threshold advances once, announces the inbound contact, then spawns a HERMES-DREADNOUGHT roughly 80 units ahead after 2.8 seconds.

Boss dreadnoughts override the regular class stats with `18` hull, `6` shield HP, `3.2x` scale, and a dedicated cockpit health bar. Their attack phase is based on remaining hull: phase 1 fires 4-shot bursts, phase 2 at 66% hull fires 6-shot bursts with a 0.7s cooldown, and phase 3 at 33% hull fires 8-shot bursts with a 0.5s cooldown plus one elite escort every 12 seconds when no elite is active.

Destroying the boss clears the boss HUD/state, plays the large explosion at full volume, awards `+1200` score and credits, and announces `DREADNOUGHT DESTROYED +1200CR`.

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

Project nodes still use the existing station services flow. System stations use proximity-based docking: flying within `120` units of Relay Station 7, Hub Alpha, or Fort Kova automatically docks, stops velocity, opens station services, and releases mouselook.

## Post-Combat Debrief

When a combat wave clears, the game queues a debrief overlay for five seconds or until any keypress. It reports kills, accuracy, credits earned, XP earned, and peak streak. Session stats reset when a new sortie, respawn, or wave starts.

## Persistence

Dogfight runs save to `sessionStorage` only. The game restores a valid previous run when flight mode starts, saves manually when docking, undocking, or buying a skill, and autosaves once per minute while enemies are active. Manual saves show `STATE SAVED`; autosaves stay silent.

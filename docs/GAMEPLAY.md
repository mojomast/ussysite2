# Gameplay

## Flight Loop

Type `ussy` to enter flight mode. The ship uses mouse look plus keyboard thrust and strafing. Dock at project nodes to refuel, trade, manage inventory, and accept contracts.

## Controls

| Key | Action |
| --- | --- |
| `T` | Toggle static throttle |
| `Z` / `X` | Increase / decrease throttle |
| `G` | Match nearest enemy velocity, or brake if no target is available |
| `C` | Evasion roll with cockpit flash and roll camera kick |
| `F` | Cold jump when the engine skill is unlocked |
| `V` | Set nav target from the crosshair |
| `P` | Toggle autopilot |
| `Shift+C` | Toggle cockpit / third-person camera |

## Combat

Enemies spawn with formation roles. `aggressor` units push directly toward the player, `flanker` units steer toward a 90-degree side orbit, and `support` units hold around 60 units and only close or retreat outside their preferred band.

## Radar

The cockpit minimap plots active targets within radar range. Active, non-stunned enemies also show a short red velocity projection line from their contact dot, capped to 14px, with dreadnoughts using a thicker/brighter projection.

Kill streaks chain within a four-second window. Rewards scale to `1.5x` at two kills, `2x` at three kills, and `3x` at five kills. The HUD flashes the active streak near the economy/status panel.

Wave announcements use the resolved enemy classes in each spawn batch, for example `3x SWARM SPECIALIST, 1x NEXUSSY OPERATOR`. Dreadnought spawns trigger a critical message, TTS warning, and red cockpit edge flash.

Delayed enemy spawns now enter with a short approach burst once their delay expires, so waves lunge into the arena instead of drifting in from their spawn point. Elite aggressors and flankers add a side-to-side strafe relative to the player's current right vector, while support elites keep the longer-range support behavior.

## Enemy Visual Design

Enemy visuals are class-driven in `js/flight/enemies.js`. Every pooled enemy owns a small engine `PointLight` that is created with the pool, recolored on spawn, pulsed while active, boosted during burst fire, and turned off when inactive or recycled.

| Enemy | Visual Identity |
| --- | --- |
| Scout | Fast drone-like tumble around a tilted axis with the class engine glow color. |
| Interceptor | Moderate pure-roll rotation that reads like a fast approach craft. |
| Gunboat | Slow yaw-only rotation with deliberate heavy-ship motion. |
| Elite | Sharp diagonal spins plus non-support strafe oscillation for a harder target profile. |
| Dreadnought | No tumble, `2.4x` pooled group scale, brighter engine glow, critical spawn alert, longer death flash, and large explosion SFX. |
| Phantom | Fast disorienting spin with randomized opacity flicker across body and wing materials. |

Enemy death flashes the cockpit overlay using the destroyed class color. Standard enemies use a short 180ms flash and engine glow spike; dreadnought kills use a 400ms flash and stronger glow/audio burst.

## Assists

Match speed displays `SPEED MATCH ACTIVE` under the reticle while the assist is engaged. Evasion uses `C`, applies a lateral burst, starts a cooldown, flashes the cockpit overlay, and rolls the camera briefly.

## Post-Combat Debrief

When a combat wave clears, the game queues a debrief overlay for five seconds or until any keypress. It reports kills, accuracy, credits earned, XP earned, and peak streak. Session stats reset when a new sortie, respawn, or wave starts.

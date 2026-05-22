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

Kill streaks chain within a four-second window. Rewards scale to `1.5x` at two kills, `2x` at three kills, and `3x` at five kills. The HUD flashes the active streak near the economy/status panel.

Wave announcements use the resolved enemy classes in each spawn batch, for example `3x SWARM SPECIALIST, 1x NEXUSSY OPERATOR`. Dreadnought spawns trigger a critical message, TTS warning, and red cockpit edge flash.

## Assists

Match speed displays `SPEED MATCH ACTIVE` under the reticle while the assist is engaged. Evasion uses `C`, applies a lateral burst, starts a cooldown, flashes the cockpit overlay, and rolls the camera briefly.

## Post-Combat Debrief

When a combat wave clears, the game queues a debrief overlay for five seconds or until any keypress. It reports kills, accuracy, credits earned, XP earned, and peak streak. Session stats reset when a new sortie, respawn, or wave starts.

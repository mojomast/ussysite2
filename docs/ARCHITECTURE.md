# Architecture

## Module Graph

```text
index.html
  -> projects.js
  -> js/main.js
       -> js/economy/trader.js
            -> js/tts/engine.js

js/flight/state.js
  -> pure flight, mission, and message state

js/engine/*, js/flight/*, js/ui/*
  -> module boundaries for scene, flight, HUD, mission, messages, and UI code
```

`main.js` is the integration point. It initializes Three.js, binds DOM input, runs animation, and wires the trader economy into the existing flight loop.

## Flight Data Flow

```text
user input -> updateFlight physics -> combat objects -> mission state -> game messages -> TTS
```

Keyboard and mouse events mutate `flightState`. The animation loop applies physics, combat, navigation, landing checks, mission progression, HUD updates, and radio messages.

## Economy Data Flow

```text
flight loop -> fuel drain -> dock at project node -> trade menu -> traderState -> HUD/TTS
```

Fuel drains while thrusting or using autopilot. Landing calls restock/refuel behavior and opens the station menu. Trade choices reuse the existing message choice system.

## State Objects

| State | Purpose |
| --- | --- |
| `flightState` | Ship resources, position, velocity, input, nav, landing, view state |
| `missionState` | Tutorial objective, kill goal, landing handoff |
| `gameMessageState` | Active message, typed text, choices, dismissal handler |
| `traderState` | Credits, fuel, cargo, docked station, trade log |

## Extending

Add mission steps by extending `setMissionStep()` and calling `showGameMessage()` for player-facing objectives. Add commodities in `COMMODITIES` and update `getStationProfile()` rules. Add station profile behavior by mapping project categories or project IDs to production and demand arrays.

# Architecture

## Module Graph

```text
index.html
  -> projects.js
  -> js/main.js
       -> js/economy/trader.js
       -> js/flight/orchestrator.js
            -> js/tts/engine.js

js/flight/state.js
  -> pure flight, mission, and message state

js/engine/*, js/flight/*, js/ui/*
  -> module boundaries for scene, flight, HUD, mission, messages, and UI code
```

`main.js` is the integration point. It initializes Three.js, binds DOM input, runs animation, and wires the trader economy into the existing flight loop.

## Flight Data Flow

```text
user input -> updateFlight physics -> combat objects -> mission state -> orchestrator poll -> game messages -> TTS
```

Keyboard and mouse events mutate `flightState`. The animation loop applies physics, combat, navigation, landing checks, mission progression, HUD updates, and radio messages.

## Economy Data Flow

```text
flight loop -> fuel drain -> dock at project node -> trade menu -> traderState -> HUD/TTS
```

Fuel drains while thrusting or using autopilot. Landing calls restock/refuel behavior and opens the station menu. Trade choices reuse the existing message choice system.

## AI Gameplay Loop

```text
tutorial handoff -> gameOrchestrator.tutorialComplete -> sparse pollOrchestrator()
  -> POST /api/orchestrate -> validated event JSON -> fireOrchestratedEvent()
  -> showGameMessage() -> optional choice resolution -> rewards/spawns/navigation
```

`pollOrchestrator()` runs at most once per second from `animate()` and only sends a network request when the tutorial is complete, no message is active, flight mode is active, and `nextPollAt` has elapsed. This prevents AI events from interrupting mission, trade, or station dialogs.

`gameOrchestrator` tracks whether polling is enabled, whether a request is in flight, the last event ID/time, the next poll timestamp, pending event data, and any bounty reward waiting on enemy cleanup.

| Event Type | Behavior |
| --- | --- |
| `COMBAT` | Spawns hostile ships and sets the HUD status to hostile contact |
| `COMMS` | Radio message with optional choices and rewards |
| `DISTRESS` | Offers respond/ignore; respond sets navigation to a live project node |
| `BOUNTY` | Spawns a wave and pays credits after all bounty enemies are inactive |
| `CONTRABAND` | Offers cargo jettison or refusal; refusal spawns enforcers |
| `ANOMALY` | Flavor anomaly near the project graph with a small fuel reward |
| `SILENCE` | Low-priority atmospheric transmission only |

Choice resolution dismisses the current message, applies any choice-1 credit/fuel reward for non-bounty events, and can show a short outcome transmission. Bounty rewards are tracked separately with `bountyPendingReward` so payment happens after combat completion.

## State Objects

| State | Purpose |
| --- | --- |
| `flightState` | Ship resources, position, velocity, input, nav, landing, view state |
| `missionState` | Tutorial objective, kill goal, landing handoff |
| `gameMessageState` | Active message, typed text, choices, dismissal handler |
| `traderState` | Credits, fuel, cargo, docked station, trade log |
| `gameOrchestrator` | Sparse AI event polling, last event timing, pending event, bounty reward |

## Extending

Add mission steps by extending `setMissionStep()` and calling `showGameMessage()` for player-facing objectives. Add commodities in `COMMODITIES` and update `getStationProfile()` rules. Add station profile behavior by mapping project categories or project IDs to production and demand arrays.

# Orchestrator

## Purpose

The AI gameplay orchestrator adds post-tutorial variety without replacing the local game loop. The browser remains authoritative for flight, combat, trade, and HUD state. Gemini only decides whether a sparse event should fire and returns validated JSON.

Design priorities: cheap model, sparse polling, non-blocking failures, no active-dialog interruption, and no hard dependency on live AI for the game to run.

## Event Types

| Type | Description | Spawn Behavior | Reward Structure |
| --- | --- | --- | --- |
| `COMBAT` | Immediate hostile contact | Spawns 0-5 enemies | Optional choice reward only |
| `COMMS` | Faction or station radio | None unless requested | Optional credits/fuel on choice 1 |
| `DISTRESS` | Help request | None immediately | Respond sets nav to a project node |
| `BOUNTY` | Paid combat wave | Spawns bounty enemies | Credits paid after wave is cleared |
| `CONTRABAND` | Cargo inspection | Refusal spawns enforcers | Jettison removes cargo and applies penalty |
| `ANOMALY` | Rare project-space signal | None | Small fuel top-up |
| `SILENCE` | Atmospheric deep-space flavor | None | None |

## Server Endpoint

`POST /api/orchestrate` accepts same-origin browser requests only.

Request:

```json
{
  "gameState": {
    "score": 0,
    "credits": 1000,
    "fuel": 100,
    "cargo": {},
    "shield": 100,
    "armor": 100,
    "ammo": 240,
    "missiles": 8,
    "kills": 5,
    "nearestStation": "devussy",
    "dockedAt": null,
    "lastEvent": null,
    "timeSinceLastEvent": 999,
    "tutorialComplete": true
  }
}
```

Response:

```json
{
  "fire": true,
  "event": {
    "id": "deep_signal",
    "type": "SILENCE",
    "source": "NULL WAKE",
    "title": "DEEP SIGNAL",
    "text": "Carrier static rolls across the canopy. No contact follows.",
    "choices": [],
    "spawnEnemies": 0,
    "creditReward": 0,
    "fuelReward": 0,
    "urgency": "low"
  }
}
```

Failures return `{ "fire": false, "event": null, "error": "..." }` or no event when disabled.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `ORCHESTRATOR_MODEL` | `google/gemini-2.5-flash-preview` | Primary OpenRouter model |
| `ORCHESTRATOR_ENABLED` | `true` | Set to `false` to disable event firing |

The server falls back to `google/gemini-2.0-flash-001` if the primary model request fails.

## Testing

From the browser console after completing the tutorial:

```js
window.pollOrchestrator()
window.gameOrchestrator
```

Automated tests:

```bash
npm run test:orchestrator
```

Live smoke test:

```bash
ORCHESTRATOR_LIVE=1 npm run test:orchestrator:live
```

## Extending

Add new event types in the server prompt schema and validate them in `validateOrchestratorEvent()`. Add matching client behavior inside `fireOrchestratedEvent()`. Keep events terse, deterministic to resolve, and safe to ignore if the network fails.

## Cost Estimate

The client polls sparsely: roughly 1-2 polls per minute after the tutorial, each around 500 input/output tokens. At Gemini Flash pricing this should stay in the low-cent range for normal play sessions, with no polling before tutorial completion and no live calls when dialogs are already active.

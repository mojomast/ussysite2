Mission System
==============

The flight mission pipeline is client-side and lives in `js/flight/mission.js`, with event selection helpers in `js/flight/orchestrator.js` and runtime wiring in `js/flight/state.js`.

## Mission State

`createMissionState()` returns the mutable state object held by `state.js`:

```js
{
  active: false,
  step: 'idle',
  killGoal: 5,
  kills: 0,
  landingProjectId: 'devussy',
  contractId: null,
  contractTitle: '',
  contractStepIndex: 0,
  contractProgress: 0,
  contractStartStationId: null,
  currentObjective: null,
  objectiveView: 'current'
}
```

Progress is serialized with `serializeMissionProgress()` and restored with `applyMissionProgress()`. Built-in contract definitions are not duplicated in save data; custom active definitions are persisted when needed.

## Contract Steps

Built-in contracts use a shared `steps` array:

- `kills`: spawns a wave once at step activation, then advances when `registerMissionKill()` reaches `target`.
- `land`: sets a nav target when a station is specified or selected, then advances from `handleMissionLanding()`.
- `landDifferent`: requires landing somewhere other than `contractStartStationId`.
- `trade`: advances from the trader `onTrade` callback when action, station, commodity, and quantity requirements match.

## Configure Deps

`configureMission()` receives runtime dependencies from `state.js`: `flightState`, `missionState`, `missionContracts`, enemy pool references, `spawnEnemy`, `activateEnemyWave`, `traderState`, audio helpers, navigation helpers, HUD refresh, and SFX. Mission code does not create new scene nodes; it only asks the existing enemy pool to activate ships.

## Dispatch Pipeline

1. `pollOrchestrator()` receives a server event and calls `fireOrchestratedEvent()`.
2. `fireOrchestratedEvent()` calls `dispatchOrchestratorEvent()` with the event type and current game state.
3. `dispatchOrchestratorEvent()` maps combat/bounty events to kill contracts, trade/contraband events to market contracts, and distress/anomaly/survey events to landing contracts.
4. `startMissionContract()` marks `missionState.active`, records the contract, and calls `setMissionStep()` for step zero.
5. `setMissionStep()` updates HUD objective text, sets nav markers for landing steps, and spawns enemies for kill steps.
6. Runtime hooks call `registerMissionKill()`, `registerMissionTrade()`, and `handleMissionLanding()`.
7. `advanceContractStep()` moves to the next step or calls `completeMission()`.
8. `completeMission()` credits rewards, plays `ui_confirm`, announces completion with high-priority TTS, and resets mission state to free roam.

If `missionState.active` is already true, orchestrator dispatch returns false and does not replace the active mission.

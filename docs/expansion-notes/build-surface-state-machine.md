# Build Surface State Machine

Phase 3 Build Agent 3A output note for Agent 3B.

## Files Changed

- `js/flight/surface.js` and `web/out/js/flight/surface.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/input.js` and `web/out/js/input.js`
- `test/surface.test.mjs`
- `docs/expansion-notes/build-surface-state-machine.md`

## Decisions

- Added a small surface state machine with `NONE`, `APPROACH`, `ORBITAL`, `LANDING`, `SURFACE`, and `DEPARTURE` states.
- Kept the module DOM-free and UI-free. It mutates the supplied `flightState` only and has no dependency on HUD or message systems.
- Added `flightState.surface` defaults in state initialization with `state`, `planetId`, `approachDist`, `orbitAltitude`, `landingProgress`, `surfaceY`, and `exitQueued`.
- `enterApproach` directly idles route autopilot fields and clears its route/hyperspeed so surface approach does not depend on UI callbacks.
- Used the requested orbital guard of `planet.radius * 1.2`. The approach hint range is `planet.radius * 1.6`.
- Wired `L` to begin surface landing when already in `ORBITAL`; otherwise the existing project-node landing path is preserved.
- Blocked station auto-docking while a surface state is active to avoid mixed dock/surface state.
- Hostile planets set `exitQueued` and auto-transition from `SURFACE` to `DEPARTURE`. Enemy encounter spawning is intentionally deferred because this pure module does not own combat spawning.

## Tests

- Added `test/surface.test.mjs` for proximity, autopilot disengage, approach-to-orbital transition, landing timing, surface services, hostile auto-departure, and departure reset.

## Handoff Notes For 3B

- Integrate hostile surface encounters from runtime code that owns `spawnEnemy` or `activateEnemyWave`. The 3A handoff flag is `flightState.surface.exitQueued` on hostile landing/surface.
- Add HUD/menu presentation for `ORBITAL` and `SURFACE` services. `getSurfaceServices(planet)` returns an array of service objects by planet type.
- Consider a dedicated surface departure vector/placement pass if 3B adds camera work or collision-aware planet egress.

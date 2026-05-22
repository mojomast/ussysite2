# Build Hunters

Phase 5 Build Agent 5B output note.

## Files Changed

- `js/flight/hunters.js` and `web/out/js/flight/hunters.js`
- `js/flight/autopilot.js` and `web/out/js/flight/autopilot.js`
- `js/flight/combat-state.js` and `web/out/js/flight/combat-state.js`
- `js/flight/enemies.js` and `web/out/js/flight/enemies.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/economy/trader.js` and `web/out/js/economy/trader.js`
- `test/hunters.test.mjs`
- `docs/expansion-notes/build-hunters.md`

## Decisions

- Added explicit `traderState.bountyLevel` and `traderState.interceptCooldown` fields to drive hunter pressure separately from reputation. Factions and tiers follow the requested public contract: `VEGA_CORP`, `IRONCLAD_GUILD`, `RED_AXIS`; thresholds `500`, `1500`, and `3000`.
- Added runtime-only `combatState.activeIntercept` and `combatState.lastNodeArrival`; only the intercept group and node debounce live there, and active intercepts are not included in persistence.
- Used route autopilot node arrivals as the intercept trigger source by emitting `flightState.newNodeArrival` when a waypoint or destination threshold is reached.
- Kept the legacy reputation-based single bounty hunter intact for now, while new intercept hunters use `isHunter`, `faction`, `hunterName`, `tier`, and scaled `health`/`maxHealth` fields.
- `triggerIntercept()` uses pooled enemies through `spawnEnemy()` when available. If no pool slot or factory exists, it creates lightweight compatible enemy entries so tests and future non-Three callers can exercise the flow.
- Hunter flee at or below 20% HP adds `+200` bounty and deactivates the hunter. Hunter destruction subtracts `150` bounty and clears `activeIntercept` when no hunters in the group remain.

## Tests

- Added `test/hunters.test.mjs` covering tier resolution, trigger gates, autopilot disengage, spawn marking, fallback enemy creation, flee escalation, destroy reduction, and runtime state fields.

## Handoff Notes

- Phase 5C can replace fallback lightweight entries with a dedicated enemy factory if intercepts need unique meshes or arrival VFX outside the pooled enemy path.
- Radar currently sees hunters as normal enemies with hunter metadata. Phase 5C should add the requested faction-colored bounty marker and fleeing/commander variants.
- Flee movement is currently resolved as an immediate deactivation after bounty escalation. Phase 5C can add visible escape vectors and delayed despawn using the existing `fleeing` and `fleeStartedAt` fields.

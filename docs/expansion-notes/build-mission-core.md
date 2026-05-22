# Build Mission Core

Phase 4 Build Agent 4A output note for Agent 4B.

## Files Changed

- `js/flight/missions.js` and `web/out/js/flight/missions.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/flight/persist.js` and `web/out/js/flight/persist.js`
- `js/economy/trader.js` and `web/out/js/economy/trader.js`
- `test/missions.test.mjs`
- `docs/expansion-notes/build-mission-core.md`

## Decisions

- Added a DOM-free mission-board core with deterministic generation from `stationDef.id + seed` and the requested `createMission(overrides = {})` default schema.
- Capped accepted missions at 3 and stored them on `traderState.activeMissions`; completed ids live on `traderState.completedMissionIds`.
- Kept schema version at v2 for now. Persistence now stores/restores active missions and completed ids as additive optional v2 trader fields; a formal v3 migration remains Phase 7 work.
- Runtime progress integration is intentionally narrow: autopilot arrivals, scan proximity, bounty last-kill type, expiry, and reward completion. Mission statuses use the requested uppercase values.

## Tests

- Added `test/missions.test.mjs` for deterministic generation, station type rules, active cap, decline filtering, progress triggers, expiry, completion rewards, and persistence round trip coverage.

## Handoff Notes For 4B

- Mission-board UI should call `generateMissionsForStation`, `acceptMission`, and `declineMission` directly and render `traderState.activeMissions` for the active sidebar.
- Bounty spawning/tagging is not implemented here; current bounty progress consumes `combatState.lastKilledType`.
- Delivery cargo requirements are not enforced yet because Phase 4A only added core lifecycle logic.

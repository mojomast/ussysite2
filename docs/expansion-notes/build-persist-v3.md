# Build Persist V3

Phase 7 Build Agent 7A output note for Agent 7B.

## Files Changed

- `js/flight/persist.js` and `web/out/js/flight/persist.js`
- `test/persist.test.mjs`
- `test/missions.test.mjs`
- `docs/expansion-notes/build-persist-v3.md`

## Decisions

- Bumped saved run-state payloads from schema v2 to v3 while keeping the existing v1 hard break.
- Migrated v2 saves in `loadRunState` and `applyRunState` to v3 defaults instead of returning null.
- Made mission persistence formal v3 data: `trader.activeMissions` and `trader.completedMissionIds` always default to arrays.
- Persisted `trader.bountyLevel` as a non-negative integer and restored it onto `traderState.bountyLevel`.
- Persisted only `flight.surface.state` and `flight.surface.planetId`; other surface runtime values remain transient.
- Left civilian traffic and active intercept data transient and out of saved payloads.

## Tests

- Added v2-to-v3 migration coverage for mission, bounty, and surface defaults.
- Added round-trip coverage for active missions, bounty level, and surface planet id.
- Added save assertions that active intercept and civilian fleet data do not persist.

## Handoff Notes For 7B

- V3 migration currently supplies `flight.surface` defaults even when a v2 save had no flight block.
- Surface restore intentionally only assigns `state` and `planetId`; approach distances, landing progress, and exit flags are recomputed by surface runtime.
- Mission cloning filters invalid mission entries before saving or migrating, matching the existing minimal mission validation shape.

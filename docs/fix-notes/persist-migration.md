# Persist Migration Investigation

## Scope

- Read `js/flight/persist.js` in full.
- Read `test/persist.test.mjs` in full.
- Phase 1 investigation only; no application or test code changes made.

## Findings

- v2 -> v3 migration function: `migrateRunState(data)` at `js/flight/persist.js:186-203`.
- The migration accepts only object data with `v === 2` or `v === SCHEMA_VERSION`; invalid objects, v1, and unknown versions return `null` at `js/flight/persist.js:187-188`.
- Migration creates a new top-level object via spread at `js/flight/persist.js:189-202`; it does not directly mutate the persisted input object during migration.
- Migration also creates new `trader` and `flight` objects via spreads at `js/flight/persist.js:192-201`, so field assignments there are on newly returned objects, not direct mutations of `data`.
- Direct field-assignment mutations occur during apply, not migration: `applyRunState` mutates `combatState`, `traderState`, `reputationState`/`scores`, sets, and flight options at `js/flight/persist.js:290-320`; `applyFlightRunState` mutates `flightState.pos`, `flightState.surface`, `lastVisitedBodyId`, and may call `plotCourse` at `js/flight/persist.js:262-276`.
- Deep clone verdict: migration deep-clones `trader.activeMissions` through `cloneMissions` at `js/flight/persist.js:32-36` and `js/flight/persist.js:194`; `applyRunState` also deep-clones applied active missions at `js/flight/persist.js:309`.
- Deep clone risk: the clone path uses `structuredClone` when available, otherwise `JSON.parse(JSON.stringify(...))`; unsupported values in mission objects may be dropped by the JSON fallback, and non-cloned nested fields outside `activeMissions` remain shared through spreads.
- Catch block return behavior: `saveRunState` catches storage/stringify errors and returns `false` at `js/flight/persist.js:150-157`; `loadRunState` catches storage/parse/migration errors and returns `null` at `js/flight/persist.js:160-171`; `clearRunState` catches storage errors and returns `false` at `js/flight/persist.js:205-213`.
- `SCHEMA_VERSION` is already bumped to `3` at `js/flight/persist.js:5`; newly saved states are written with `v: SCHEMA_VERSION` at `js/flight/persist.js:119-121`, so new saves are v3 immediately.
- v3 default fields added by successful migration are `trader.activeMissions`, `trader.completedMissionIds`, `trader.bountyLevel`, and `flight.surface` at `js/flight/persist.js:192-201`.
- v3 fields with no default on migration failure: if migration throws inside `loadRunState`, the whole load returns `null`, so no v3 defaults are returned; if `applyRunState` receives data that migrates to `null` or fails validation, it returns `false` before assignments at `js/flight/persist.js:286-289`.
- Existing tests cover successful v2 -> v3 defaults in `test/persist.test.mjs:101-119`, v1 rejection in `test/persist.test.mjs:121-124`, storage/parse containment indirectly through storage throwing in `test/persist.test.mjs:246-256`, and invalid apply rejection in `test/persist.test.mjs:278-289`.
- Test gap: there is no test that simulates a migration failure, such as making `cloneMissions`/`structuredClone` fail for v2 active missions, then asserting `loadRunState()` returns `null` and no partial v3 defaults are exposed.

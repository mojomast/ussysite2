# Build Missions Fix

## Audit

- Read `docs/fix-notes/missions-civilians.md` and `docs/fix-notes/build-hunter-fix.md` before code changes.
- Re-audited `js/flight/missions.js` for bare `Math.random` calls.
- `grep -n 'Math.random' js/flight/missions.js` produced no output.
- Mission board generation already threads deterministic seeded RNGs from `createRng(seed)` through mission generation helpers.

## Changes

- No API changes were made to `generateMissionsForStation` or mission helpers because no broken helper calls bare `Math.random`.
- Added regression test `generateMissions: two calls with same seed produce identical output` using the public `generateMissionsForStation(station, navGraph, seed)` API and deep-equal output comparison.

## Tests

- Passed: `node --check js/flight/missions.js`
- Passed: `node --test test/missions.test.mjs` with 10 passing tests.

## Deviations

- The requested `random = Math.random` parameter threading was not added because the audit found no bare `Math.random` in `js/flight/missions.js`; adding it would be unnecessary API churn.

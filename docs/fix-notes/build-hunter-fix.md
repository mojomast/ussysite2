# Build Hunter Fix

## Changes

- Changed `nowMs()` in `js/flight/hunters.js` to use `Date.now()` only.
- Moved `combatState.lastNodeArrival` assignment in `shouldTriggerIntercept` so below-threshold bounty, cooldown blocks, and disallowed node types do not consume an arrival.
- Removed fleeing and destroyed hunters from `combatState.activeIntercept.hunters` after deactivation/accounting.
- Added a `MAX_ENEMY_POOL = 24` cap for fallback hunter pool growth. When no inactive slot is available and the pool already has 24 active enemies, that hunter spawn is skipped and the kill feed receives `POOL FULL — HUNTER SPAWNING SKIPPED`.
- Updated runtime hunter callers in `js/flight/state.js` and `js/flight/enemies.js` to pass `Date.now()` instead of the frame/performance clock, with comments noting the required wall-clock epoch.

## Caller Audit

- `js/flight/state.js` called `shouldTriggerIntercept`, `triggerIntercept`, and `checkHunterFlee` with the frame `time` value. This was definitively wrong after standardizing hunter cooldown timestamps to `Date.now()`, so those calls now use a local `hunterNow = Date.now()`.
- `js/flight/enemies.js` called `checkHunterFlee` with `performance.now()`. This was definitively wrong for hunter timestamps, so that call now passes `Date.now()` while keeping the existing performance clock for enemy animation/health systems.
- No other source callers of `shouldTriggerIntercept`, `triggerIntercept`, or `checkHunterFlee` were found outside `js/flight/hunters.js`, tests, `js/flight/state.js`, and `js/flight/enemies.js`.

## Tests

- Added coverage that below-threshold bounty does not set `lastNodeArrival` and the same node can trigger after bounty crosses the threshold.
- Added coverage that fleeing hunters are spliced from `activeIntercept.hunters`.
- Added coverage that destroyed hunters are spliced from `activeIntercept.hunters`.
- Added coverage that omitted `now` parameters use mocked `Date.now()` consistently for trigger cooldown storage and later cooldown gating.

## Deviations

- Runtime caller files were edited because their performance-clock `now` arguments were definitively wrong for the standardized hunter wall-clock cooldown API.

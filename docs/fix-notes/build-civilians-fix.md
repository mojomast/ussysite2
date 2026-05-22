# Build Civilians Fix

## Audit

- Read `docs/fix-notes/missions-civilians.md` and `docs/fix-notes/build-missions-fix.md` before code changes.
- Confirmed civilian spawning already used active non-destroyed count for the spawn guard, but append-only spawning could grow the backing ship array over time.
- Confirmed normal `updateCivilians` ticks do not splice destroyed ships out of `traffic.ships`.
- Confirmed `dockedUntil` is seconds-based and advances from `dt`, while `now` remains a millisecond timestamp for flee and last-seen timing.

## Changes

- Added `MAX_CIVILIAN_POOL = CIVILIAN_MAX * 3` for an 18-object hard civilian pool cap.
- Centralized active non-destroyed counting for spawn cap enforcement.
- Added spawn allocation that reuses inactive or destroyed slots before pushing a new ship.
- Added allocation failure handling so spawning stops when the pool is full and no reusable slot exists.
- Preserved destroyed and inactive entries during normal ticks; disposal still clears arrays for explicit teardown.

## Tests

- Added `fleet cap: active count enforced, not array length` to prove inactive pool entries do not block active-cap replenishment.
- Added `spawnCivilianFleet reuses inactive pool slots and stops at hard pool cap` to cover pool reuse and the 18-object cap.
- Added `dock timer: advances with dt, not wall clock` to prove `dockedUntil` advances by `dt` seconds, independent of millisecond `now` deltas.
- Extended the heavy-combat destruction test to assert destroyed ships remain in the traffic array during normal updates.
- Passed: `node --check js/flight/civilians.js`.
- Passed: `node --test test/civilians.test.mjs` with 15 passing tests.

## Deviations

- Kept the existing `dockedUntil` public field instead of renaming to `dockElapsedMs`; the current API is seconds-based and already uses `dt`, and renaming would cause unnecessary churn.
- `spawnCivilianFleet` continues returning the traffic ship array for API compatibility. The new internal allocator returns `null` when the pool is full and no reusable slot exists, and spawn exits cleanly.

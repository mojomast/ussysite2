# Build Persist Fix

## Audit

- Read `docs/fix-notes/persist-migration.md` and `docs/fix-notes/build-civilians-fix.md` before code changes.
- Confirmed `loadRunState()` already catches storage, parse, and migration errors and returns `null`.
- Confirmed there is no `buildDefaultSave` fallback in this module; existing callers rely on `null` load semantics.

## Changes

- Hardened `migrateRunState()` so migration failures are caught and return `null` instead of exposing partial state.
- Made the v2 -> v3 migration path deep-clone incoming data into a draft before applying v3 defaults.
- Mutated and returned only the draft on success, with the schema version bump performed as the final migration step.
- Exported `migrateRunState()` as a named pure helper so migration failure and atomicity behavior can be tested directly.

## Tests

- Added coverage for malformed v2 data returning `null` while leaving the input object unchanged.
- Added coverage proving successful v2 migration returns v3 without bumping the input object.
- Added caller coverage proving `loadRunState()` returns `null` and `applyRunState()` returns `false` without partial assignment when migration fails.

## Deviations

- Preserved current `loadRunState()` null semantics because this module has no `buildDefaultSave` fallback.

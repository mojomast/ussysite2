# Build Surface Fix

## Changes

- Captured `surface.startY` and `surface.preLandingThrust` in `beginLanding` before landing locks mutate flight controls.
- Updated landing Y interpolation to use the captured `startY` and cumulative `landingProgress` instead of repeatedly lerping from the already-mutated position.
- Removed the landing-time velocity damping call from `updateLanding`.
- Restored departure thrust from finite `surface.preLandingThrust`, falling back to `14` only when the captured value is not finite.
- Removed the old unconditional strafe fallback restoration during departure completion.
- Added a full `NONE` to `SURFACE` to `NONE` round-trip test covering approach, orbital entry, landing, departure, thrust restoration, and final reset state.

## Tests

- Passed: `node --check js/flight/surface.js`
- Passed: `node --test test/surface.test.mjs`

## Deviations

- No deviations from the requested implementation path.

# Build Surface HUD

Phase 3 Build Agent 3B output note.

## Files Changed

- `js/flight/surface.js` and `web/out/js/flight/surface.js`
- `js/flight/hud.js` and `web/out/js/flight/hud.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/input.js` and `web/out/js/input.js`
- `index.html` and `web/out/index.html`
- `index.css` and `web/out/index.css`
- `test/hud.test.mjs`
- `docs/expansion-notes/build-surface-hud.md`

## Decisions

- Kept `updateSurface(flightState, systemPlanets, dt)` in the main flight tick and added HUD/visual updates alongside it rather than expanding the pure surface module with DOM or Three.js dependencies.
- Added `cancelSurfaceApproach()` for Escape in `APPROACH`; `ORBITAL` Escape and `SURFACE` `L` use `beginDeparture()`.
- Surface HUD panels are inert unless their surface state is active. Orbital landing and surface departure buttons call the same runtime functions as `L`.
- Atmosphere opacity and camera FOV tighten during approach, hold through orbital/landing/surface, and restore on departure/none.

## Tests

- Passed: `node --check` on changed JS files.
- Passed: `node --test test/*.test.mjs` with 192 tests, 189 passed, 3 skipped.

## Handoff Notes

- Surface service buttons currently display service availability only; wiring trade/repair/mission actions to planet services remains future work.
- Hostile surface encounter spawning is still deferred to runtime code that owns combat spawning.

# Build World Threat Wiring

Phase 5 Build Agent 5C output note.

## Files Changed

- `js/flight/autopilot.js` and `web/out/js/flight/autopilot.js`
- `js/flight/hud.js` and `web/out/js/flight/hud.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `index.html` and `web/out/index.html`
- `index.css` and `web/out/index.css`
- `test/civilians.test.mjs`
- `test/hud.test.mjs`
- `docs/expansion-notes/build-world-threat-wiring.md`

## Decisions

- Preserved the existing 5A/5B main-loop wiring for initial civilian spawning, per-frame civilian update/respawn, and autopilot node-arrival intercept triggers.
- Added the missing per-frame hunter flee check in the flight loop while keeping hunter destroy handling in `handleEnemyDestroyed()`.
- Extended `renderSystemMap()` instead of adding a second map renderer: civilian contacts now draw by type, and active intercept hunters draw as blinking red triangles.
- Added a top-center bounty HUD element controlled by a named `updateBountyHUD(traderState)` export. It stays hidden at zero bounty and blinks above `1500`.

## Tests

- Extended civilian/map tests for freighter square, shuttle dot, courier triangle, and active hunter triangle rendering.
- Extended HUD tests for bounty indicator hidden/active/critical states.

## Handoff Notes

- Hunter map triangles use active intercept hunter positions only; non-intercept enemies remain on the existing radar/HUD path.
- Civilian simulation still owns `flightState.civilianTraffic.mapContacts`; the map renderer only consumes snapshots.
- Future work can add faction-specific hunter map colors without changing the active-intercept plumbing.

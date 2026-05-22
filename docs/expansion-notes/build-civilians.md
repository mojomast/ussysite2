# Build Civilians

Phase 5 Build Agent 5A output note.

## Files Changed

- `js/flight/civilians.js` and `web/out/js/flight/civilians.js`
- `js/flight/autopilot.js` and `web/out/js/flight/autopilot.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `test/civilians.test.mjs`
- `docs/expansion-notes/build-civilians.md`

## Decisions

- Added a dedicated civilian traffic module and kept civilian state out of enemy pools, enemy targeting, combat debriefs, and mission kill accounting. The public ship shape exposes the requested `mesh`, `pos`, `vel`, `route`, `currentLeg`, `type`, `homeNodeId`, and `destNodeId` fields while runtime route internals stay private.
- Used small wireframe `THREE` primitive meshes for freighter, shuttle, and courier variants with the requested cruise speeds: 80, 140, and 200.
- Capped active civilians at 6, reduced the cap to 3 during combat or hyperspeed, and culls/deactivates ships beyond `LOD_FAR`.
- Implemented `DOCKED`, `DEPARTING`, `TRANSIT`, `FLEE`, and `DESTROYED` state transitions. Heavy combat near civilians records a kill-feed-style loss event without treating the ship as an enemy kill.
- Kept system map integration minimal and data-first through optional civilian contacts passed to `renderSystemMap`.

## Tests

- Added `test/civilians.test.mjs` covering constants/speeds, mesh creation, non-combat identity, cap reduction, dock/depart/transit movement, flee behavior, heavy-combat destruction event, distance culling, disposal, and optional map dots.

## Handoff Notes

- Phase 5B can add richer spawn cadence, route weighting, and docking approach visuals using the existing `flightState.civilianTraffic` container.
- Phase 5C can expand map UI presentation without changing ship simulation by consuming `getCivilianMapData()`.
- Security/reputation penalties for civilian losses are intentionally not applied here; the event is returned and kill-feed recorded for later systems to consume.

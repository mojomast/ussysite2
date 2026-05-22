# Build Mission UI

Phase 4 Build Agent 4B output note.

## Files Changed

- `index.html` and `web/out/index.html`
- `index.css` and `web/out/index.css`
- `js/input.js` and `web/out/js/input.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/flight/missionUI.js` and `web/out/js/flight/missionUI.js`
- `test/mission-ui.test.mjs`
- `docs/expansion-notes/build-mission-ui.md`

## Decisions

- Added a dedicated mission-board overlay instead of extending the message-system board.
- Kept DOM rendering and board actions in `js/flight/missionUI.js`; mission generation and acceptance still use `generateMissionsForStation()` and `acceptMission()` from the core module.
- `B` toggles the overlay. It opens only while landed/docked at a station definition with `hasMissions: true`; failed opens report `NO MISSION BOARD AVAILABLE` through HUD status/kill feed.
- The board caches generated missions per station/day in `traderState.missionBoard.boardCache` and renders the first three `ACTIVE` missions in the sidebar.
- Opening sets `flightState.missionBoardOpen`, `missionBoardStationId`, and `selectedMissionId`. If a future `flightState.paused` field exists, the UI toggles it, but there is no current full pause system to integrate with.

## Tests

- Added `test/mission-ui.test.mjs` for open gating, card detail selection, active sidebar updates after accept, and the active mission cap.

## Handoff Notes

- Phase 6 should replace the local pause-field check with the final top-level pause/menu dispatcher once that system exists.
- Decline is not surfaced in this build because the requested verification set focuses open/select/accept/active cap; `declineMission()` remains available in the mission core.
- Runtime mission completion already refreshes the board/sidebar when progress changes while the overlay is open.

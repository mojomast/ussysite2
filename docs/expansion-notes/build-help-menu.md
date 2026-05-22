# Build Help Menu

Phase 6 Build Agent 6A output note.

## Files Changed

- `index.html` and `web/out/index.html`
- `index.css` and `web/out/index.css`
- `js/input.js` and `web/out/js/input.js`
- `js/flight/help.js` and `web/out/js/flight/help.js`
- `js/flight/hud.js` and `web/out/js/flight/hud.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `test/help-menu.test.mjs`
- `docs/expansion-notes/build-help-menu.md`

## Decisions

- Added a fixed, accessible four-tab help dialog with `CONTROLS`, `HOW TO PLAY`, `UNIVERSE`, and `TIPS & TRICKS` panels.
- Kept controls copy in `js/flight/help.js` aligned to the canonical control set in `docs/expansion-notes/controls-audit.md` instead of deriving ad hoc rows from runtime handlers.
- Populated Universe content directly from `PLANETS`, `STATIONS`, and `JUMP_POINTS` so counts and names track `js/flight/world.js`.
- Used `flightState.pauseReasons` with a `help` reason so help pauses active flight without blindly clearing other pause sources.
- Left rendering, HUD, map input, labels, cursor, and camera interpolation live while paused; simulation systems are skipped in the flight loop.

## Tests

- Added tests for H toggle, Escape close, tab switching, controls rows by category, universe counts, and tips count.
- Verification run covered changed JS syntax checks, all Node tests, runtime mirror diffs, and requested runtime source/output comparisons.

## Handoff Notes

- `P` remains reserved only; no standalone pause menu was added in this build.
- Help uses `z-index: 9900`, above other modal overlays and below the custom cursor guard at `10000`.
- If more pause-capable overlays are added later, use `flightState.pauseReasons` instead of assigning `flightState.paused` directly.

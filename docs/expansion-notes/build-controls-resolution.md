# Build Controls Resolution

Phase 2 Build Agent 2A output note for the next build agent.

## Files Changed

- `js/input.js` and `web/out/js/input.js`
- `js/flight/messages.js` and `web/out/js/flight/messages.js`
- `js/flight/physics.js` and `web/out/js/flight/physics.js`
- `js/flight/state.js` and `web/out/js/flight/state.js`
- `js/economy/trader.js` and `web/out/js/economy/trader.js`
- `index.html` and `web/out/index.html`
- `docs/expansion-notes/controls-audit.md`
- `docs/expansion-notes/help-menu.md`
- `docs/expansion-notes/navigation.md`
- `docs/GAMEPLAY.md`
- `docs/ARCHITECTURE.md`
- `docs/COMBAT_OVERHAUL.md`
- `README.md`

## Decisions

- Moved autopilot from `P` to `Y`, leaving `P` reserved for a future pause/menu overlay.
- Moved throttle hold from `T` to `R`, including the capture-phase assist key path.
- Reserved `T` for future target cycle as a safe no-op; no target cycling behavior was added.
- Moved modal Back choices from `B` to `Escape` with `Backspace` aliases.
- Bound `B` to open the station mission board only while landed/docked and no game message/modal is active.
- Expanded `Escape`/`Backspace` close behavior for current overlays/messages: loadout, inventory, system map, modal Back choices, and generic active game messages.
- Left `H`/`F1` reserved in flight input with a short HUD status only; no full help overlay was added in this build.

## Tests Run

- Passed: `node --check "js/input.js" && node --check "js/flight/messages.js" && node --check "js/flight/physics.js" && node --check "js/flight/state.js" && node --check "js/economy/trader.js"`.
- Passed: `node --check "web/out/js/input.js" && node --check "web/out/js/flight/messages.js" && node --check "web/out/js/flight/physics.js" && node --check "web/out/js/flight/state.js" && node --check "web/out/js/economy/trader.js"`.
- Passed: `diff -r js/flight web/out/js/flight`.
- Passed: `node --test test/*.test.mjs` with 180 tests, 177 passed, 3 skipped.

## Remaining Risks

- `T` target cycle is reserved but not implemented.
- `P` pause/menu and the full `H`/`F1` help menu remain future work.
- Escape close ordering is implemented for current overlays, but future overlays should register with a central dispatcher to avoid drift.

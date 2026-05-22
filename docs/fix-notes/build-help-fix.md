# Build Help Fix

## Changes

- Moved Help overlay Escape ownership from `js/input.js` into `configureHelpMenu()` in `js/flight/help.js`.
- Kept `configureHelpMenu()` DOM wiring focused on initial render, tab listeners, close button, Escape close handling, and a document-scoped initialized guard to avoid duplicate listeners.
- Exported `KEY_MAP` from `js/input.js` and added `getBindingDiscrepancies()` in `js/flight/help.js` to compare runtime binding labels with flat `HELP_CONTROLS` entries.
- Confirmed `index.html` already contains the required help menu shell, tabs, panels, close button, and initial selected state; no markup changes were needed.

## Tests

- Added coverage for Escape closing an open Help menu through `configureHelpMenu()`.
- Added coverage that a second `configureHelpMenu()` call for the same document does not register duplicate listeners.
- Added coverage that `getBindingDiscrepancies()` returns an empty array for the current clean binding/help state.

## Deviations

- Used a `WeakSet` document-scoped initialized guard instead of a permanent module-wide boolean so tests and alternate documents can be configured safely without double-initializing any document.

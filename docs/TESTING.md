# Testing

The project uses Node's built-in `node --test` runner and ES module test files in `test/`.

## Scripts

```text
npm test                  # Node's default test discovery
npm run test:all          # All test/*.test.mjs files
npm run test:combat       # Legacy combat coverage
npm run test:combat:overhaul
npm run test:combat:state
npm run test:economy
npm run test:mission
npm run test:physics
npm run test:orchestrator
npm run test:tts:contract
```

## Gameplay Coverage

`combat-overhaul.test.mjs` covers shield bleedthrough, heat and overheat lockout, adrenaline threshold helpers, enemy stat instantiation, and per-class kill rewards.

`physics.test.mjs` covers pure thrust, reverse thrust, strafe, roll, fuel drain, and zero-fuel thrust no-op behavior with a minimal `THREE.Vector3` stub.

`economy.test.mjs` covers reputation normalization, reputation-aware buy/sell prices, buy/sell mutations, insufficient credit rejection, full cargo rejection, station price variance, and trade pressure.

`mission.test.mjs` covers pure mission creation, objective completion, reward resolution, and abandoned mission clearing.

`combat-state.test.mjs` covers pure combat phase transitions, death detection, and respawn restoration.

## Gaps

The split `js/flight/physics.js`, `navigation.js`, and `mission.js` modules still contain browser-facing stubs for much of the live `main.js` runtime behavior. The current unit tests target newly exported pure helpers so they remain standalone and do not require the full Three.js scene, DOM, audio stack, backend, or network.

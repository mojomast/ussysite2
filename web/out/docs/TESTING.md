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

`combat-overhaul.test.mjs` covers shield bleedthrough, heat and overheat lockout, burst heat sequencing, adrenaline threshold helpers, enemy stat instantiation, and per-class kill rewards.

`physics.test.mjs` covers pure thrust, reverse thrust, strafe, roll, max velocity capping, drag/damping, fuel drain, and zero-fuel thrust no-op behavior with a minimal `THREE.Vector3` stub.

`economy.test.mjs` covers reputation normalization, reputation-aware buy/sell prices, buy/sell mutations, insufficient credit rejection, full cargo rejection, station price variance, and trade pressure.

`mission.test.mjs` covers pure mission creation, objective completion, TTL expiry, reward resolution, and abandoned mission clearing.

`combat-state.test.mjs` covers pure combat phase transitions, death detection, respawn restoration, and orchestrator client-side event gating.

`flight-startup-contract.test.mjs` covers the lazy `ussy` bootstrap contract and the single ESM Three bootstrap markup.

`tutorial-overlay.test.mjs` covers pointer-lock relock ordering when the first-flight controls overlay closes.

`space-ambience.test.mjs` covers deterministic bounded region styling for recycled flight ambience particles.

## Resolved Review Gaps

The 9562424 coverage review gaps are now covered by standalone unit tests:

- Burst weapon heat sequences: full burst heat, mid-burst overheat cutoff, cooldown to zero, and separate weapon state independence.
- Velocity cap and drag: repeated thrust cap enforcement, monotonic damping, and near-zero velocity sign safety.
- Mission TTL expiry: active mission expiry, inactive expired state, and completed mission immunity from later expiry checks.
- Orchestrator client-side gating: 45-second cooldown, low-shield combat block, and `SILENCE` shield-gate bypass.
- Dead to respawn transition: zero hull death, positive hull survival, max hull/armor/shield/fuel restoration, and `IDLE` phase reset.

## Skipped Tests

The three skipped tests remain intentionally opt-in live/integration checks; none were resolved by this pure unit-test pass:

- `test/tts-backend.test.mjs`: live backend TTS smoke request requires `OPENROUTER_LIVE_TTS`.
- `test/tts-radio-contract.test.mjs`: model validation requires `OPENROUTER_VALIDATE_MODELS`.
- `test/orchestrator.test.mjs`: live orchestrator smoke request requires `ORCHESTRATOR_LIVE`.

## Gaps

The split `js/flight/physics.js`, `navigation.js`, and `mission.js` modules still contain browser-facing stubs for much of the live `main.js` runtime behavior. The current unit tests target newly exported pure helpers so they remain standalone and do not require the full Three.js scene, DOM, audio stack, backend, or network.

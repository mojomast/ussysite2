# Surface Motion Investigation

## Scope

- Read `js/flight/surface.js` in full.
- Read `test/surface.test.mjs` in full.
- Investigation only; no code changes beyond this note.

## Exact Line References

- `updateLanding` landing progress advance: `js/flight/surface.js:150`
- `flightState.pos.y` mutation during landing: `js/flight/surface.js:153`
- `onSurface` call from `updateLanding`: `js/flight/surface.js:155`

## Landing Lerp Bug

`updateLanding` advances `surface.landingProgress` as elapsed normalized time at `js/flight/surface.js:150`:

```js
surface.landingProgress = Math.min(1, surface.landingProgress + Math.max(0, dt) / LANDING_SECONDS);
```

It then uses that same cumulative elapsed value as the lerp weight from the current, already-mutated position at `js/flight/surface.js:153`:

```js
flightState.pos.y = flightState.pos.y + (surface.surfaceY - flightState.pos.y) * surface.landingProgress;
```

Let `Y0` be the ship's initial Y, `S` be `surface.surfaceY`, and `t_n` be cumulative `landingProgress` after frame `n`. The current recurrence is:

```text
Y_n = Y_(n-1) + (S - Y_(n-1)) * t_n
Y_n - S = (Y_(n-1) - S) * (1 - t_n)
Y_n = S + (Y0 - S) * product(i = 1..n, 1 - t_i)
```

Correct linear interpolation over elapsed landing time should be:

```text
Y_n = Y0 + (S - Y0) * t_n
Y_n = S + (Y0 - S) * (1 - t_n)
```

The two formulas are only generally equal for the first update or when `t_n` reaches `1`. For three equal one-second updates over `LANDING_SECONDS = 3`, the cumulative progress values are `1/3`, `2/3`, and `1`. If `Y0 = 1500` and `S = 1000`:

```text
Current frame 1: 1500 + (1000 - 1500) * 1/3 = 1333.333
Current frame 2: 1333.333 + (1000 - 1333.333) * 2/3 = 1111.111
Correct at t=2/3: 1500 + (1000 - 1500) * 2/3 = 1166.667
```

So the ship descends too quickly in intermediate frames because the elapsed time scalar is reapplied as a lerp weight against an already-interpolated current position.

## Landing Start Capture

- `surface.startY` does not exist anywhere in `js/flight/surface.js`.
- `beginLanding` captures `surface.surfaceY` at `js/flight/surface.js:136`.
- `beginLanding` does not capture the ship's starting Y position. The relevant setup block is `js/flight/surface.js:131-144`; no `flightState.pos.y` or equivalent start position is stored there.

## Departure Thrust Restoration

- `beginDeparture` currently mutates `flightState.thrust` at `js/flight/surface.js:182` with `flightState.thrust = flightState.thrust || 14`.
- `updateSurface` also mutates `flightState.thrust` at `js/flight/surface.js:221` with `flightState.thrust = flightState.thrust || 14` when departure finishes.
- This does not restore a pre-landing thrust value. It only replaces falsy values with `14`, so a real pre-landing value such as `20` would be preserved only if it survived landing, and a legitimate `0` is treated as missing.
- `beginLanding` disables throttle controls at `js/flight/surface.js:139-140`, but it does not store the previous thrust. If restoration is required, the pre-landing value should be captured in `beginLanding`, before landing locks are applied, using a field such as `surface.preLandingThrust`.
- `beginDeparture` should restore from that captured `surface.preLandingThrust` value rather than using the hard-coded fallback expression.

## Test Coverage

- `test/surface.test.mjs` has a round-trip `NONE -> SURFACE -> NONE` test by behavior at `test/surface.test.mjs:136-149`.
- The test starts from the default `NONE` surface state via `flightState()` at `test/surface.test.mjs:137`, moves to `SURFACE` with `onSurface(state, planet)` at `test/surface.test.mjs:140`, begins departure at `test/surface.test.mjs:141`, advances departure with `updateSurface(state, [planet], 3)` at `test/surface.test.mjs:142`, and asserts final `NONE` at `test/surface.test.mjs:143`.
- It does not exercise the complete approach/orbital/landing path before `SURFACE`; it jumps directly from `NONE` to `SURFACE` by calling `onSurface`.

## `flightState.pos.y` Mutators In `surface.js`

- `updateLanding` mutates `flightState.pos.y` at `js/flight/surface.js:153`.

No other function in `js/flight/surface.js` mutates `flightState.pos.y`.

## `flightState.thrust` Mutators In `surface.js`

- `beginDeparture` mutates `flightState.thrust` at `js/flight/surface.js:182`.
- `updateSurface` mutates `flightState.thrust` at `js/flight/surface.js:221`.

No other function in `js/flight/surface.js` mutates `flightState.thrust`.

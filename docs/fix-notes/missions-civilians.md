# Missions / Civilians Investigation

## Scope

- Read in full: `js/flight/missions.js`, `js/flight/civilians.js`.
- No code changes made outside this note.

## Missions Randomness Audit

### Literal `Math.random()` Occurrences

`js/flight/missions.js` has no literal `Math.random()` calls.

### Seeded RNG / Random Consumption Sites

All mission randomness is threaded through local `rng` functions created by `createRng(seed)`.

| Line | Enclosing function | Random source | Accepts random/rng parameter? | Parameter threaded? |
| --- | --- | --- | --- | --- |
| 39-46 | `createRng(seed)` | Deterministic PRNG seeded from `hashString(seed)` | N/A | Returns `rng` closure used by callers |
| 48-50 | `pick(list, rng)` | `rng()` | Yes, `rng` | Yes, caller supplies `rng` |
| 91-106 | `pickTarget(stationId, type, navGraph, rng)` | `pick(usable, rng)` | Yes, `rng` | Yes, threaded into `pick` |
| 122-132 | `deliveryItem(stationId, targetId, rng)` | `pick(options, rng)`, `rng()` at line 128 | Yes, `rng` | Yes, threaded into `pick` and direct quantity roll |
| 154-194 | `createGeneratedMission(...)` | `createRng(...)` at line 156, then `pick(...)`, `pickTarget(...)`, `rng()` at line 161, `deliveryItem(...)` | No external random parameter; accepts `seed` | Yes internally: one seeded `rng` is passed to helpers |
| 196-220 | `generateMissionsForStation(...)` | `createRng(...)` at line 205, `rng()` at line 206 | No random parameter; accepts `seed` via overloaded args | Partially: top-level count uses seeded `rng`; per-mission randomness is via `seed` passed into `createGeneratedMission` |

### Nested Helpers Calling `Math.random` Without Random Parameter

None found in `js/flight/missions.js`.

### `generateMissionsForStation` Signature / Callers / Seed Status

- Signature at `js/flight/missions.js:196`: `generateMissionsForStation(stationDef = {}, navGraphOrSeed, seedOrNavGraph = 0, traderState = {})`.
- It supports both `(stationDef, navGraph, seed, traderState)` and legacy-looking `(stationDef, seed, navGraph, traderState)` ordering via the `typeof navGraphOrSeed === 'number'` branch at lines 197-202.
- Caller at `js/flight/missionUI.js:93`: `generateMissionsForStation(stationDef, navGraph, seed, traderState)`.
- Seed source at `js/flight/missionUI.js:83-90`: `boardSeed(now = Date.now())`, `Math.floor(now / 86400000)`.
- Mission generation is deterministic for a given station, daily board seed, nav graph, station definition, and trader hidden/declined/completed state.
- Top-level seeded PRNG status: mission board count uses `createRng(`${stationId}:${seed}`)` at lines 205-206; each mission uses `createRng(`${stationId}:${seed}:${slot}:${type ?? 'mission'}`)` at line 156. No unseeded randomness found in missions.

## Civilians Fleet / Timer Audit

### Spawn Entry Point

- Main spawn entry point: `spawnCivilianFleet(options = {})` at `js/flight/civilians.js:290`.
- Called during world creation at `js/flight/state.js:1759`: `spawnCivilianFleet({ THREE, gameRoot, navGraph, flightState })`.
- Called each flight update at `js/flight/state.js:3392`: `spawnCivilianFleet({ THREE, gameRoot, navGraph, flightState, enemies, now: time })`.

### Fleet Cap / Active Count

- Exact fleet cap line: `js/flight/civilians.js:297`: `const cap = Math.min(CIVILIAN_MAX, traffic.maxActive ?? CIVILIAN_MAX, (combatActive || hyperspeed > 5) ? 3 : CIVILIAN_MAX);`
- Exact active-count line: `js/flight/civilians.js:298`: `while (traffic.ships.filter(ship => ship.active && ship.state !== CIVILIAN_STATES.DESTROYED).length < cap) {`
- Cap compares against active non-destroyed ships, not `traffic.ships.length` / fleet array length.
- Because inactive or destroyed ships remain in `traffic.ships`, the array can grow beyond `CIVILIAN_MAX` over time even while the active count stays under cap.

### Deactivation Field

- Ship active field initialized at `js/flight/civilians.js:237`: `active: true`.
- Destroy deactivation at `js/flight/civilians.js:333`: `ship.active = false` in `setDestroyed`.
- Cull deactivation at `js/flight/civilians.js:344`: `ship.active = false` in `cullShip`.
- Disposal delegates to culling at `js/flight/civilians.js:443` and clears the array only when disposing a state object at lines 444-446.

### Fleet Push / Pool Enforcement

- Fleet append count: one `traffic.ships.push(ship)` call at `js/flight/civilians.js:304`.
- Equivalent append/reuse path: none found; inactive ships are not reused by `spawnCivilianFleet`.
- Hard pool enforcement: none found. The only enforcement is active-count-based spawning in the while condition at line 298. There is no `traffic.ships.length < ...` guard and no fixed object pool reuse.

### Dock Timer / Timebase Findings

- Dock duration constant is seconds: `DOCKED_SECONDS = 4` at `js/flight/civilians.js:31`.
- Initial dock timer uses seconds: `dockedUntil: options.dockedUntil ?? DOCKED_SECONDS` at `js/flight/civilians.js:258`.
- Spawn uses seconds-or-zero: line 302 sets `dockedUntil: random() < 0.35 ? DOCKED_SECONDS : 0`.
- Update decrements by `dt` at `js/flight/civilians.js:416`: `ship.dockedUntil -= dt`; this expects `dt` in seconds.
- Arrival reset uses seconds at `js/flight/civilians.js:431`: `ship.dockedUntil = DOCKED_SECONDS`.
- `updateCivilians` receives `now` at line 387 and uses it as a millisecond timestamp for `lastSeenTime` and flee timing (`now + FLEE_DURATION_SECONDS * 1000` at line 413, compared at line 424).
- Caller at `js/flight/state.js:3391` passes `frameDt` as `dt` and `time` as `now`; this is consistent if `frameDt` is seconds and `time` is `performance.now()` milliseconds.
- No `Date.now()` calls exist in `js/flight/civilians.js`. The dock timer itself is `dt`-based, not `Date.now()`/`performance.now()`-based. The mixed-unit risk is localized to `updateCivilians(dt, { now })`: `dt` must remain seconds while `now` must remain milliseconds.

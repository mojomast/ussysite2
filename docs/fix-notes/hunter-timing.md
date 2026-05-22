# Hunter Timing Investigation

Scope: `js/flight/hunters.js` and `test/hunters.test.mjs` were read in full. Caller checks covered source runtime callers plus the generated `web/out` mirror where relevant.

## `nowMs()` Calls And Timestamp Use

- `js/flight/hunters.js:31` defines `nowMs()` as `globalThis.performance?.now?.() ?? Date.now()`. This reads from one of two clock epochs: page-relative monotonic time or wall-clock Unix time.
- `js/flight/hunters.js:62` calls `nowMs()` only as the default parameter for `shouldTriggerIntercept(..., now = nowMs())`; this reads time when callers omit `now`.
- `js/flight/hunters.js:75` reads/compares `traderState.interceptCooldown` against `now`: `(traderState.interceptCooldown || 0) > now`.
- `js/flight/hunters.js:134` calls `nowMs()` only as the default parameter for `triggerIntercept(..., now = nowMs())`; this reads time when callers omit `now`.
- `js/flight/hunters.js:140` reads `now` to build `interceptId`.
- `js/flight/hunters.js:166` sets `traderState.interceptCooldown = now + resolvedTier.cooldownMs`.
- `js/flight/hunters.js:171` sets `flightState.statusUntil = now + 2600`.
- `js/flight/hunters.js:180` calls `nowMs()` only as the default parameter for `checkHunterFlee(..., now = nowMs())`; this reads time when callers omit `now`.
- `js/flight/hunters.js:187` sets `enemy.userData.fleeStartedAt = now`.
- `checkHunterDestroyed` has no `now` parameter and makes no `nowMs()` call.

## Epoch Mismatch Proof

`triggerIntercept` stores cooldown using whatever epoch its `now` argument uses, while `shouldTriggerIntercept` compares the stored value to its own `now` argument.

- Performance epoch example: `performance.now() ~= 80000`.
- Date epoch example requested: `Date.now() ~= 1748000000` (`Date.now()` in JavaScript milliseconds is normally closer to `1748000000000`; the mismatch is even larger at real JS scale).
- If `triggerIntercept` omits `now` and `nowMs()` chooses `performance.now()`, a SCOUT cooldown is stored as `80000 + 300000 = 380000`.
- If a later `shouldTriggerIntercept` call passes Date-epoch `now ~= 1748000000`, line 75 compares `380000 > 1748000000`, which is false, so cooldown is treated as expired immediately.
- If `triggerIntercept` stores Date-epoch time, `1748000000 + 300000 = 1748300000`, and a later `shouldTriggerIntercept` call uses `performance.now() ~= 80000`, line 75 compares `1748300000 > 80000`, which is true for a stale/very long cooldown.

Verdict: the API is epoch-sensitive. Runtime source callers currently pass `performance.now()`-epoch `time`/`now`, but default `nowMs()` and external omitted `now` calls can mix epochs.

## External Callers Passing Or Omitting `now`

Source runtime callers:

- `js/flight/state.js:2595` calls `checkHunterDestroyed(enemy, { combatState, traderState, enemies, addKillFeedEntry })`; no `now` exists for this function.
- `js/flight/state.js:3386` calls `shouldTriggerIntercept(..., now: time)`; passes `now`.
- `js/flight/state.js:3387` calls `triggerIntercept(..., now: time)`; passes `now`.
- `js/flight/state.js:3390` calls `checkHunterFlee(..., now: time)`; passes `now`.
- `js/flight/enemies.js:841` calls `checkHunterFlee(..., now)` after setting `const now = performance.now()` at line 833; passes `now`.

Tests:

- `test/hunters.test.mjs:40`, `:42`, `:46`, `:50` call `shouldTriggerIntercept` with explicit synthetic `now`.
- `test/hunters.test.mjs:61-75` calls `triggerIntercept` with `now: 2000`.
- `test/hunters.test.mjs:92-100` calls `triggerIntercept` with `now: 3000`.
- `test/hunters.test.mjs:114` calls `checkHunterFlee` with `now: 4000`.
- `test/hunters.test.mjs:126` and `:129` call `checkHunterDestroyed` without `now`; no `now` parameter exists.

Generated mirror:

- `web/out/js/flight/state.js:2595`, `:3386`, `:3387`, `:3390` mirror the source calls above.
- `web/out/js/flight/enemies.js:841` mirrors the source `checkHunterFlee(..., now)` call.

No source runtime caller omits `now` for `shouldTriggerIntercept`, `triggerIntercept`, or `checkHunterFlee`.

## `shouldTriggerIntercept` Arrival Marker Bug

- `js/flight/hunters.js:72` sets `combatState.lastNodeArrival = nodeId` inside the `if (!tier)` branch, below the bounty threshold.
- Effect: arriving at a node while bounty is below threshold permanently marks that node as consumed for interception until a different node arrival occurs. If bounty later crosses the threshold while still associated with the same node arrival, line 68 rejects it before tier/cooldown/chance checks.

Correct conditional spec:

- Do not set `lastNodeArrival` when there is no eligible tier.
- Do not set `lastNodeArrival` while cooldown blocks the intercept.
- Do not set `lastNodeArrival` when the node type is disallowed.
- Set `lastNodeArrival = nodeId` only after bounty tier, cooldown, and node type gates pass, immediately before or after the random roll, so the node arrival is consumed only when it was actually eligible to roll.

## Flee/Destroyed Stale Reference Leak

`triggerIntercept` stores strong references to spawned hunter objects in `combatState.activeIntercept.hunters` at `js/flight/hunters.js:165`.

- `checkHunterFlee` clears `combatState.activeIntercept` only when `activeHuntersForIntercept(enemies, combatState.activeIntercept.id).length === 0` at line 192.
- `checkHunterDestroyed` clears it only when remaining active hunters for that intercept are zero at lines 202-204.
- Neither function clears `combatState.activeIntercept.hunters` independently.
- If any hunter from an intercept remains active or a cleanup path deactivates/removes hunters without going through these functions, `combatState.activeIntercept` retains the `hunters` array and all enemy references from that intercept.

Stale reference formula:

- Each retained intercept holds `tier.shipCount` enemy references.
- Maximum current tier size is `HUNTER_TIERS.SQUADRON.shipCount = 3`.
- After `N` retained SQUADRON intercepts, stale references are `3N`.
- After 10 retained SQUADRON intercepts, stale references are up to `3 * 10 = 30`.

The leak is bounded only if every intercept reliably reaches the line 192 or line 204 clear path. Otherwise, references persist through `combatState.activeIntercept.hunters`.

## `triggerIntercept` `enemyPool.push` Boundedness

- `js/flight/hunters.js:151` reuses the first inactive pool item: `enemyPool.find(item => !item?.userData?.active)`.
- `js/flight/hunters.js:153-156` creates a fallback enemy and pushes it only when no inactive enemy exists.
- Per intercept, pushes are bounded by `resolvedTier.shipCount`, currently max 3.
- Across gameplay, total pool growth is bounded only by the maximum simultaneous active enemies/hunters demanded by callers, not by a hard cap in `triggerIntercept` itself.

Verdict: `enemyPool.push` is locally bounded per call but globally unbounded by this function; it relies on normal enemy deactivation/reuse and any external pool limits.

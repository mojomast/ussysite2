# Mission Board Research

## Existing State

Read in full: `js/flight/state.js`, `js/flight/stations.js`, `js/flight/world.js`, `js/flight/autopilot.js`, `js/flight/persist.js`.

`traderState` is exported from `js/economy/trader.js` and currently has this runtime shape:

```js
{
  credits: 1000,
  fuel: 100,
  maxFuel: 100,
  fuelPerSecond: 0.35,
  fuelCostPerUnit: 8,
  cargo: {},
  maxCargo: 20,
  cargoUsed: 0,
  lastTrade: null,
  tradeLog: [],
  docked: false,
  dockedStation: null
}
```

Credits are the canonical spendable balance in `traderState.credits`; combat persistence mirrors them under `combat.credits`. Cargo is a commodity-id to quantity map in `traderState.cargo`, with `maxCargo` and computed `cargoUsed`. Reputation is separate from `traderState`: `reputationState.scores` maps `core`, `creative`, `infrastructure`, `security`, `governance`, and `tools` to `-100..100`; `reputationState.hostile` exists but is not persisted by the current run-state schema.

Existing station/world facts relevant to mission boards:

- `STATIONS`: `relay-7`, `hub-alpha`, and `fort-kova`; all have `hasMissions: true`, and only `hub-alpha` has trading.
- `PLANETS`: `nexus-prime`, `cinder`, `vaultholm`, and `the-breach`; some have `hasStation: true` but mission boards currently route mostly through project/station menus.
- `createStation()` copies `stationId`, `type`, `hasTrading`, `hasMissions`, and `isStation` into `userData`.
- `buildNavGraph(PLANETS, STATIONS)` creates nodes for planets, stations, and jump points, connects local nodes within `NAVGRAPH_LOCAL_RANGE`, and adds nearest jump connections.
- Autopilot uses `flightState.autopilot.targetId`, `route`, `routeIndex`, and `state`; completion is detectable when `updateAutopilot()` sets `state` to `ARRIVED`.

Existing mission behavior in `state.js` is contract based, with `missionState.active`, `contractId`, `contractStepIndex`, `contractProgress`, and one tracked current objective. Contract steps already support `land`, `landDifferent`, `kills`, and `trade`. Kills integrate through `handleEnemyDestroyed()` -> `registerMissionKill(enemy)`. Landings integrate through project landing via `handleMissionLanding(project)` and system station docking via `dockAtSystemStation(stationObject)`, though only project landings currently pass into contract landing logic. Rewards are paid in `completeMissionContract()` with `addCombatCredits()`, optional fuel, and `gainReputation()`.

## Mission Schema

Mission type enum:

```ts
type MissionType = 'BOUNTY' | 'DELIVERY' | 'ESCORT' | 'SCAN' | 'PATROL';
type MissionStatus = 'available' | 'accepted' | 'completed' | 'failed' | 'expired' | 'declined';
```

Mission object, using exactly the requested fields:

```ts
type Mission = {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  issuer: string;
  targetId: string;
  objective: {
    action: 'kill' | 'deliver' | 'escort' | 'scan' | 'patrol';
    current: number;
    required: number;
    targetName: string;
  };
  reward: number;
  reputationReward: {
    faction: 'core' | 'creative' | 'infrastructure' | 'security' | 'governance' | 'tools';
    amount: number;
  };
  timeLimit: number | null;
  status: MissionStatus;
  killTarget: null | {
    classId: string;
    count: number;
    spawned: number;
  };
  deliveryItem: null | {
    commodityId: string;
    name: string;
    qty: number;
    sourceId: string;
    destinationId: string;
  };
  acceptedAt: number | null;
};
```

Field notes:

- `id`: deterministic from station, day, counter, type, and target, for stable board refreshes.
- `title`: short uppercase-friendly label for list rows.
- `description`: full detail panel copy.
- `type`: one of `BOUNTY`, `DELIVERY`, `ESCORT`, `SCAN`, `PATROL`.
- `issuer`: station id or station display name; station id is better for persistence.
- `targetId`: nav graph node id for the primary destination or combat zone.
- `objective`: normalized progress block, independent of type-specific optional fields.
- `reward`: credits paid to `traderState.credits` through the existing `addCombatCredits()` path.
- `reputationReward`: faction and amount passed to `gainReputation()`.
- `timeLimit`: seconds from `acceptedAt`, or `null` for untimed contracts.
- `status`: lifecycle state, distinct from existing one-active `missionState.active`.
- `killTarget`: only non-null for `BOUNTY`, combat leg of `ESCORT`, and hostile `PATROL` variants.
- `deliveryItem`: only non-null for `DELIVERY`; use commodity ids from `COMMODITIES`.
- `acceptedAt`: `performance.now()` timestamp when accepted, or `null` while available.

## UI Overlay

Use a true overlay instead of extending the current `game-message-system` text wall. The board should open from station services when docked at a body with `hasMissions`, and close back to the station menu. Accept and decline are explicit actions in the detail panel. Active sidebar should show at most 3 accepted missions.

ASCII wireframe:

```text
+--------------------------------------------------------------------------------+
| [MISSION BOARD] HUB-ALPHA                                      CREDITS 1250CR   |
|--------------------------------------------------------------------------------|
| CONTRACT FEED                         | DETAIL PANEL                            |
|---------------------------------------|-----------------------------------------|
| > BOUNTY  Rogue Scanner Pack          | Rogue Scanner Pack                      |
|   FORT-KOVA -> JP-OUTER    320CR +6   | TYPE: BOUNTY                            |
|                                       | ISSUER: HUB-ALPHA                       |
|   DELIVERY  Devplans Relay            | TARGET: OUTER JUMP GATE                 |
|   HUB-ALPHA -> RELAY-7     180CR +4   |                                         |
|                                       | Destroy 3 scout-class raiders reported  |
|   SCAN  Breach Signal                 | near the target lane.                   |
|   HUB-ALPHA -> THE-BREACH  140CR +3   |                                         |
|                                       | Objective: 0/3 kills                    |
|   PATROL  Inner Ring Sweep            | Reward: 320CR                           |
|   HUB-ALPHA -> JP-INNER    210CR +5   | Reputation: security +6                 |
|                                       | Time Limit: 08:00                       |
|---------------------------------------|-----------------------------------------|
| ACTIVE CONTRACTS (MAX 3)              | [ACCEPT CONTRACT] [DECLINE] [CLOSE]     |
| 1. Delivery Run       0/1             |                                         |
| 2. Patrol Sweep       1/3             |                                         |
| 3. Empty Slot                         |                                         |
+--------------------------------------------------------------------------------+
```

Suggested DOM structure:

- `#mission-board-overlay` as fixed full-screen overlay, hidden by default.
- `.mission-board-panel.hud-panel.hud-interactive` for the main shell.
- `.mission-board-list` for generated rows.
- `.mission-board-detail` for selected mission details.
- `.mission-board-actions` for accept, decline, close.
- `.mission-active-sidebar` for accepted missions, capped to first 3 non-terminal entries.

Reuse existing CSS variables and panel styles from `index.css`:

- Colors: `--bg-deep`, `--bg-dark`, `--bg-glass`, `--cyber-cyan`, `--cyber-yellow`, `--cyber-green`, `--cyber-pink`, `--cyber-purple`, `--border-cyan`, `--text-primary`, `--text-muted`, `--text-cyan`, `--text-green`.
- Fonts: `--font-display`, `--font-mono`, `--font-sans`.
- Base panel class: `.hud-panel` for glass panel background, borders, corner ticks, and hover/focus behavior.
- Interaction patterns: `.game-message-choice` for action-button behavior, `.available-objective-card` for row-card styling, `.objective-start-btn` for compact CTA styling, `.objectives-panel`/`.available-objectives-list` for scrollable objective list behavior.
- For active sidebar, borrow `.nav-panel` placement if it floats in flight view, or `.hud-panel` plus `.mini-meter` if embedded in the board.

## Procedural Generation Algorithm

Seed source: `stationId + dailyCounter`, where daily counter is a day number such as `Math.floor(Date.now() / 86400000)`. Include slot index so each station/day produces multiple stable missions.

Algorithm:

1. Build a deterministic PRNG from `hash(`${stationId}:${dailyCounter}:${slot}`)`.
2. Resolve `stationNode = getNavNode(navGraph, stationId)`; if missing, fallback to nearest station or first graph node.
3. Build candidate targets from `navGraph.values()` excluding `stationId`; prefer reachable targets by calling `findRoute(navGraph, stationId, node.id)`.
4. Weight target candidates by node type and route distance: stations/planets for delivery and scan, jump points for patrol, distant station/planet nodes for escort, any reachable non-origin node for bounty.
5. Pick type from weighted list using station type: military favors `BOUNTY`/`PATROL`, hub favors `DELIVERY`/`ESCORT`, outpost favors `SCAN`/`PATROL`.
6. Compute route distance from summed nav graph edge distances; scale reward by mission type, route length, kill count, and time pressure.
7. Select faction from station/project category when available; for standalone stations, map `fort-kova` to `security`, `hub-alpha` to `infrastructure` or `tools`, `relay-7` to `tools`.
8. Build mission id as `mb-${stationId}-${dailyCounter}-${slot}-${type.toLowerCase()}-${targetId}`.
9. Generate objective payload:
   - `BOUNTY`: `objective.action = 'kill'`, `required = 2..5`, `killTarget = { classId, count, spawned: 0 }`.
   - `DELIVERY`: `objective.action = 'deliver'`, `required = qty`, `deliveryItem` from non-black-market `COMMODITIES`, target is destination.
   - `ESCORT`: `objective.action = 'escort'`, target is destination; optional `killTarget` for ambush cleanup.
   - `SCAN`: `objective.action = 'scan'`, `required = 1`, target is planet, station, or anomaly-like node.
   - `PATROL`: `objective.action = 'patrol'`, `required = 2..4`, route waypoints from adjacent graph nodes around target.
10. Return 4-6 available missions per station/day; filter out declined/completed ids stored in state.

Pseudo-code:

```js
function generateMissionBoard(stationId, dailyCounter, navGraph) {
  const count = 4 + (hash(`${stationId}:${dailyCounter}`) % 3);
  return Array.from({ length: count }, (_, slot) => {
    const rng = seededRandom(`${stationId}:${dailyCounter}:${slot}`);
    const type = pickTypeForStation(stationId, rng);
    const target = pickReachableTarget(stationId, type, navGraph, rng);
    const route = findRoute(navGraph, stationId, target.id) || [stationId, target.id];
    return buildMission({ stationId, dailyCounter, slot, type, target, route, rng });
  });
}
```

## Completion Triggers

Combat kills:

- Integrate at `handleEnemyDestroyed(enemy)` after `recordCombatKillStats()` and before generic respawn decisions.
- If an accepted mission has `status === 'accepted'`, `type === 'BOUNTY'` or a non-null `killTarget`, and enemy class matches or class is unrestricted, increment `mission.objective.current`.
- For mission-spawned enemies, tag `enemy.userData.missionBoardMissionId` and count only matching kills.
- On reaching `objective.required`, call mission completion and reward flow.

Autopilot arrivals:

- Track previous autopilot state each tick. When `flightState.autopilot.state` transitions to `ARRIVED`, inspect `flightState.autopilot.targetId`.
- If an accepted `SCAN`, `PATROL`, `ESCORT`, or `DELIVERY` mission has matching `targetId`, progress arrival objective.
- For `DELIVERY`, also require `deliveryItem` cargo in `traderState.cargo` before completion; decrement cargo only on successful delivery.
- For `PATROL`, store waypoint progress outside the requested mission schema in state, or encode current/required route progress in `objective` and compare target/waypoint ids.

Docking and landing:

- Project landing already routes through `handleMissionLanding(project)` for current contracts; mission board should add a system-station path in `dockAtSystemStation(stationObject)` for `stationId` targets.
- Delivery completion should trigger on docking/arrival at `deliveryItem.destinationId`; if the player is carrying the required commodity qty, remove it and complete.
- Scan can complete on arrival within autopilot threshold or docking; no trade required.

Rewards:

- Credits: use `addCombatCredits(mission.reward)` so HUD feedback remains consistent.
- Reputation: use `gainReputation(mission.reputationReward.faction, mission.reputationReward.amount)`.
- Mission status: set `completed`, clear from active list or keep in completed history.
- Save after completion via existing run-state save path.

Failure/expiry:

- Each tick, if `timeLimit !== null` and `performance.now() - acceptedAt > timeLimit * 1000`, set `expired` or `failed`.
- Decline from the board sets `declined` for the current daily board so the row disappears until next daily seed.

## New Fields

Minimal new `flightState` fields:

```js
flightState.missionBoardOpen = false;
flightState.missionBoardStationId = null;
flightState.selectedMissionId = null;
flightState.lastAutopilotState = 'IDLE';
flightState.lastAutopilotArrivalTargetId = null;
```

Minimal new `traderState` fields:

```js
traderState.missionBoard = {
  dailyCounter: 0,
  accepted: [],
  completedIds: [],
  declinedIds: [],
  boardCache: {}
};
```

Persistence additions for `persist.js`:

- Add `trader.missionBoard` to `buildRunState()` with accepted missions, completed ids, declined ids, and daily counter.
- Validate accepted mission objects against the schema, especially type enum, status, numeric reward, and nullable optional payloads.
- Restore into `traderState.missionBoard` in `applyRunState()`.
- Keep generated `boardCache` optional; stable procedural ids mean only accepted/completed/declined state must persist.

Alternative location: put mission board state under `flightState.missionBoard` if it is considered flight-session-only. Persisted accepted missions are more naturally trader/career state, so `traderState.missionBoard` is the better long-term home.

## Implementation Fit

Smallest integration path:

- Add a new mission-board module that exports generation, accept/decline, render, and progress helpers.
- Open from existing station menu `MISSION BOARD` choices, replacing or sitting next to `showFactionMission(projectId)`.
- Reuse existing objective HUD by projecting the first accepted mission into `missionState.currentObjective`, while the sidebar displays up to 3 accepted missions.
- Do not replace existing tutorial/orchestrator contract code in phase 1; bridge mission-board completion through the same reward functions.

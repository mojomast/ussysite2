# Architecture

## Module Graph

```text
index.html
  -> projects.js
  -> js/main.js
       -> js/engine/core.js
       -> js/engine/nodes.js
       -> js/engine/scene.js
       -> js/engine/starfield.js
        -> js/economy/trader.js
        -> js/flight/mission.js
        -> js/flight/orchestrator.js
             -> js/tts/engine.js

js/flight/state.js
  -> flight integration, mission/director wave spawns, camera roll application

js/flight/combat-state.js
  -> combat loadout, skills, kill streaks, session stats, debrief queue

js/flight/loadout.js
  -> dock loadout panel rendering, weapon buy/equip, armor and shield service actions

js/flight/world.js
  -> canonical project-backed planet, station, jump point, world radius, LOD, hyperspeed constants, and worldToThree coordinate conversion

js/flight/starfield.js
  -> 8,000-point flight-system starfield generation and disposal

js/flight/planets.js
  -> planet LOD groups, atmosphere shells, body placement, nearest-body lookup

js/flight/stations.js
  -> primitive station builders, station placement, rotation update, proximity docking constant

js/flight/navgraph.js
  -> Map-based navigation graph builder and A* route lookup over planets/stations/jump points

js/flight/autopilot.js
  -> route plotting, autopilot state machine, hyperspeed movement, star-stretch VFX, system map drawing

js/flight/surface.js
  -> planet approach/orbital/landing/surface/departure state machine and service lookup

js/flight/missions.js
  -> mission schema, deterministic station board generation, progress, completion, expiry

js/flight/missionUI.js
  -> mission board overlay rendering, acceptance flow, active mission sidebar, pause integration

js/flight/civilians.js
  -> civilian fleet spawning, route transit, docking/flee/destruction behavior, map contacts

js/flight/hunters.js
  -> bounty thresholds, hunter factions, intercept spawning, flee/destroy bounty updates

js/flight/help.js
  -> four-tab pilot manual content, tab controls, pause integration

js/flight/settings.js
  -> canonical settings state, validation, hash cfg serialization, and live application hooks

js/ui/settings-menu.js
  -> injected six-tab settings overlay using configured runtime dependencies

js/flight/tutorial-overlay.js
  -> first-flight controls reference overlay and tutorialOverlayDismissed preference writes

js/flight/enemies.js
  -> enemy pools, formation roles, movement, projectile collision, debrief trigger

js/flight/debrief.js
  -> post-combat overlay rendering and dismissal

js/engine/*, js/flight/*, js/ui/*
  -> module boundaries for scene, flight, HUD, mission, messages, and UI code
```

`main.js` is the integration point. It binds DOM input, runs animation, and wires modular scene, node registry, mission, trader, combat, and orchestrator systems into the existing flight loop.

## Flight Data Flow

```text
user input -> updateFlight physics -> combat objects -> objective/mission state -> orchestrator poll -> game messages -> TTS
```

Keyboard and mouse events mutate `flightState`. The animation loop applies physics, combat, navigation, surface checks, station docking, mission progress, civilian traffic, bounty hunter intercepts, objective progression, HUD updates, and radio messages. Flight assists are stateful: static throttle stores `throttleEnabled` and `throttleLevel`, match-speed stores `matchSpeedActive`, `matchSpeedTarget`, and `matchSpeedUntil`, and combat evasion uses `combatState.evasionCooldown` plus `flightState.cameraRollTarget` / `cameraRollCurrent` for the cockpit roll effect.

`flightState.autopilot` is now an object, normalized by `ensureAutopilotState(flightState)`. Its shape is:

| Field | Type | Purpose |
| --- | --- | --- |
| `state` | `'IDLE'|'PLOTTING'|'ENGAGED'|'DECELERATING'|'ARRIVED'` | Current route/autopilot state. Active travel states are plotting, engaged, and decelerating. |
| `targetId` | `string|null` | Final navigation graph node id. |
| `targetPos` | `Vector3`-like/null | Cloned final target position for fallback if graph data is missing. |
| `route` | `string[]` | Ordered navigation graph node ids returned by A*. |
| `routeIndex` | `number` | Current waypoint index in `route`. |
| `hyperspeedMult` | `number` | Current effective travel multiplier, clamped by movement logic. |
| `hyperspeedTarget` | `number` | Desired multiplier: `80` during cruise and `1` during deceleration/arrival. |
| `arrivalThreshold` | `number` | Arrival radius in system units; default `200`. |
| `blockedReason` | `string|null` | Last failure/interruption reason shown in HUD/status. |
| `plotStartedAt` / `engagedAt` | `number` | Timing stamps for plotting delay and engagement. |

Combat kills update `combatState.killStreakCount`, `killStreakTimer`, `killStreakMultiplier`, `lastKillTime`, and `peakKillStreak`. The cockpit combat log uses `combatState.killFeed` as a four-entry runtime ring buffer and `killFeedDirty` to throttle DOM rerenders in `js/flight/hud.js`. Runtime sortie counters track `sessionKills`, `sessionCredits`, `sessionXp`, `shotsFired`, and `shotsHit`; when a wave clears, `debriefPending` and `debriefData` hand a snapshot to `js/flight/debrief.js`. Boss runtime fields live on `combatState.bossActive`, `bossEnemyRef`, and `bossThresholdIdx`, with `BOSS_SCORE_THRESHOLDS` defining the one-time score gates. `combatState.activeBountyHunter` and `activeFriendlyEscort` prevent duplicate security reputation consequence spawns, while `combatState.activeIntercept` stores the current expansion bounty hunter group. `combatState.activeTurrets` tracks gunboat turret pool entries and is cleared by reset/deactivation.

`flightState.surface` is owned by `surface.js` and uses `NONE`, `APPROACH`, `ORBITAL`, `LANDING`, `SURFACE`, and `DEPARTURE`. `flightState.civilianTraffic` stores the runtime civilian fleet. `flightState.pauseReasons` is the shared pause-source collection used by overlays such as help and the mission board; code should add/remove reasons rather than directly clobbering `flightState.paused`.

## Space Visuals

`js/engine/scene.js`, `js/engine/core.js`, `js/engine/starfield.js`, and `js/engine/nodes.js` own scene construction, holographic core visuals, deep-space backgrounds, and shared node registries. `js/engine/renderer.js` configures the WebGL renderer with ACESFilmic tone mapping, SRGB output, and a settings-controlled pixel-ratio override. `state.js` adds a guarded `EffectComposer` pipeline with `RenderPass` and `UnrealBloomPass`; `prefersReducedMotion` or the manual reduced-motion setting keeps bloom strength at zero and renders through the direct renderer path. `main.js` still orchestrates flight-specific updates and project graph behavior. Project nodes now sit at the same fixed world-space coordinates as their project-backed planet definitions from `USSY_PROJECTS[].planet.pos`; flight mode changes visual scale and halos only, not node position. Invisible raycast spheres remain in `projectHitTargets` and scale with the visible planet radius so clicks still resolve the same project objects.

The expanded system adds world objects from `js/flight/world.js`: 23 `PLANETS` entries backed by `USSY_PROJECTS`, three standalone `STATIONS`, and three `JUMP_POINTS` inside `SYSTEM_RADIUS = 50000`. `worldToThree(posArray, THREE)` is the authoritative coordinate converter; project nodes, planet meshes, surface proximity, nav graph nodes, starfield exclusion zones, station placement, HUD nearest-body lookup, and persisted position/nearest-body restore all share the same world-space coordinates. `createStarfield()` builds an 8,000-point static backdrop inside `STARFIELD_RADIUS = SYSTEM_RADIUS * 1.8`, with white/blue/warm brightness tiers and planet exclusion zones. `createAllPlanets()` creates `THREE.LOD` planet bodies plus additive atmosphere shells. `createAllStations()` builds three primitive station silhouettes: outpost, trading hub, and military base.

System LOD constants are exported by `world.js` and consumed primarily by planet rendering:

| Constant | Value | Use |
| --- | ---: | --- |
| `LOD_NEAR` | `800` | Near-body threshold reserved for close-range LOD decisions. |
| `LOD_MID` | `8000` | Planet mid LOD switch; `planets.js` uses `16 x 12` sphere geometry from this distance. |
| `LOD_FAR` | `40000` | Planet far LOD switch; `planets.js` uses `6 x 4` sphere geometry from this distance. |

Actual planet LOD levels are `48 x 32` at distance `0`, `16 x 12` at `LOD_MID`, and `6 x 4` at `LOD_FAR`, with a separate `radius * 1.04` BackSide atmosphere shell attached to the LOD group.

Project node rendering uses `MeshStandardMaterial` on the high-detail LOD, keeps lower LODs on lightweight basic/sprite materials, and uses a Fresnel `ShaderMaterial` glow shell instead of an inverted BackSide approximation. Core node-to-origin lines are batched into a single `LineSegments` geometry, while relationship edges remain a separate batched `LineSegments` mesh with dirty-flagged position buffer updates and a material opacity pulse.

Flight mode adds camera-relative depth cues only while `isFlightActive` is true: three existing `THREE.Points` star layers use different parallax factors, one `InstancedMesh` debris field recycles up to 300 low-poly rocks around the ship, and one `BufferGeometry` dust stream recycles up to 600 particles ahead of the camera. Debris writes `instanceMatrix.needsUpdate` once after the per-instance update loop. Nebula sprites are static additive canvas-gradient backdrops.

Weapon VFX use fixed pools: four muzzle lights, six impact rings, four death explosions, long sci-fi laser trail line buffers, and missile exhaust particle buffers. Pool exhaustion logs a warning instead of allocating or throwing, and frame-lifetime updates return objects to the pool automatically. Enemy movement records per-tick velocity on `enemy.userData.velocity` so HUD lead prediction and match-speed assist can use the same combat-object data. Formation roles are assigned on spawn: `aggressor` steers directly toward the player, `flanker` steers toward a side-offset orbit target, and `support` holds longer range. Elites that are not support units add a `flightRight`-relative strafe oscillation after their base role movement.

Enemy pool entries carry visual runtime data in `enemy.userData`: `rotationRate`, `rotationAxis`, `engineGlow`, `phantomPhase`, `spawnApproach`, `modelRoot`, `baseRadius`, `radius`, `cloakUsed`, `cloakUntil`, `splitDone`, `isSplitChild`, and `isTurret`. Boss enemies additionally set `isBoss`, `reward`, `bossPhase`, `bossBurstCount`, `bossFireCooldownMs`, and `lastBossEscortAt`. Security faction variants set `isBountyHunter`, `isFriendly`, `reward`, `teamColor`, `spawnedAt`, `durationMs`, and `nextFriendlyShotAt` on the same pooled objects. `rotationRate` / `rotationAxis` are assigned per spawn and applied to the enemy group after `lookAt()`. `spawnApproach` is set only for delayed spawns and consumed on the first active tick to add a velocity burst and visible lunge toward the player. Turrets reuse pooled enemy objects, keep zero velocity, and skip movement while retaining firing logic.

Engine glow is a pooled `PointLight` attached once in `createEnemyPool()`. `buildEnemyFromClass()` keeps the geometry group as `enemy.children[0]` and reattaches the glow after it, `spawnEnemy()` recolors the light from the resolved enemy class and resets intensity to zero, `updateCombatObjects()` pulses intensity for active visible enemies and boosts it during bursts, and `deactivateCombatObject()` turns it off when the pooled object is recycled. Death handling can briefly spike the light before cleanup and uses the class color for cockpit overlay flash.

## Economy Data Flow

```text
flight loop -> fuel drain -> dock at project node -> trade menu -> traderState -> HUD/TTS
```

Fuel drains while thrusting or using autopilot. Landing calls restock/refuel behavior and opens the station menu. Trade choices reuse the existing message choice system and emit a trade-completed callback so objectives can advance without coupling mission code to market internals. The dock `LOADOUT` choice opens `renderLoadoutScreen(traderState, weaponDefs, combatState, options)` from `js/flight/loadout.js`; it is a visual panel layered over the existing dock message flow and returns to the station menu on close.

## Navigation Graph

`buildNavGraph(planets, stations, jumpPoints)` returns a `Map<string, NavNode>` rather than a plain JSON object. Nodes are created from canonical `PLANETS`, `STATIONS`, and `JUMP_POINTS`; planet node ids match `USSY_PROJECTS`. Positions are resolved through the shared world-space coordinate model, with `worldToThree()` as the converter when Three.js vectors are needed. Edges are bidirectional when nodes are within `NAVGRAPH_LOCAL_RANGE = 15000`, and each jump point also connects to its two nearest graph nodes.

```ts
type NavNode = {
  id: string;
  name: string;
  type: 'planet' | 'station' | 'jump';
  pos: THREE.Vector3;
  edges: Array<{ targetId: string; dist: number }>;
};

type NavGraph = Map<string, NavNode>;
```

`findRoute(graph, fromId, toId)` runs A* with straight-line distance as the heuristic and returns an ordered array of node ids or `null`. `plotCourse()` chooses the nearest graph node to the player as the route origin, stores the route on `flightState.autopilot`, and starts the `PLOTTING` state.

## Surface State

`checkPlanetProximity()` enters `APPROACH` when the ship moves inside `planet.radius * 1.6`. `updateSurfaceState()` advances approach to `ORBITAL` inside `planet.radius * 1.2`, drives the three-second landing/departure lerps, and returns to `NONE` after departure. `getSurfaceServices()` derives planet services without DOM coupling, leaving HUD rendering and service buttons to `hud.js` and `state.js`.

Only the minimal restore shape is persisted: `flight.surface.state` and `flight.surface.planetId`. Distances, progress, exit flags, visual FOV changes, and atmosphere treatment are recomputed at runtime.

## Mission Board

`js/flight/missions.js` is DOM-free. It defines mission status constants, `createMission(overrides)`, station board generation, acceptance caps, progress updates, reward completion, expiry, and serialization-friendly mission records. `js/flight/missionUI.js` owns DOM rendering for the board, selection detail panel, accept controls, active mission sidebar, and `mission-board` pause reason.

Board generation is deterministic by station/seed and filters completed or declined ids from `traderState.completedMissionIds` and `traderState.missionBoard.declinedMissionIds`. Runtime progress is browser-authoritative: nav arrivals, scan proximity, escort/patrol events, and bounty kills update active mission records in `traderState.activeMissions`.

## Civilian And Hunter Runtime

`js/flight/civilians.js` creates non-combatant freighter, shuttle, and courier entries with `mesh`, `pos`, `vel`, `route`, `currentLeg`, `type`, `homeNodeId`, and `destNodeId`. Civilian fleets are capped, reduced during combat/hyperspeed, culled beyond far LOD, and rendered on the system map, but they are never persisted.

`js/flight/hunters.js` maps bounty levels to `SCOUT`, `WING`, or `SQUADRON` tiers at `500`, `1500`, and `3000`. Active intercepts are spawned on eligible node arrivals, disengage autopilot, mark pooled enemies as hunters, update `traderState.bountyLevel` on flee/destroy outcomes, and draw hunter contacts on the system map. `combatState.activeIntercept` is runtime-only.

## Audio Data Flow

```text
/api/tts audio -> ttsEngine.speak() or combatAudio.bark() -> Web Audio radio chain -> speakers
```

Mission comms and short barks use separate scheduling channels, but both route through the same radio filter chain before playback. `gameSettings` in `js/flight/audio.js` delegates to `settingsState`, so volume and TTS enabled values have one canonical store. Backend TTS accepts `audio/*` and Kokoro-compatible `application/octet-stream` responses; combat barks fall back to browser speech synthesis if backend audio is unavailable or cannot be decoded. The system map owns the in-flight `M` key; `Shift+M` keeps the quick TTS mute toggle.

## Settings UI

`js/flight/settings.js` exports `DEFAULT_SETTINGS`, mutable `settingsState`, `loadSettings(hashString)`, `saveSettings()`, `applySettings(deps)`, and `resetSettings()`. Settings are encoded as base64 JSON in the URL hash `:cfg:` slot and are not written to `localStorage`. `applySettings()` receives dependency-injected setters from `state.js` for audio volumes, backend TTS, bloom strength/threshold/radius, pixel ratio, and mouse sensitivity; it uses `deps.documentRef` to write the `--hud-scale` CSS variable.

`js/ui/settings-menu.js` injects `#settings-menu` on configuration and exposes `configureSettingsMenu(deps)`, `openSettingsMenu()`, `closeSettingsMenu()`, and `isSettingsMenuOpen()`. The menu has Audio, Graphics, Gameplay, TTS, Controls, and Accessibility tabs; the Graphics tab exposes bloom strength, threshold, radius, pixel ratio, and particle density. Global keyboard routing stays in `js/input.js`, so settings-menu does not register its own Escape listener.

`js/flight/tutorial-overlay.js` injects `#tutorial-overlay` and exposes `configureTutorialOverlay(deps)`, `showTutorialOverlay()`, `hideTutorialOverlay()`, and `isTutorialOverlayVisible()`. `enterFlightMode()` shows it after startup messages when `gameOrchestrator.tutorialComplete` is false and `settingsState.tutorialOverlayDismissed` is false. It does not pause the game loop.

## Objectives And Missions

The flight HUD has a persistent objectives panel with `Current` and `Available` tabs. `O` toggles those tabs while flying. The current objective is stored in `missionState.currentObjective`; built-in multi-step contracts, mission state creation, and mission persistence helpers live in `js/flight/mission.js`.

Tutorial startup is choice-based. The player can run the guided tutorial or enter free roam immediately with the director enabled. The tutorial sequence is combat, landing, buy cargo, fly to a second market, then sell cargo. Free roam enables optional contracts such as patrol, trade route, and survey objectives.

Objective progression is browser-authoritative. Kills advance kill objectives, landing advances route objectives, and trader callbacks advance buy/sell objectives. The director may add temporary current objectives for distress, bounty, or combat events, but the local game loop remains responsible for resolving them.

## Persistence

The URL hash save format remains backward-compatible as `#save:<combat>:cr:<credits>:rep:<reputation>:ms:<mission>:cfg:<settings>`. Combat serialization persists XP, skills, loadout, owned weapons, ammo, missiles, fuel, and fuel-depleted state. Mission serialization persists tutorial/free-roam completion, active step, kill progress, objective view/current objective, contract progress, and generated faction contract definitions. The `:cfg:` slot stores settings from `js/flight/settings.js` as base64 JSON. Kill streaks, wave announcements, shot accuracy, and debrief data are runtime-only and are reset on new sorties or respawn.

`js/flight/persist.js` owns session run-state persistence via `sessionStorage` key `ussysite2.runState.v1`. It exports `saveRunState(combatState, traderState, reputationState, skillTree, options)`, `loadRunState()`, `clearRunState()`, and `applyRunState(data, combatState, traderState, reputationState, skillTree, options)`. The storage key is unchanged, but the active payload schema is now `v: 3`; `loadRunState()` rejects old `v: 1` payloads and migrates `v: 2` payloads to v3 defaults.

Schema v3 keeps the v2 combat/reputation/skills fields and formalizes mission, bounty, and surface persistence:

| Field | v2 | v3 |
| --- | --- | --- |
| `v` | `2` | `3` |
| `ts` | Saved timestamp | Saved timestamp |
| `combat` | Score, wave, credits, hull, shields, boss threshold, kill count | Same fields; no active intercept persistence |
| `trader.inventory` | Equipped weapons and inventory item ids | Same fields |
| `trader.activeMissions` | Optional/legacy | Always an array of mission records with minimal validation |
| `trader.completedMissionIds` | Optional/legacy | Always an array of string ids |
| `trader.bountyLevel` | Missing unless custom data existed | Non-negative integer restored to `traderState.bountyLevel` |
| `rep` | Reputation scores | Same fields |
| `skills` | Unlocked skill ids | Same fields |
| `flight.position` | Optional `[x, y, z]` player position | Same field |
| `flight.lastVisitedBodyId` | Optional nearest planet/station id | Same field |
| `flight.autopilotTargetId` | Optional active target id | Same field |
| `flight.surface` | Missing | `{ state, planetId }`, defaulting to `{ state: 'NONE', planetId: null }` |

Apply validates the full payload before assignment and rejects corrupted data such as negative score, wave below one, hull outside `[1,maxHull]`, invalid position arrays, invalid mission arrays, negative bounty, or non-string persisted body/autopilot ids. When `options.flightState` is supplied, v3 applies saved position, last visited body id, surface state, and can re-plot the saved autopilot target if `options.navGraph` and `options.plotCourse` are provided. Civilian fleets and active bounty hunter intercepts intentionally stay transient.

## AI Gameplay Loop

```text
complete tutorial or choose free roam -> gameOrchestrator.tutorialComplete -> sparse pollOrchestrator()
  -> POST /api/orchestrate -> validated event JSON -> fireOrchestratedEvent()
  -> showGameMessage() -> optional choice resolution -> rewards/spawns/navigation
```

`pollOrchestrator()` runs at most once per second from `animate()` and only sends a network request when the tutorial is complete or skipped, no message is active, flight mode is active, and `nextPollAt` has elapsed. This prevents AI events from interrupting mission, trade, or station dialogs.

`gameOrchestrator` tracks whether polling is enabled, whether a request is in flight, the last event ID/time, the next poll timestamp, pending event data, and any bounty reward waiting on enemy cleanup.

| Event Type | Behavior |
| --- | --- |
| `COMBAT` | Spawns hostile ships and sets the HUD status to hostile contact |
| `COMMS` | Radio message with optional choices and rewards |
| `DISTRESS` | Offers respond/ignore; respond sets navigation to a live project node |
| `BOUNTY` | Spawns a wave and pays credits after all bounty enemies are inactive |
| `CONTRABAND` | Offers cargo jettison or refusal; refusal spawns enforcers |
| `ANOMALY` | Flavor anomaly near the project graph with a small fuel reward |
| `SILENCE` | Low-priority atmospheric transmission only |

Choice resolution dismisses the current message, applies any choice-1 credit/fuel reward for non-bounty events, and can show a short outcome transmission. Bounty rewards are tracked separately with `bountyPendingReward` so payment happens after combat completion.

## State Objects

| State | Purpose |
| --- | --- |
| `flightState` | Ship resources, position, velocity, input, nav, landing, view state, throttle/match-speed/evasion fields, and route autopilot object |
| `combatState` | XP/skills/loadout, weapon heat, assist cooldowns, kill streak multiplier, wave metadata, boss threshold/ref fields, faction consequence refs, active bounty intercept, kill feed ring buffer/dirty flag, session stats, debrief queue |
| `missionState` | Current objective, tutorial/free-roam state, multi-step contract progress |
| `gameMessageState` | Active message, typed text, choices, dismissal handler |
| `traderState` | Credits, fuel, cargo, docked station, trade log, active missions, completed mission ids, mission board state, bounty level |
| `gameOrchestrator` | Sparse AI event polling, last event timing, pending event, bounty reward |

## Extending

Add optional contracts by adding entries to `BUILTIN_MISSION_CONTRACTS` in `js/flight/mission.js` with local completion types such as `kills`, `land`, `landDifferent`, and `trade`. Add tutorial-only steps in `setMissionStep()` when they need bespoke messaging. Add commodities in `COMMODITIES` and update `getStationProfile()` rules. Add station profile behavior by mapping project categories or project IDs to production and demand arrays.

## Controls Reference

The canonical control list is exported as `KEY_MAP` in `js/input.js` and mirrored in the Settings Controls tab and Help Controls tab.

## Weapon Definitions

`WEAPON_DEFS` in `js/flight/combat-overhaul.js` is the source of truth for weapon name, type, damage, cooldown, energy cost, ammo cost, projectile speed/life, heat, pellets/spread, missile count, AOE radius, and description. The HUD lead pip reads the equipped primary weapon `projectileSpeed`.

## Loadout Renderer

`renderLoadoutScreen(traderState, weaponDefs, combatState, options)` reads `traderState.credits`, `combatState.primaryWeapon`, `combatState.secondaryWeapon`, and `combatState.ownedWeapons`. It writes bought weapon IDs back into `ownedWeapons`, updates the equipped slot field directly, and uses optional `options.onChange` / `options.onClose` callbacks so dock integrations can refresh HUD credits and restore the station services menu.

## Skill Tree Branches

Skills are grouped into Hull, Shield, Weapons, and Engines. Hull improves armor and point defense, Shield improves max shield/recharge/overcharge, Weapons improve energy/heat/fire cycle/armor piercing, and Engines improve thrust, afterburner, damping, and cold jump.

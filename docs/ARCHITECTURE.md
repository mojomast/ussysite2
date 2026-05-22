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

Keyboard and mouse events mutate `flightState`. The animation loop applies physics, combat, navigation, landing checks, objective progression, HUD updates, and radio messages. Flight assists are stateful: static throttle stores `throttleEnabled` and `throttleLevel`, match-speed stores `matchSpeedActive`, `matchSpeedTarget`, and `matchSpeedUntil`, and combat evasion uses `combatState.evasionCooldown` plus `flightState.cameraRollTarget` / `cameraRollCurrent` for the cockpit roll effect.

Combat kills update `combatState.killStreakCount`, `killStreakTimer`, `killStreakMultiplier`, `lastKillTime`, and `peakKillStreak`. Runtime sortie counters track `sessionKills`, `sessionCredits`, `sessionXp`, `shotsFired`, and `shotsHit`; when a wave clears, `debriefPending` and `debriefData` hand a snapshot to `js/flight/debrief.js`. Boss runtime fields live on `combatState.bossActive`, `bossEnemyRef`, and `bossThresholdIdx`, with `BOSS_SCORE_THRESHOLDS` defining the one-time score gates.

## Space Visuals

`js/engine/scene.js`, `js/engine/core.js`, `js/engine/starfield.js`, and `js/engine/nodes.js` own scene construction, holographic core visuals, deep-space backgrounds, and shared node registries. `main.js` still orchestrates flight-specific updates and project graph behavior. Project nodes render as planet-scale `THREE.LOD` objects with high-detail icosphere, medium icosphere, far sprite impostor, additive BackSide glow shells, and flight-only distant halo sprites. Flight mode switches from the console spiral to a deterministic 3D shell layout with much larger planet spacing, then applies an additional visual multiplier so bodies read at planetary scale while console mode remains readable. Invisible raycast spheres remain in `projectHitTargets` and scale with the visible planet radius so clicks still resolve the same project objects.

Flight mode adds camera-relative depth cues only while `isFlightActive` is true: three existing `THREE.Points` star layers use different parallax factors, one `InstancedMesh` debris field recycles up to 300 low-poly rocks around the ship, and one `BufferGeometry` dust stream recycles up to 600 particles ahead of the camera. Nebula sprites are static additive canvas-gradient backdrops.

Weapon VFX use fixed pools: four muzzle lights, six impact rings, four death explosions, long sci-fi laser trail line buffers, and missile exhaust particle buffers. Pool exhaustion logs a warning instead of allocating or throwing, and frame-lifetime updates return objects to the pool automatically. Enemy movement records per-tick velocity on `enemy.userData.velocity` so HUD lead prediction and match-speed assist can use the same combat-object data. Formation roles are assigned on spawn: `aggressor` steers directly toward the player, `flanker` steers toward a side-offset orbit target, and `support` holds longer range. Elites that are not support units add a `flightRight`-relative strafe oscillation after their base role movement.

Enemy pool entries carry visual runtime data in `enemy.userData`: `rotationRate`, `rotationAxis`, `engineGlow`, `phantomPhase`, `spawnApproach`, `modelRoot`, `baseRadius`, and `radius`. Boss enemies additionally set `isBoss`, `reward`, `bossPhase`, `bossBurstCount`, `bossFireCooldownMs`, and `lastBossEscortAt`. `rotationRate` / `rotationAxis` are assigned per spawn and applied to the enemy group after `lookAt()`. `spawnApproach` is set only for delayed spawns and consumed on the first active tick to add a velocity burst and visible lunge toward the player.

Engine glow is a pooled `PointLight` attached once in `createEnemyPool()`. `buildEnemyFromClass()` keeps the geometry group as `enemy.children[0]` and reattaches the glow after it, `spawnEnemy()` recolors the light from the resolved enemy class and resets intensity to zero, `updateCombatObjects()` pulses intensity for active visible enemies and boosts it during bursts, and `deactivateCombatObject()` turns it off when the pooled object is recycled. Death handling can briefly spike the light before cleanup and uses the class color for cockpit overlay flash.

## Economy Data Flow

```text
flight loop -> fuel drain -> dock at project node -> trade menu -> traderState -> HUD/TTS
```

Fuel drains while thrusting or using autopilot. Landing calls restock/refuel behavior and opens the station menu. Trade choices reuse the existing message choice system and emit a trade-completed callback so objectives can advance without coupling mission code to market internals. The dock `LOADOUT` choice opens `renderLoadoutScreen(traderState, weaponDefs, combatState, options)` from `js/flight/loadout.js`; it is a visual panel layered over the existing dock message flow and returns to the station menu on close.

## Audio Data Flow

```text
/api/tts audio -> ttsEngine.speak() or combatAudio.bark() -> Web Audio radio chain -> speakers
```

Mission comms and short barks use separate scheduling channels, but both route through the same radio filter chain before playback. Backend TTS accepts `audio/*` and Kokoro-compatible `application/octet-stream` responses; combat barks fall back to browser speech synthesis if backend audio is unavailable or cannot be decoded. The in-flight audio settings menu is opened with `M`; `Shift+M` keeps the quick TTS mute toggle.

## Objectives And Missions

The flight HUD has a persistent objectives panel with `Current` and `Available` tabs. `O` toggles those tabs while flying. The current objective is stored in `missionState.currentObjective`; built-in multi-step contracts, mission state creation, and mission persistence helpers live in `js/flight/mission.js`.

Tutorial startup is choice-based. The player can run the guided tutorial or enter free roam immediately with the director enabled. The tutorial sequence is combat, landing, buy cargo, fly to a second market, then sell cargo. Free roam enables optional contracts such as patrol, trade route, and survey objectives.

Objective progression is browser-authoritative. Kills advance kill objectives, landing advances route objectives, and trader callbacks advance buy/sell objectives. The director may add temporary current objectives for distress, bounty, or combat events, but the local game loop remains responsible for resolving them.

## Persistence

The URL hash save format remains backward-compatible as `#save:<combat>:cr:<credits>:rep:<reputation>:ms:<mission>`. Combat serialization persists XP, skills, loadout, owned weapons, ammo, missiles, fuel, and fuel-depleted state. Mission serialization persists tutorial/free-roam completion, active step, kill progress, objective view/current objective, contract progress, and generated faction contract definitions. Kill streaks, wave announcements, shot accuracy, and debrief data are runtime-only and are reset on new sorties or respawn.

`js/flight/persist.js` owns session run-state persistence via `sessionStorage` key `ussysite2.runState.v1`. It exports `saveRunState(combatState, traderState, reputationState, skillTree)`, `loadRunState()`, `clearRunState()`, and `applyRunState(data, combatState, traderState, reputationState, skillTree)`. Schema `v: 1` stores `ts`, `combat` (`score`, `wave`, `credits`, `hull`, `shieldHp`, `maxShieldHp`, `maxHull`, `bossThresholdIdx`, `killCount`), `trader` (`equippedPrimary`, `equippedSecondary`, inventory item IDs), `rep`, and purchased skill IDs from `skillTree.unlocked`. Apply validates the full payload before assignment and rejects corrupted data such as negative score, wave below one, or hull outside `[1,maxHull]`.

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
| `flightState` | Ship resources, position, velocity, input, nav, landing, view state, throttle and match-speed assist state, evasion camera roll fields |
| `combatState` | XP/skills/loadout, weapon heat, assist cooldowns, kill streak multiplier, wave metadata, boss threshold/ref fields, session stats, debrief queue |
| `missionState` | Current objective, tutorial/free-roam state, multi-step contract progress |
| `gameMessageState` | Active message, typed text, choices, dismissal handler |
| `traderState` | Credits, fuel, cargo, docked station, trade log |
| `gameOrchestrator` | Sparse AI event polling, last event timing, pending event, bounty reward |

## Extending

Add optional contracts by adding entries to `BUILTIN_MISSION_CONTRACTS` in `js/flight/mission.js` with local completion types such as `kills`, `land`, `landDifferent`, and `trade`. Add tutorial-only steps in `setMissionStep()` when they need bespoke messaging. Add commodities in `COMMODITIES` and update `getStationProfile()` rules. Add station profile behavior by mapping project categories or project IDs to production and demand arrays.

## Controls Reference

| Key | Action |
| --- | --- |
| `W/S` | Forward/reverse thrust |
| `A/D` | Strafe |
| `Q/E` | Roll ship |
| `T` | Toggle static throttle |
| `Z/X` | Increase/decrease throttle setting |
| `G` | Match nearest target velocity or emergency brake |
| `C` | Evasion roll |
| `Shift+C` | Toggle cockpit/third-person view |
| `F` | Cold jump when unlocked |
| `V` | Set navigation from crosshair |
| `P` | Toggle autopilot |

## Weapon Definitions

`WEAPON_DEFS` in `js/flight/combat-overhaul.js` is the source of truth for weapon name, type, damage, cooldown, energy cost, ammo cost, projectile speed/life, heat, pellets/spread, missile count, AOE radius, and description. The HUD lead pip reads the equipped primary weapon `projectileSpeed`.

## Loadout Renderer

`renderLoadoutScreen(traderState, weaponDefs, combatState, options)` reads `traderState.credits`, `combatState.primaryWeapon`, `combatState.secondaryWeapon`, and `combatState.ownedWeapons`. It writes bought weapon IDs back into `ownedWeapons`, updates the equipped slot field directly, and uses optional `options.onChange` / `options.onClose` callbacks so dock integrations can refresh HUD credits and restore the station services menu.

## Skill Tree Branches

Skills are grouped into Hull, Shield, Weapons, and Engines. Hull improves armor and point defense, Shield improves max shield/recharge/overcharge, Weapons improve energy/heat/fire cycle/armor piercing, and Engines improve thrust, afterburner, damping, and cold jump.

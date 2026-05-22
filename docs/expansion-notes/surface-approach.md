# Planet Surface Approach Research

## Source Files Read

- `js/flight/planets.js`
- `js/flight/world.js`
- `js/flight/state.js`
- `js/flight/autopilot.js`
- `index.html`
- `index.css`

Additional state-definition references checked: `js/input.js`, `js/flight/physics.js`, `js/flight/navigation.js`, `js/flight/combat-state.js`, `js/economy/trader.js`.

## LOD And Approach Radius

- `LOD_NEAR` is exported from `js/flight/world.js` as `800` world units.
- `createPlanet()` adds the high-detail planet mesh at LOD distance `0`, medium at `LOD_MID` (`8000`), and far at `LOD_FAR` (`40000`). `LOD_NEAR` is not currently wired into `createPlanet()`; it is still the right existing world-scale constant for near-planet gameplay triggers.
- Since planet radii vary from `300` to `1200`, a fixed `800` trigger is too small for Vaultholm and equal to Nexus Prime's radius. It would put the player at or inside larger planet surfaces if interpreted as center distance.
- Recommended orbital entry trigger: `planet.radius * 1.6` from planet center.
- Recommended visual/UX approach hint: begin warning/approach affordance around `Math.max(LOD_NEAR, planet.radius * 2.0)` and transition to orbital control at `planet.radius * 1.6`.

Planet radii and suggested orbital entry zones:

| Planet | Type | Radius | `radius * 1.6` |
| --- | --- | ---: | ---: |
| Nexus Prime | `homeworld` | 800 | 1280 |
| Cinder | `hostile` | 500 | 800 |
| Vaultholm | `trading` | 1200 | 1920 |
| The Breach | `anomaly` | 300 | 480 |

For The Breach, clamp to `LOD_NEAR` if the goal is a consistent minimum player-recognizable approach radius. Otherwise `480` is valid as a tight anomaly-skimming zone.

## Current Dock Flow

Current docking is split between project-node landing and system-station proximity docking. Planets are render/navigation bodies only; they do not currently dock or land.

Project-node landing call chain:

```text
KeyL in input.js:onGlobalKeyDown
  -> landOnNearestProject() injected by state.js:configureInput
    -> updateProjectLandingTarget()
      -> flightState.nearestNode / nearestDistance set from visible projectNodes
    -> if nearestDistance > landingRange * activeUniverseScale: status only, no dock
    -> handleMissionLanding(project)
      -> missionHandleMissionLanding(project.id) when missionState.active
      -> handleDirectorLanding(project) otherwise
    -> restockAtProject(project)
      -> skillTree.applyAll(), restore shield/armor/ammo/missiles/energy/fuel, clear heat flags
    -> flightState.landed = true
    -> flightState.currentDockedProject = project
    -> traderState.docked = true
    -> traderState.dockedStation = project.id
    -> saveCurrentRunState({ manual: true })
    -> stop engine hum, start station ambient
    -> flightState.vel.set(0, 0, 0)
    -> selectProject(project.id, false)
    -> document.exitPointerLock()
    -> openStationMenu(project.id) if no active game message
```

System-station proximity dock call chain:

```text
tick() while isFlightActive
  -> updateSystemDocking()
    -> if flightState.landed: return
    -> getNearestBody(flightState.pos, systemStations, DOCK_PROXIMITY)
    -> dockAtSystemStation(nearest.body)
      -> require stationObject.userData.stationId and !flightState.landed
      -> flightState.landed = true
      -> flightState.vel.set(0, 0, 0)
      -> flightState.currentDockedProject = null
      -> traderState.docked = true
      -> traderState.dockedStation = stationId
      -> flightState.status = DOCKED AT ...
      -> stop engine hum, start station ambient
      -> document.exitPointerLock()
      -> openStationMenu(stationId) if no active game message
      -> updateFlightHud(true)
```

Dock UI transition:

```text
openStationMenu(projectId or stationId)
  -> showGameMessage({ type: 'STATION SERVICES', choices: RESTOCK/EQUIPMENT/CARGO MARKET/MISSION BOARD/DISMISS })

openTradeMenu(projectId)
  -> traderState.docked = true
  -> traderState.dockedStation = projectId
  -> showGameMessage({ ui.layout = 'dock-grid', footerChoices: UNDOCK, choices: TRADE HUB/REFUEL/CARGO HOLD/SHIPYARD/LOADOUT/MISSIONS })
```

Undock call chain:

```text
Trade UI UNDOCK choice
  -> trader.js:undockFromStation(projectId)
    -> traderState.docked = false
    -> traderState.dockedStation = null
    -> dismissGameMessageRef()
    -> onUndockRef(projectId)
      -> state.js:undockFromTradeMenu()
        -> flightState.landed = false
        -> flightState.currentDockedProject = null
        -> resetFlightAssistState()
        -> handleFlightUndock()
          -> stop station ambient, start engine hum
        -> flightState.status = UNDOCKED...
        -> updateFlightHud(true)
        -> saveCurrentRunState({ manual: true })
```

Pointer-lock implicit undock:

```text
input.js:onPointerLockChange
  -> if flightState.pointerLocked and flightState.landed: onUndock()
  -> flightState.landed = false
  -> flightState.status = MOUSELOOK ... VIEW
```

Primary state fields gating dock/UI:

- `isFlightActive`: global mode gate in `state.js`; all flight ticks/docking only run while active.
- `flightState.landed`: hard gate for flight physics, station docking, autopilot, HUD dock styling, station-menu hotkeys, and implicit undock.
- `flightState.currentDockedProject`: set for project-node landing, cleared for standalone station docking and undock.
- `traderState.docked`: economy/orchestrator docked flag.
- `traderState.dockedStation`: current dock/service station id used by trade, missions, orchestrator payloads, and hotkeys.
- `gameMessageState.active`: blocks auto-opening dock menus and orchestrator polling while a message is active.
- `flightState.pointerLocked`: pointer recapture can undock.
- `flightState.nearestNode` and `flightState.nearestDistance`: gate project-node landing.

## Proposed Orbital Entry State Machine

```text
NONE
  | player enters approach hint radius, nearest planet selected
  v
APPROACH
  | distance <= planet.radius * 1.6
  v
ORBITAL
  | player commits land / holds landing input / mission requires surface
  v
LANDING
  | landing timer/path complete, surface services initialized
  v
SURFACE
  | player selects depart / closes surface terminal
  v
DEPARTURE
  | departure impulse clears orbital radius or timer complete
  v
NONE

Any state
  | target lost, player cancels, hostile interdiction, critical hull, jumps away
  v
NONE or DEPARTURE depending on immersion needs
```

State behavior:

| State | Behavior |
| --- | --- |
| `NONE` | Normal flight, combat, autopilot, station/project docking unchanged. Track nearest planet passively only. |
| `APPROACH` | Show HUD affordance and planet name/type. Do not seize controls. Optional speed warning. Autopilot should begin decel if target is this planet. |
| `ORBITAL` | Enter orbital control band at `planet.radius * 1.6`. Limit direct radial plunge, damp velocity, show orbital services/contact options. Block hyperspeed and station auto-dock. Combat can either be disabled or converted to orbital encounters. |
| `LANDING` | Commit sequence. Disable weapons, afterburner, route autopilot, and manual docking. Keep camera/HUD cinematic. Set target surface service profile. |
| `SURFACE` | Surface terminal/menu. Equivalent to docked for physics and economy gates, but distinct from station docking. `flightState.landed` can remain true if compatibility is desired, with a new `surfaceState` providing specificity. |
| `DEPARTURE` | Close terminal, restore engine hum, place/accelerate ship outward to just beyond `planet.radius * 1.6`, clear landed/docked flags after safe altitude. |

Recommended transition guards:

- `NONE -> APPROACH`: nearest planet distance <= `Math.max(LOD_NEAR, planet.radius * 2.0)`.
- `APPROACH -> ORBITAL`: nearest planet distance <= `planet.radius * 1.6`.
- `ORBITAL -> LANDING`: user presses land/confirm and planet service profile allows surface access.
- `LANDING -> SURFACE`: landing sequence timer complete, velocity damped, no blocking message.
- `SURFACE -> DEPARTURE`: user chooses depart or recaptures pointer.
- `DEPARTURE -> NONE`: distance >= `planet.radius * 1.75` or departure timer expires.

## Needed `flightState` Fields

Minimal additions:

| Field | Type | Purpose |
| --- | --- | --- |
| `surfaceMode` | string enum | `NONE`, `APPROACH`, `ORBITAL`, `LANDING`, `SURFACE`, `DEPARTURE`. |
| `surfacePlanetId` | string/null | Current planet context. |
| `surfacePlanetType` | string/null | Cached `world.js` planet type for services/rules. |
| `surfaceDistance` | number | Current center distance to target planet. |
| `surfaceAltitude` | number | `surfaceDistance - planet.radius`, useful for HUD and landing thresholds. |
| `surfaceEnteredAt` | number | Timestamp for timed landing/departure transitions. |
| `surfaceServices` | object/null | Service flags available in `SURFACE` or `ORBITAL`. |
| `orbitalRadius` | number | Cached `planet.radius * 1.6`, avoids repeated recompute in UI/physics. |

Optional fields if implementing richer behavior:

| Field | Type | Purpose |
| --- | --- | --- |
| `orbitalNormal` | `THREE.Vector3`/null | Stable orbit plane/camera orientation. |
| `landingSiteId` | string/null | Named surface site or procedural landing location. |
| `departureVector` | `THREE.Vector3`/null | Safe outward vector during `DEPARTURE`. |
| `surfaceMessageShown` | boolean | Prevent repeated approach/orbital callouts. |

Compatibility note: reuse `flightState.landed` only for `SURFACE` if existing physics/HUD/menu blocking is desired. Do not use it for `APPROACH` or `ORBITAL`, because it stops flight physics and blocks autopilot as docked/landed.

## Surface Service Matrix By Planet Type

`world.js` defines four planet types: `homeworld`, `hostile`, `trading`, `anomaly`. Services are not currently defined on planets, so this matrix is a design mapping from type and existing economy/combat systems.

| Planet Type | Example | Existing Flags | Suggested Surface Services | Suggested Orbital Services |
| --- | --- | --- | --- | --- |
| `homeworld` | Nexus Prime | `hasStation: true` | Full restock, refuel, repair, equipment, cargo market, mission board, skill/loadout terminals. | Safe orbital traffic control, tutorial handoff, guided landing. |
| `hostile` | Cinder | `hasStation: false` | Limited salvage, emergency repair/refuel at high price, bounty/combat contracts, black-market risk. | Combat interdiction, warning zone, no safe auto-land unless mission/event grants access. |
| `trading` | Vaultholm | `hasStation: true` | Cargo market, refuel, missions, repairs, commodity bonuses, reputation pricing. | Trade beacon, price preview, convoy/escort hooks. |
| `anomaly` | The Breach | `hasStation: true` | Research terminal, rare resources, anomaly missions, fuel/energy effects, restricted equipment. | Scan interaction, unstable orbit, random director events, hyperspeed disruption. |

Suggested service flags:

| Service Flag | Homeworld | Hostile | Trading | Anomaly |
| --- | --- | --- | --- | --- |
| `restock` | yes | limited | yes | limited |
| `refuel` | yes | limited/costly | yes | variable |
| `repair` | yes | limited/costly | yes | limited |
| `equipment` | yes | black-market/combat | standard | rare/experimental |
| `cargoMarket` | yes | contraband/salvage | yes | rare data/artifacts |
| `missionBoard` | yes | bounty/combat | trade/escort | anomaly/research |
| `safeHarbor` | yes | no | yes | unstable |

## Existing Field Conflicts And Blocks

Fields/logic that conflict with orbital/surface modes:

- `flightState.landed`: `physics.updateFlight()` returns early when true, damping velocity and skipping manual thrust/combat. Good for `SURFACE`, wrong for `ORBITAL`.
- `traderState.docked` and `traderState.dockedStation`: existing economy assumes a project/station id. Planet ids are valid strings but not present in `USSY_PROJECTS`; helper functions like `stationName()` fallback to `UNKNOWN` unless planet-aware service naming is added.
- `flightState.currentDockedProject`: expects project object, not planet object. Use `surfacePlanetId` instead.
- `gameMessageState.active`: blocks auto-opening dock menus and orchestrator polling. Surface menus should follow this, but approach/orbital prompts should avoid starving orchestrator messages.
- `flightState.pointerLocked`: recapturing pointer currently implicitly undocks when `flightState.landed` is true. For `SURFACE`, this can be departure; for station docks it is current behavior. For `ORBITAL`, do not set `landed`.
- `autopilot.canEngageAutopilot()`: blocks on `flightState.docked || flightState.landed`, boss active, nearby hostiles, and critical hull. Surface/orbital code should disengage route autopilot on `LANDING` and `SURFACE`, but allow special orbital autopilot or approach decel before then.
- `isAutopilotActive()` combat block in physics: manual weapons fire is blocked while autopilot is active or hyperspeed multiplier is above `5`. Orbital landing should explicitly clear route autopilot to avoid invisible weapon/control gates.
- `combatState.bossActive`: blocks autopilot. Surface entry should probably be blocked while boss active.
- `combatState.afterburnerActive`, `afterburnerUntil`, `afterburnerCooldownUntil`: afterburner can spike velocity during approach unless blocked in `ORBITAL`/`LANDING`.
- `combatState.coldJumpCooldown` / cold jump skill: cold jump moves player forward by `40`; should be blocked during `LANDING` and probably `ORBITAL` to prevent clipping through a planet.
- `combatState.evasionCooldown` / evasion roll: should be blocked during `LANDING` and `SURFACE`; allowed or damped in `ORBITAL` depending on desired combat.
- `flightState.throttleEnabled`, `throttleLevel`, `matchSpeedActive`, `matchSpeedTarget`: should be reset on `LANDING` and `SURFACE`, same as dock flow resets flight assist state.
- `updateSystemDocking()`: only checks standalone stations and skips if `flightState.landed`; it does not know planets. Planet orbital code must run separately before/after this without triggering station dock accidentally.
- `flightState.pos.clampLength(1.8, flightBounds * activeUniverseScale)`: flight bounds are centered on origin. Large planet positions up to `20000` rely on `activeUniverseScale`; surface approach near far planets must verify this clamp does not pull the ship away when active scale changes.

## Concise Summary

- `LOD_NEAR` is `800` world units, but planet approach should be radius-relative; use `planet.radius * 1.6` for orbital entry and optionally `Math.max(LOD_NEAR, planet.radius * 2.0)` for approach hints.
- Current dock flow is station/project based, with `flightState.landed`, `traderState.docked`, and `traderState.dockedStation` driving physics pause, UI services, HUD dock styling, and autopilot blocking.
- Add a distinct surface/orbital state machine instead of overloading `landed`; reserve `landed` for `SURFACE` compatibility only.
- Planet services should derive from `world.js` type: homeworld full service, hostile limited/combat, trading market-focused, anomaly research/unstable.

# Navigation Expansion Notes

Research scope: Phase 1 navigation/autopilot design. Source read directly from `js/flight/state.js`, `js/input.js`, `js/flight/physics.js`, `js/flight/navigation.js`, and related combat/persist modules. This document is design-only and does not modify runtime code or tests.

## 1. Existing Flight State Shape

`js/flight/state.js` imports and re-exports `flightState` from `js/input.js`. The fields governing player position, velocity, and heading are currently:

| Field | Current type | Default | Role |
| --- | --- | --- | --- |
| `pos` | `THREE.Vector3` | `(0, 2.2, 16)` | Authoritative player/world position. Updated every physics frame and clamped to world bounds. |
| `vel` | `THREE.Vector3` | `(0, 0, 0)` | Authoritative player velocity. Manual thrust, strafe, afterburner, evasion, match-speed, and autopilot all mutate this. |
| `orientation` | `THREE.Quaternion` | identity | Authoritative ship/camera heading. Local yaw/pitch/roll inputs and autopilot slerp mutate this. |
| `yaw` | `number` | `0` | Startup/reset heading helper. Set from camera look vector on flight entry, then quaternion becomes authoritative. |
| `pitch` | `number` | `0` | Startup/reset heading helper. Set from camera look vector on flight entry, then quaternion becomes authoritative. |
| `roll` | `number` | `0` | Mostly legacy/helper state. `applyRoll` mutates it, but live heading uses `orientation`. |
| `thrust` | `number` | `14` | Forward acceleration scalar used by manual flight and current autopilot. Reduced on fuel depletion. |
| `strafe` | `number` | `8` | Lateral acceleration scalar used by manual strafe/evasion. Reduced on fuel depletion. |
| `damping` | `number` | `0.985` | Global velocity damping applied every frame. |
| `maxVelocity` | optional `number` | unset, fallback `22` | If present, caps velocity in `applyVelocityCapAndDrag`; otherwise `BASE_MAX_VELOCITY` is used. |
| `throttleEnabled` | optional `boolean` | unset/false | Runtime throttle toggle added outside initial literal. |
| `throttleLevel` | optional `number` | `0.5` when enabled | Static throttle setting used by continuous forward thrust. |
| `matchSpeedActive` | `boolean` | `false` | Temporarily lerps velocity toward target velocity or zero. |
| `matchSpeedTarget` | `THREE.Vector3|null` | `null` | Velocity target for match-speed/emergency brake. |
| `matchSpeedUntil` | `number` | `0` | `performance.now()` cutoff for match-speed. |
| `cameraRollTarget` | `number` | `0` | Evasion camera roll target. |
| `cameraRollCurrent` | `number` | `0` | Interpolated evasion camera roll. |
| `landed` | `boolean` | `false` | When true, normal flight movement is skipped and velocity is damped. |

Navigation-related fields already present:

| Field | Current type | Default | Role |
| --- | --- | --- | --- |
| `nearestNode` | `THREE.Object3D|null` | `null` | Nearest visible project node for landing. |
| `nearestDistance` | `number` | `Infinity` | Distance to `nearestNode`. |
| `crosshairNode` | `THREE.Object3D|null` | `null` | Visible project node aligned with crosshair. |
| `navNode` | `THREE.Object3D|null` | `null` | Current direct navigation target. |
| `navDistance` | `number` | `Infinity` | Distance to `navNode`. |
| `navEta` | `string` | `'--'` | ETA string based on closing speed. |
| `autopilot` | `boolean` | `false` | Current simple direct autopilot toggle. |

## 2. Current Movement/Physics System

`updateFlight(time)` in `js/flight/physics.js` is the live physics driver.

Position is driven by this frame sequence:

1. Compute clamped `dt` from `time - flightState.lastTime`, capped at `0.05` seconds.
2. Rebuild basis vectors from `flightState.orientation` using `updateFlightBasis()`:
   - `flightForward = (0, 0, -1)` transformed by `orientation`.
   - `flightRight = (1, 0, 0)` transformed by `orientation`.
   - `flightUp = (0, 1, 0)` transformed by `orientation`.
3. If landed, multiply velocity by landing damping and return after HUD/navigation updates.
4. Run `updateAutopilot(dt)` before manual thrust processing.
5. If pointer-locked or coarse pointer:
   - `KeyQ`/`KeyE` roll the quaternion.
   - Mouse movement calls `applyLocalFlightRotation()` from input code, unless not pointer-locked.
   - `Shift` can engage afterburner if skill-unlocked.
   - `KeyF` cold-jump directly adds `40` units along `flightForward`.
   - `KeyG` match-speed lerps `vel` toward nearest enemy velocity or zero.
   - `KeyC` evasion adds lateral/up velocity and rolls orientation.
   - `KeyR` toggles throttle, `KeyZ`/`KeyX` adjust throttle level; `KeyT` is reserved for target cycle.
   - `W/S` or arrows add forward/reverse velocity; throttle can add continuous forward velocity even without `W`.
   - `A/D` or arrows add lateral velocity.
   - `applyVelocityCapAndDrag(flightState, 0, boost)` caps velocity but does not apply drag because `dt` is `0` here.
   - Mouse buttons fire weapons.
6. Apply global drag: `flightState.vel.multiplyScalar(Math.pow(flightState.damping, dt * 60))`.
7. Integrate position: `flightState.pos.addScaledVector(flightState.vel, dt)`.
8. Drain fuel based on thrusting and speed.
9. Clamp player position length between `1.8` and `flightBounds * activeUniverseScale`.
10. Update landing target, navigation, combat objects, camera, radar, and HUD.

Current autopilot in `js/flight/navigation.js` is a simple direct target assist:

1. If `flightState.autopilot` is false or `navNode` is missing, it returns.
2. It points the ship toward `navNode.position` by slerping `flightState.orientation` toward a `lookAt` quaternion.
3. If alignment is above `0.45`, it adds forward thrust scaled by distance.
4. Inside final approach it dampens velocity.
5. At arrival range it disables autopilot and applies arrival-hold damping.

Manual override currently disables autopilot for manual flight keys and mouse deltas above 4 pixels. Existing manual-flight override keys are `W`, `A`, `S`, `D`, arrows, `Q`, `E`, and `Shift`.

## 3. Navigation Graph Design

Use a graph over logical locations, not live meshes. The current live target can remain `navNode`, but route planning should reference stable IDs so routes survive scene rebuilds and can include stations/jump points that are not project meshes.

Recommended storage:

- Runtime graph module: `js/flight/nav-graph.js`.
- Static authored data, if needed later: `js/data/navigation.js` or generated from `USSY_PROJECTS` during `buildProjectNodes()`.
- `flightState.navGraphId` stores the active graph version/id; `flightState.routeNodeIds` stores the current path by node id.
- Keep `projectNodeById` as the bridge from graph node id to render/landing mesh for project planets.

Node types:

| Type | Meaning | Position source |
| --- | --- | --- |
| `planet` | Existing project planet/node | `node.userData.flightPosition` or active `node.position` in flight mode. |
| `station` | Dockable/economy station | Authored position, often near a planet with `parentId`. |
| `jump` | Hyperspeed/jump route gate or deep-space nav point | Authored/generated position. |

Adjacency-list schema:

```js
export const navigationGraph = {
  version: 1,
  nodes: {
    openclawssy: {
      id: 'openclawssy',
      type: 'planet',
      label: 'OpenClawssy',
      projectId: 'openclawssy',
      position: { x: 120, y: -24, z: 420 },
      radius: 7.2,
      tags: ['dockable']
    },
    'openclawssy-station': {
      id: 'openclawssy-station',
      type: 'station',
      label: 'OpenClawssy Station',
      parentId: 'openclawssy',
      position: { x: 132, y: -18, z: 410 },
      radius: 5,
      tags: ['dockable', 'market']
    },
    'jump-inner-01': {
      id: 'jump-inner-01',
      type: 'jump',
      label: 'Inner Relay 01',
      position: { x: 0, y: 80, z: 620 },
      radius: 12,
      tags: ['relay']
    }
  },
  edges: {
    openclawssy: [
      { to: 'openclawssy-station', distance: 18, routeType: 'local', bidirectional: true },
      { to: 'jump-inner-01', distance: 260, routeType: 'hyperspeed', bidirectional: true }
    ],
    'openclawssy-station': [
      { to: 'openclawssy', distance: 18, routeType: 'local', bidirectional: true }
    ],
    'jump-inner-01': [
      { to: 'openclawssy', distance: 260, routeType: 'hyperspeed', bidirectional: true }
    ]
  }
};
```

Implementation notes:

- Store `distance` in flight-world units. If omitted, compute from node positions at graph build time.
- Store edges as directed entries even when `bidirectional` is true; graph build can expand bidirectional definitions into both adjacency lists.
- Start with direct routes between visible project planets using nearest-neighbor or existing relationship edges, then add stations and jump points.
- Route planning can use Dijkstra/A* over `distance`, with optional cost multipliers for `routeType`, hostile zones, fuel, faction restrictions, or mission locks.

## 4. Autopilot State Machine Design

Replace boolean-only autopilot behavior with an explicit state machine while keeping `autopilot` as a derived/backward-compatible boolean if desired.

ASCII diagram:

```text
                 set target / route request
      +---------------------------------------------+
      |                                             v
+------+       route found       +----------+   engage command   +---------+
| IDLE | ----------------------> | PLOTTING | -----------------> | ENGAGED |
+------+                         +----------+                    +----+----+
   ^                                  |                               |
   |                                  | route failed/cancel           | within decel window
   |                                  v                               v
   |                              +------+                      +-------------+
   |                              | IDLE |                      | DECELERATING|
   |                              +------+                      +------+------+ 
   |                                                                 |
   |                                         arrival radius reached  |
   |                                                                 v
   |                           clear/acknowledge/timeout       +---------+
   +----------------------------------------------------------- | ARRIVED |
                                                               +---------+

Any state -- manual override / combat lock / target invalid / fuel fail --> IDLE
```

State meanings:

| State | Meaning | Main transitions |
| --- | --- | --- |
| `IDLE` | No route or autopilot not controlling ship. | Target selection enters `PLOTTING`. |
| `PLOTTING` | Resolve graph route, validate fuel/target/locks, build waypoints. | Success enters `ENGAGED`; failure/cancel returns `IDLE`. |
| `ENGAGED` | Autopilot owns orientation, thrust profile, hyperspeed, and waypoint progression. | Decel threshold enters `DECELERATING`; manual/combat/fuel/invalid target returns `IDLE`. |
| `DECELERATING` | Autopilot owns velocity reduction and final alignment. | Arrival radius enters `ARRIVED`; manual/combat/fuel/invalid target returns `IDLE`. |
| `ARRIVED` | Stop/hold near target, set status, optionally allow docking prompt. | Acknowledge/timeout/clear route returns `IDLE`. |

What autopilot must freeze while engaged or decelerating:

| System | Freeze behavior |
| --- | --- |
| Manual combat firing | Ignore `mouseButtons` firing paths or clear/suppress them while `autopilotInputLocked` is true. Current physics fires in the same block as manual movement, so add a guard before `firePrimaryWeapon`/`fireSecondaryWeapon`. |
| Weapon switching/equipment | Prevent weapon equip/switch choices while in active autopilot. Station equipment is already gated by landed state, but any future hot-swap keys must honor the lock. |
| Combat maneuver input | Suppress afterburner, cold jump, match speed, evasion, throttle changes, roll, and manual thrust while autopilot owns movement. |
| Target/crosshair nav changes | Allow cancel/replot only through navigation commands; do not let crosshair target changes silently redirect engaged autopilot. |
| Pointer/mouse look | Either ignore orientation input while locked or treat significant movement as manual override. Existing behavior disables autopilot on mouse movement over threshold. |

## 5. Hyperspeed Design

Multiplier range: `10x` to `80x` over normal cruise. This should be a travel-time multiplier, not unrestricted raw velocity, to avoid breaking collision/combat/arrival systems.

Recommended profile:

| Phase | Multiplier | Notes |
| --- | --- | --- |
| Spool | `1x -> 10x` | 0.8 to 1.5 seconds. Requires valid route, autopilot engaged, not landed, not in combat lock, fuel above reserve. |
| Cruise | `10x -> 80x` | Scale by route segment distance: short segments cap around `10x-25x`; long jump edges can reach `80x`. |
| Approach | `80x -> 10x -> 1x` | Begin at deceleration distance based on current effective speed and arrival radius. |
| Hold | `1x -> 0x` | Final velocity damping/lerp into arrival hold. |

Engage conditions:

- `autopilotMode` is `ENGAGED` and a valid route segment exists.
- Target/waypoint position is finite and inside flight bounds or marked as a jump segment endpoint.
- Player is not `landed`.
- Fuel is above a minimum reserve, for example `hyperspeedFuelReserve = 8`.
- Combat lock is false: no hostile within a configured danger radius, no boss active, no recent player hit cooldown, unless a future skill permits emergency jump.
- Route edge `routeType` allows hyperspeed (`hyperspeed` or long `local` segments); close station approach stays sublight.

Disengage conditions:

- Manual override input.
- Entering deceleration window.
- Hostile interdiction/combat lock.
- Fuel below reserve or fuel depleted.
- Target/route invalidated.
- Arrival radius reached.
- Player death, landing, menus that require control handoff, or scene exit.

Cheap VFX:

- Increase dust/starfield streak length and spawn distance using existing dust field data.
- Add a CSS class to cockpit/HUD for blue-white edge bloom, scanline intensity, and subtle chromatic shake.
- Temporarily raise engine hum pitch/volume through existing `sfxEngine` patterns.
- Stretch the existing nav line opacity/width if feasible, or pulse nav marker text.
- Avoid new heavy particle systems in Phase 1; reuse `dustField`, `debrisField`, and HUD overlay classes.

Arrival deceleration curve:

- Use a smoothstep/ease-out curve from decel start to arrival radius.
- Compute `decelT = clamp((distance - arrivalRadius) / (decelStartDistance - arrivalRadius), 0, 1)`.
- Desired speed multiplier: `desiredMultiplier = lerp(1, hyperspeedMultiplier, smoothstep(decelT))` where `smoothstep(t) = t * t * (3 - 2 * t)`.
- Desired velocity points along route tangent/target direction; blend with current velocity using `vel.lerp(desiredVelocity, min(1, dt * decelResponsiveness))`.
- Inside arrival radius, apply stronger damping and optionally snap very small velocity to zero.

## 6. New Fields Needed

Recommended `flightState` fields:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `autopilotMode` | `'IDLE'|'PLOTTING'|'ENGAGED'|'DECELERATING'|'ARRIVED'` | `'IDLE'` | Explicit state machine mode. |
| `autopilot` | `boolean` | `false` | Existing HUD/backward-compatible derived flag: true for `ENGAGED` or `DECELERATING`. |
| `autopilotInputLocked` | `boolean` | `false` | Suppress combat firing, weapon switching, and manual combat maneuvers. |
| `autopilotManualOverrideReason` | `string|null` | `null` | Last reason autopilot was cancelled. |
| `navGraphId` | `string|null` | `null` | Active nav graph/version id. |
| `navTargetId` | `string|null` | `null` | Stable graph node id for final destination. |
| `navTargetType` | `'planet'|'station'|'jump'|null` | `null` | Target class for HUD/arrival behavior. |
| `navRouteNodeIds` | `string[]` | `[]` | Planned path node ids, including start/target. |
| `navRouteEdges` | `Array<{ from: string, to: string, distance: number, routeType: string }>` | `[]` | Planned segment metadata. |
| `navRouteIndex` | `number` | `0` | Current edge/waypoint index. |
| `navWaypointId` | `string|null` | `null` | Current waypoint graph node id. |
| `navWaypointPosition` | `THREE.Vector3|null` | `null` | Current waypoint position, resolved from graph. |
| `navRouteDistance` | `number` | `Infinity` | Total remaining planned route distance. |
| `navSegmentDistance` | `number` | `Infinity` | Current segment remaining distance. |
| `navArrivalRadius` | `number` | `0` | Active arrival radius for current target/waypoint. |
| `navDecelStartDistance` | `number` | `0` | Distance at which `DECELERATING` starts. |
| `navPlotStartedAt` | `number` | `0` | Timestamp for plotting timeout/debug/HUD. |
| `navEngagedAt` | `number` | `0` | Timestamp when autopilot took control. |
| `navArrivedAt` | `number` | `0` | Timestamp when arrival hold began. |
| `hyperspeedActive` | `boolean` | `false` | Whether hyperspeed multiplier currently affects travel. |
| `hyperspeedMultiplier` | `number` | `1` | Current effective multiplier, clamped `1..80`. |
| `hyperspeedTargetMultiplier` | `number` | `1` | Desired multiplier for spool/cruise/decel. |
| `hyperspeedMinMultiplier` | `number` | `10` | Minimum active hyperspeed multiplier. |
| `hyperspeedMaxMultiplier` | `number` | `80` | Maximum active hyperspeed multiplier. |
| `hyperspeedSpool` | `number` | `0` | Normalized `0..1` spool progress. |
| `hyperspeedFuelReserve` | `number` | `8` | Fuel amount below which hyperspeed cannot engage/continues to disengage. |
| `hyperspeedDisengageReason` | `string|null` | `null` | Last hyperspeed shutdown reason for HUD/status. |
| `combatInputFrozen` | `boolean` | `false` | Explicit high-level freeze flag for combat actions during autopilot. |

Recommended `combatState` fields:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `combatInputFrozen` | `boolean` | `false` | Combat systems should reject fire/swap/evasion while true. Mirrors or derives from `flightState.autopilotInputLocked`. |
| `weaponSwitchLocked` | `boolean` | `false` | Prevent equipment or hot-swap changes during active autopilot/hyperspeed. |
| `fireControlLocked` | `boolean` | `false` | Prevent primary/secondary fire while active autopilot/hyperspeed owns control. |
| `combatManeuverLocked` | `boolean` | `false` | Prevent evasion, afterburner, cold-jump, and match-speed during autopilot. |
| `autopilotCombatLockReason` | `string|null` | `null` | HUD/debug reason combat rejected or cancelled autopilot. |
| `lastAutopilotInterruptedAt` | `number` | `0` | Timestamp for cooldowns/barks after interdiction/manual break. |
| `hyperspeedInterdictedUntil` | `number` | `0` | Optional timestamp preventing immediate re-entry after hostile interdiction. |

Field ownership recommendation:

- `flightState` owns navigation route, movement mode, hyperspeed multiplier, and arrival timing.
- `combatState` owns whether combat actions are allowed and why they were blocked.
- Derive lock fields from `autopilotMode` where possible, but store explicit booleans if current modules need simple guards.

## Risks

- Current movement integrates by velocity every frame; applying an `80x` raw velocity can tunnel through arrival radii and world bounds. Hyperspeed should drive desired travel progress and deceleration, not simply multiply `vel` without safeguards.
- Current autopilot and manual controls can both mutate velocity/orientation in the same frame. The state machine must clearly short-circuit manual combat maneuvers while active.
- Existing `navNode` stores a live mesh. New route data should use stable graph ids to avoid stale object references across scene rebuilds or generated station/jump nodes.
- Fuel drain currently scales with velocity. Hyperspeed may need explicit fuel math so long travel is expensive but does not instantly empty fuel at high multipliers.

# Phase 1 Scale Impact Notes

Scope: research-only assessment for increasing world scale by 250x. Reviewed in full: `js/flight/enemies.js`, `js/flight/hud.js`, `js/flight/combat-state.js`, `js/flight/weapons.js`, `js/flight/physics.js`, `index.html`, and `index.css`. Also checked `js/flight/persist.js`, `js/flight/state.js`, `js/input.js`, and `js/constants.js` for save, scene, and scale assumptions.

## Current Scale Model

- Flight mode currently uses `flightUniverseScale = 10`, `flightBounds = 135`, and `radarRange = 140`, so the active flight volume is clamped to about 1,350 units from origin.
- Project nodes in flight are not simply multiplied by universe scale; they use `createFlightProjectPosition()` with a shell radius from 260 to 1,080 units plus offsets.
- A 250x expansion would move system-scale content toward tens or hundreds of thousands of units if applied directly, while combat and cockpit systems still use local values under roughly 150 units.
- Combat should remain a local bubble around the player. Do not scale enemy orbit, weapon range, collision radii, or HUD lead-pip thresholds with the full world scale.

## 1. Combat Zone

Combat should remain local. The current enemy behavior already operates as a local combat bubble:

- Enemy spawn radius is player-relative at 92 to 150 units with vertical spread of 54 units.
- Boss spawns player-relative 80 units ahead.
- Enemy orbit/aggression behavior uses 46 units, 45 units, 80 units, and close-contact damage at 1.15 units.
- Friendly escort orbits the player at radius 12.
- Point-defense shield retaliation searches 12 units.

Recommended radius:

- Keep the active combat bubble around 150 units from the player.
- Use 180 units as a cleanup/despawn guard for enemies that drift or are left behind.
- Keep engagement/fire logic at the current 45 to 80 unit band so dogfights do not turn into system-scale sniping.
- Treat combat as a player-local scene layer, not a system-space entity set.

## 2. Radar

The current radar mixes two purposes in one display:

- `mapRadarPoint()` subtracts `flightState.pos` from any target and maps into cockpit radar space.
- `activeRadarRange = radarRange * activeUniverseScale()` is used for both project nodes and enemies.
- `updateCockpitRadar()` draws all visible `projectNodes` and all active enemies on the same tactical radar.
- `drawRadarContact()` marks off-range contacts at the edge, so at larger scale the radar becomes an edge-clutter display for system objects.

Required update:

- Split radar into two modes: local combat radar and system map.
- Local combat radar should use an unscaled range around 160 to 180 units and draw enemies, missiles/projectiles if desired, nearby dockable stations, and nav target only if within local range.
- System map should use normalized/system coordinates, not the combat radar projection. It should draw planets/stations/project nodes, routes, selected/nav target, and coarse player position.
- Mode-switching should be explicit and cheap: add a HUD mode state such as `radarMode: 'local' | 'system'`, toggle with a key or radar-panel click, and render the same canvas with different draw functions. Local remains default during combat; system mode can auto-show when no enemies are active or when the player opens nav.
- The existing `worldToRadar()` helper can be reused for system map normalization, but it should not share the local combat radar range.

## 3. Enemies

Current enemy placement is already player-relative:

- `spawnEnemy()` places enemies at `flightState.pos + polar offset`, with radius 92 to 150 and height spread 54.
- Boss spawn overrides position to `flightState.pos + forward * 80`.
- Bounty hunter and friendly escort both call `spawnEnemy()`, so they are player-relative.
- Gunboat turrets spawn near parent enemy with +/-3 unit offsets.
- Phantom split children spawn near parent with +/-1.5 unit offsets.
- Respawn after hull breach resets the player to `(0, 2.2, 16)` and respawns enemies around that position.

Needed update:

- Keep enemy spawn player-relative.
- Add explicit combat-bubble constants so future world-scale work does not accidentally multiply these local values.
- Consider despawning or re-seeding active enemies when the player fast-travels/cold-jumps/system-jumps beyond the local bubble.
- Hull-breach reset to origin will be wrong in a large system unless there is a defined safe station/home position. Replace with nearest dock/safe respawn when implementing system scale.

## 4. Collision

Collision is sphere/radius based and local:

- Enemies use `enemy.userData.radius`, based on `ENEMY_BASE_RADIUS = 0.62`; dreadnought scale is 2.4, boss scale is 3.2.
- Player bullets use radius 0.22.
- Enemy bullets use radius 0.2.
- Missiles use radius 0.36.
- Player hit by enemy bullets uses distance squared threshold `< 0.55`, effectively a small fixed local sphere.
- Ramming/contact damage triggers at enemy distance `< 1.15`.
- Project/station hit/landing uses separate project node radii and landing/nav systems.

Needed update:

- Keep weapon/enemy collision in local units.
- Do not scale collision radii by 250x.
- If planets/stations become true system-scale objects, they need separate broad-phase collision/landing zones, likely with local floating-origin coordinates around the player for precision.
- At 250x, large absolute coordinates can cause precision jitter if projectile and target positions are stored directly in world space. Use origin rebasing or sector-relative/local combat coordinates before absolute positions exceed tens of thousands of units.

## 5. Weapon Range

Current effective max ranges:

- Player primary bullet pool default max distance is `playerLaserMaxDistanceSq = 320 * 320`.
- Individual player weapon range is also constrained by projectile speed and projectile life from `WEAPON_DEFS`; HUD lead pip assumes bullet speed from the equipped primary.
- Enemy bullets default to `maxDistanceSq = 3600`, so about 60 units, and enemy fire only begins when distance is under the aggression radius, normally 46 units.
- Missiles deactivate beyond distance squared 4,900, so about 70 units, and default life is around 4.2 seconds unless overridden by weapon definition.
- EMP/area weapons use each weapon's `aoeRadius` and compare directly against enemy distance.

Recommendation:

- Keep all weapon ranges local.
- Primary laser range can stay 320 units as a projectile cleanup distance, but targeting/lead-pip display should remain local and not encourage system-scale shots.
- Enemy fire and missile gameplay should stay inside the 150 to 180 unit combat bubble.
- System-scale weapons, if added later, should be a separate mechanic with different targeting, travel, and save rules.

## 6. HUD

Existing direct world-position references that need scale treatment:

- Cockpit radar maps `targetPos - flightState.pos` for both enemies and project nodes.
- Lead pip predicts enemy position in world space and projects through camera; it hides at distance >= 60.
- Threat readout uses `playerShip.position.distanceTo(nearestEnemy.position)`.
- Bogey indicators call `mapRadarPoint(enemy.position, 1)` and are local enough if enemies remain local.
- Nav target, nearest project, nav ETA, crosshair target, and flight nav marker depend on project node distance from `flightState.pos` in navigation code.
- Footer telemetry displays raw `flightState.pos` coordinates to 2 decimals.
- `index.html` radar label says `RANGE 12KM`, but runtime radar text uses `RANGE ${activeRadarRange}` without unit formatting.
- `index.css` fixes cockpit radar and HUD layout dimensions; it does not contain scale logic, but system-map mode may need additional labels/toggle styling.

Needed update:

- Add distance formatting that switches between local units, km-like display, and system-scale abbreviations.
- Separate local combat HUD elements from system nav HUD elements.
- Keep lead pip and bogey indicators local only.
- Replace raw coordinate display with sector/system coordinates or player-local coordinates, otherwise a 250x world will produce noisy large numbers.
- Update radar title/range labels for mode: `TACTICAL RADAR` vs `SYSTEM MAP` and local range vs system radius.

## 7. Performance

Current draw/performance characteristics:

- Project nodes are individual `THREE.LOD` objects, each containing high mesh, medium mesh, sprite, glow shell, distant halo sprite, and invisible hit sphere.
- Project edges are batched into line segment buffers, which is good.
- Debris is instanced and dust is particle-based; counts are 72 to 300 debris and 180 to 600 dust depending on settings.
- Enemy, projectile, and VFX pools are fixed and small: 7 enemies, 32 player bullets, 28 enemy bullets, 8 missiles, small VFX pools.
- Runtime telemetry warns when triangles exceed 18,000 in flight and prints draw calls.
- No explicit frustum-culling system or far-object budget was found for system-scale stations/planets beyond Three.js object behavior and LOD distances.

System-scale budget recommendation:

- Keep local combat and cockpit draw calls fixed and small.
- For planets/stations/project nodes, target roughly 100 to 150 draw calls max on desktop and 60 to 90 on coarse/mobile in flight mode.
- Keep triangles under the existing 18,000 warning target for flight; if system-scale visuals need richer planets, use impostors/sprites at distance and only one or two high-detail bodies near the player.
- Batch or instance station markers, route markers, halos, asteroid/debris fields, and repeated station props.
- Add explicit frustum culling and distance buckets for system bodies; do not rely only on LOD, because a 250x system can leave many objects visible as tiny halo sprites.
- Use hierarchical culling by sector or orbital shell so only nearby/local bodies and selected nav targets update labels, halos, and radar contacts each frame.
- Labels should be capped and priority-based; rendering every project label against huge world coordinates will become noisy and expensive.

## 8. Save State

Current save behavior:

- `persist.js` stores session state under `ussysite2.runState.v1`.
- It saves score, wave, credits, hull, shield, boss threshold index, kill count, equipped weapons, inventory, reputation, and skills.
- It does not save `flightState.pos`, velocity, orientation, nav target, docked station, current docked project, fuel beyond the separate combat-state resource serializer, active enemies, active mission location, or radar mode.
- `combat-state.js` serializes combat progression and resources: ammo, missiles, fuel, and fuelDepleted. It does not serialize position.
- On flight start, `flightState.pos` is copied from current camera target/current camera position, then persisted run state restores only score/armor/shield/etc.

Recommendation:

- Yes, system-scale mode should persist player position, but not active local combat object positions unless mid-combat restore is explicitly supported.
- Persist position as sector-relative/system coordinates, not just raw Three.js floats, to support floating-origin and future migration.
- New fields to persist: schema version bump, `systemId`, `sectorId` or origin-cell, `position` or `localPosition`, `velocity`, `orientation`, `navTargetProjectId`, `currentDockedProjectId`, `landed`, `radarMode`, `fuel`, `fuelDepleted`, `ammo`, `missiles`, active mission/contract state, and last safe respawn/dock position.
- Runtime-only fields should remain transient: active bullets, enemy pool objects, muzzle flashes, kill feed entries, and combat debrief UI state.

## Risk Table

| System | Risk Level | Specific Fix Needed |
| --- | --- | --- |
| Combat zone | Medium | Freeze combat bubble in local units: spawn 92-150u, engage 45-80u, cleanup around 180u. Do not multiply combat behavior by world scale. |
| Radar | High | Split single radar into local combat radar and system map; local range should be unscaled, system mode should normalize system coordinates and use explicit mode state. |
| Enemies | Medium | Keep player-relative spawning; add constants and cleanup/despawn for enemies after fast/system travel. Replace hull-breach origin reset with nearest safe station/respawn. |
| Collision | High | Keep sphere collisions local; add separate planet/station broad-phase and floating-origin/sector-relative coordinates before large absolute positions cause precision issues. |
| Weapon range | Medium | Keep weapons local; document projectile cleanup ranges and prevent system-scale target acquisition with current bullets/missiles/EMP. |
| HUD | High | Audit all `flightState.pos` displays/projections; add distance formatting, radar mode labels, system coordinates, and local-only behavior for lead pip/bogey indicators. |
| Performance | High | Add draw-call/triangle budgets for system bodies, use instancing/batching for repeated props, cap labels, and add sector/frustum/distance culling beyond current LOD. |
| Save state | High | Bump save schema and persist player sector/position/orientation/nav/dock/radar/resource fields; leave local combat pools transient unless mid-combat restore is designed. |

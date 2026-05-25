# Changelog

## Flight Fix — mission restore and boss spawn hardening
- Dropped malformed persisted active missions before restore and cancelled delayed boss spawns when combat state resets before the timeout fires.

## Flight Fix — route autopilot and project overlays
- Fixed `Y` to toggle the route autopilot path, stopped flight-mode project-node drift, refreshed relationship edges when console nodes move, and hid project labels during flight.

## Flight Map — useful live system view
- System map (`M`) now refreshes while open instead of rendering a stale snapshot.
- Added route highlighting, current target/nearest labels, gate/station shapes, range rings, player heading, hostile markers, and an inline legend.
- Review hardening: map rendering no longer mutates autopilot state, stale route IDs are ignored safely, hunter markers are not double-drawn, and fast enemy bullets now use swept collision against the player.

## Flight Fix — combat kills and separated planets
- Fixed free-roam enemy deaths so destroyed ships deactivate instead of instantly respawning in place.
- Flight mode now moves project nodes from compact portfolio coordinates to FLIGHT_WORLD_DISTANCE_SCALE coordinates, while the main site keeps DEFAULT_VIEW_WORLD_SCALE framing.
- Fixed tutorial combat startup HUD threat-distance crash by resolving the live player ship lazily and falling back to flight position.
- Fixed fast player projectiles tunneling through enemies by checking bullet/missile travel segments instead of only the end-of-frame point.

## Camera Fix — Full ussyverse visible on load
- Recalculated camera Z from DEFAULT_VIEW_WORLD_SCALE × outermost planet extent
- sectionCamPositions tightened to preserve full cluster visibility
- Camera lerp alpha increased to 0.08 for snappy project selection

## [Phase: Jump Gates + Hyperspace]
```text
2957bfe feat: add jump gates, hyperspace unlock, and gate-aware routing
ce45b1e fix: phase one combat visuals, planet rendering, map layout, and flight scale
6b40320 fix: pull back default camera and reduce fog density so all nodes visible on load
93cd32b fix: remove duplicate configureEnemies key, dedupe configureHud, guard interval leak, add hash deserialization try/catch, reset flight assist on exit, remove dead tempColor vars, extract PROJECT_HOW_COPY
68aab4c fix(console): guard legacy project connection line access
c3e2041 fix(csp): use allowed unpkg host for Three module imports
593be0d fix(settings): apply startup settings after weapons configure
0802931 chore(deploy): verified live deploy of post-review bug fixes
e86ad09 fix(settings-menu): address post-review Escape routing and scoped live apply
fd83c0b docs: post-review bug fix patch notes and architecture updates
```

## [phase-1] — Visuals, default layout, and flight scale
- fix: enemy deaths now snapshot the kill position and trigger visible pooled explosions directly before enemy reuse/deactivation while preserving XP, kill feed, SFX, and reputation callbacks.
- changed: flight planets now render with lit procedural surface materials and a rim-only atmosphere shader capped below full-dome opacity.
- fix: default hero/console project nodes use a compact locked-view scale, wider camera section positions, and faster project snap interpolation so all projects remain readable on load.
- changed: flight-mode planets and stations use a separate distance scale from the locked portfolio map so the ussyverse feels wider without changing landing/navigation radii or node materials.

## [phase-2] — Jump gates and hyperspace routing
- added: physical jump gates with rotating cyan meshes, proximity detection, manual activation on `J`, warp flash feedback, and low-cost navgraph gate links.
- added: high-tier `HYPERSPACE DRIVE` skill unlock requiring `weap_3`, plus direct-route autopilot labeling and manual hyperspace jump/cooldown behavior.
- changed: autopilot route state now records route mode, waypoint counts, and gate-network waypoint jumps for non-hyperspace pilots.

## [patch] — Bug fixes: settings, tutorial overlay, HUD
- fix: defer tutorial-overlay flight-row selection to overlay build time (issue #1)
- fix: `openSettingsMenu` fallback path now fully initializes menu DOM (issue #2)
- fix: `autoDismissTimer` initialized to `null` with `clearTimeout` guard (issue #3)
- fix: `applySettings` uses `deps.documentRef` with a guarded browser fallback (issue #4)
- fix: removed redundant capture-phase Escape listener from `settings-menu.js` (issue #5)
- perf: bloom/graphics setters debounced 80ms on slider `oninput` (issue #6)
- fix: `bloomRadius` slider exposed in graphics panel and `syncControls` (issue #7)
- refactor: moved project inspector `[HOW_IT_WORKS]` copy into `js/data/projectCopy.js` and cleaned duplicate flight initialization wiring.

## [settings-tutorial-hud] - 2026-05-22
### Added
- Added hash-backed `js/flight/settings.js` as the canonical settings store and `js/ui/settings-menu.js` with Audio, Graphics, Gameplay, TTS, Controls, and Accessibility tabs.
- Added `js/flight/tutorial-overlay.js`, a first-flight controls reference overlay with dismiss and don't-show-again behavior.

### Changed
- Redesigned the bottom-center HUD controls bar with larger key hints, a `Tab` settings shortcut, and touch-friendly controls.
- Migrated flight audio volumes and TTS enabled state to `settingsState`, and wired settings into bloom, pixel ratio, HUD scale, mouse sensitivity, and pitch invert.

### Fixed
- Settings now close before lower-priority Escape handlers, and settings persist through the `:cfg:` save hash slot instead of `localStorage`.

## [visual-performance-pass] - 2026-05-22
### Added
- Added ACESFilmic renderer tone mapping, SRGB output color space, and guarded UnrealBloom post-processing for the WebGL viewport.
- Added emissive high-detail project node materials, Fresnel shader glow shells, and an animated relationship-edge opacity pulse.

### Changed
- Batched project node core connection lines into one `LineSegments` draw call, dirty-gated relationship edge buffer updates, raised desktop radar throttling to 150ms, and replaced the enemy kill flash forced reflow with Web Animations API.
- Replaced the global resize listener with a `ResizeObserver` on the canvas container and verified debris instance matrix uploads remain outside the debris update loop.

## [planet-unification] - 2026-05-22
### Changed
- Unified `PLANETS` with the 23 project-backed `USSY_PROJECTS` bodies and removed the old standalone expansion planet ids.
- Standardized world-space placement through `worldToThree(posArray, THREE)` for project nodes, planets, surface proximity, nav graph nodes, starfield exclusions, stations, HUD nearest-body logic, and persisted nearest-body restore.
- Kept `STATIONS` as 3 standalone stations and `JUMP_POINTS` as 3 route anchors, repositioned for the larger 50k system.

## [fix-pass-2] - 2026-05-22
### Fixed
- surface.js: landing Y-lerp now linear; thrust restored from pre-landing value
- hunters.js: clock standardized to Date.now; lastNodeArrival only set on eligible trigger rolls; hunters spliced on flee/destroy; fallback pool capped at 24
- missions.js: generation audited for bare Math.random and covered by deterministic same-seed regression
- civilians.js: fleet cap uses active-count with hard pool cap and reuse; dock timer verified against dt rather than wall clock
- persist.js: migration deep-clones input; schema version bumped last; migration errors return null without partial state
- help.js: configureHelpMenu owns Escape handling; KEY_MAP exported from input.js for help/control sync

## [EXPANSION-1] - 2026-05-22
### Added
- Vast star system with 4 planets, 3 stations, 3 jump points
- 3-level planet LOD renderer with atmosphere shell
- 3 station types: Outpost, Trading Hub, Military Base
- 8,000-star static starfield with brightness tiers
- Navigation graph with A* pathfinding
- Autopilot state machine (IDLE->PLOTTING->ENGAGED->DECELERATING->ARRIVED)
- Hyperspeed travel (10-80x multiplier) with star-stretch VFX
- System map overlay (M key) with nav panel route controls
- Proximity-based docking for all stations
- Persist schema v2 with player position and last visited body

## [EXPANSION-2] - 2026-05-22
### Added
- Planet surface approach state machine with approach, orbital, landing, surface, and departure states
- Mission board overlay on `B` with deterministic station contracts, active mission sidebar, rewards, expiry, and progress tracking
- Ambient civilian traffic with freighter, shuttle, and courier route behavior plus system-map contacts
- Bounty hunter intercept system with 3 bounty tiers and 3 factions
- Pilot manual help overlay on `H` / `F1` with controls, how-to-play, universe, and tips tabs
- Shared pause-reason handling for modal flight overlays
- Persist schema v3 with active missions, completed mission ids, bounty level, and minimal surface restore

### Changed
- Autopilot key moved from `P` to `Y`; static throttle moved from `T` to `R`; modal back actions use `Escape` / `Backspace`
- Schema v2 session saves migrate to v3 defaults while schema v1 remains unsupported

### Fixed
- Reserved controls for landing, mission board, help, target cycle, and overlay close to avoid keybinding conflicts

## [NEXT] - 2026-05-22
### Added
- Kill feed / combat log ring buffer (Epic 1)
- Minimap enemy trajectory projection lines (Epic 2)
- Enemy special abilities: gunboat turret, elite cloak, phantom split (Epic 3)
- Boss encounter system with score thresholds, 3 phases, HUD health bar (Epic 4)
- Reputation faction consequences: bounty hunters, friendly escorts (Epic 5)
- Visual loadout screen: weapon slots, armor repair, shield upgrade (Epic 6)
- Persistent session run state via sessionStorage (Epic 7)

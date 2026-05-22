# Changelog

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

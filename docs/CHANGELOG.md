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

## [NEXT] - 2026-05-22
### Added
- Kill feed / combat log ring buffer (Epic 1)
- Minimap enemy trajectory projection lines (Epic 2)
- Enemy special abilities: gunboat turret, elite cloak, phantom split (Epic 3)
- Boss encounter system with score thresholds, 3 phases, HUD health bar (Epic 4)
- Reputation faction consequences: bounty hunters, friendly escorts (Epic 5)
- Visual loadout screen: weapon slots, armor repair, shield upgrade (Epic 6)
- Persistent session run state via sessionStorage (Epic 7)

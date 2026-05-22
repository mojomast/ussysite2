// Static system-scale flight landmarks. Keep this module data-only so it can be
// imported by rendering, navigation, and tests without requiring THREE.
export const WORLD_SCALE = 50;
export const SYSTEM_RADIUS = 50000;
export const COMBAT_ZONE_RADIUS = 600;
export const HYPERSPEED_MULTIPLIER_MAX = 80;
export const HYPERSPEED_MULTIPLIER_MIN = 10;
export const LOD_NEAR = 800;
export const LOD_MID = 8000;
export const LOD_FAR = 40000;

// Planet definitions - positions are world-space XZ coordinates.
// Y is vertical; planets stay near the system plane.
export const PLANETS = [
  { id: 'nexus-prime', name: 'Nexus Prime', pos: [0, 0, 0], radius: 800, color: 0x3a6186, atmosphereColor: 0x5599cc, type: 'homeworld', hasStation: true },
  { id: 'cinder', name: 'Cinder', pos: [8000, 0, 3000], radius: 500, color: 0x8b3a2a, atmosphereColor: 0xff6622, type: 'hostile', hasStation: false },
  { id: 'vaultholm', name: 'Vaultholm', pos: [-12000, 0, -5000], radius: 1200, color: 0x2a4a2a, atmosphereColor: 0x44bb66, type: 'trading', hasStation: true },
  { id: 'the-breach', name: 'The Breach', pos: [20000, 0, -15000], radius: 300, color: 0x4a2060, atmosphereColor: 0xaa44ff, type: 'anomaly', hasStation: true }
];

// Standalone stations, not attached to a planet mesh.
export const STATIONS = [
  { id: 'relay-7', name: 'Relay Station 7', pos: [4000, 0, -2000], type: 'outpost', hasTrading: false, hasMissions: true },
  { id: 'hub-alpha', name: 'Hub Alpha', pos: [-6000, 0, 8000], type: 'hub', hasTrading: true, hasMissions: true },
  { id: 'fort-kova', name: 'Fort Kova', pos: [15000, 0, 5000], type: 'military', hasTrading: false, hasMissions: true }
];

// Jump points - fast-travel anchor nodes.
export const JUMP_POINTS = [
  { id: 'jp-inner', name: 'Inner Ring Jump', pos: [3500, 0, 3500] },
  { id: 'jp-mid', name: 'Mid Ring Jump', pos: [-9000, 0, 2000] },
  { id: 'jp-outer', name: 'Outer Jump Gate', pos: [18000, 0, -10000] }
];

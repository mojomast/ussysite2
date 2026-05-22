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
  { id: 'devussy', name: 'Devussy', pos: [5800, 187, 0], radius: 852, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'openclawssy', name: 'Openclawssy', pos: [4962, -192, 3605], radius: 532, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'swarmussy', name: 'Swarmussy', pos: [1998, 22, 6150], radius: 589, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'hermes-dashboard', name: 'Hermes Dashboard', pos: [-2101, -175, 6467], radius: 601, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'geoffrussy', name: 'Geoffrussy', pos: [-5771, 101, 4193], radius: 504, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'battlebussy', name: 'Battlebussy', pos: [-7467, -198, 0], radius: 508, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'ghstatsussy', name: 'ghstatsussy', pos: [-6310, -166, -4585], radius: 637, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'stenographussy', name: 'Stenographussy', pos: [-2513, 151, -7735], radius: 706, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'ralphussy', name: 'Ralphussy', pos: [2616, 3, -8052], radius: 512, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'nexussy', name: 'nexussy', pos: [7119, 199, -5173], radius: 900, color: 0x3a5a8a, atmosphereColor: 0x5588cc, type: 'core', hasStation: true },
  { id: 'tchaikovskussy', name: 'Tchaikovskussy', pos: [12000, 147, 0], radius: 542, color: 0x1a6a6a, atmosphereColor: 0x44ddcc, type: 'ai', hasStation: true },
  { id: 'ragussy', name: 'RAGussy', pos: [-16000, 182, 0], radius: 648, color: 0x1a6a6a, atmosphereColor: 0x44ddcc, type: 'ai', hasStation: true },
  { id: 'ussycode', name: 'ussycode', pos: [19000, -121, 0], radius: 539, color: 0x8a4a1a, atmosphereColor: 0xdd8833, type: 'infra', hasStation: true },
  { id: 'ussyring', name: 'Ussyring Webring', pos: [-10500, -100, 18187], radius: 300, color: 0x8a4a1a, atmosphereColor: 0xdd8833, type: 'infra', hasStation: true },
  { id: 'fireslice', name: 'fireslice', pos: [-11500, -50, -19919], radius: 452, color: 0x8a4a1a, atmosphereColor: 0xdd8833, type: 'infra', hasStation: true },
  { id: 'imacomputerussy', name: 'iMaCoMpUtERussy', pos: [28000, -142, 0], radius: 426, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'stallionussy', name: 'StallionUSSY', pos: [20708, -62, 20708], radius: 365, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'templeossy', name: 'TempleOSsy', pos: [0, 109, 30571], radius: 277, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'fruityboofs', name: 'Fruity Boofs', pos: [-22526, -188, 22526], radius: 286, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'mediageckussy', name: 'Mediageckussy', pos: [-33143, -10, 0], radius: 523, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'strudelussy', name: 'Strudelussy', pos: [-24345, -161, -24345], radius: 368, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'scoreboardussy', name: 'Scoreboardussy', pos: [0, 128, -35714], radius: 335, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true },
  { id: 'rpg-dm-bot', name: 'RPG DM Bot', pos: [26163, -47, -26163], radius: 411, color: 0x5a2a8a, atmosphereColor: 0xaa55ff, type: 'creative', hasStation: true }
];

// Standalone stations, not attached to a planet mesh.
export const STATIONS = [
  { id: 'relay-7', name: 'Relay Station 7', pos: [2600, 0, -4200], type: 'outpost', hasTrading: false, hasMissions: true },
  { id: 'hub-alpha', name: 'Hub Alpha', pos: [-3600, 0, 6200], type: 'hub', hasTrading: true, hasMissions: true },
  { id: 'fort-kova', name: 'Fort Kova', pos: [14500, 0, 2400], type: 'military', hasTrading: false, hasMissions: true }
];

// Jump points - fast-travel anchor nodes.
export const JUMP_POINTS = [
  { id: 'jp-inner', name: 'Inner Ring Jump', pos: [0, 0, 9500] },
  { id: 'jp-mid', name: 'Mid Ring Jump', pos: [0, 0, 24500] },
  { id: 'jp-outer', name: 'Outer Jump Gate', pos: [0, 0, -41000] }
];

// The ONE authoritative [x,y,z] -> THREE.Vector3 converter.
// Every system that needs a world position must call this.
// world.js must remain import-free - THREE is injected by the caller.
export function worldToThree(posArray, THREE) {
  if (posArray?.isVector3 || typeof posArray?.distanceTo === 'function') {
    return typeof posArray.clone === 'function'
      ? posArray.clone()
      : new THREE.Vector3(posArray.x ?? 0, posArray.y ?? 0, posArray.z ?? 0);
  }
  if (posArray && !Array.isArray(posArray) && typeof posArray === 'object') {
    return new THREE.Vector3(posArray.x ?? 0, posArray.y ?? 0, posArray.z ?? 0);
  }
  const [x = 0, y = 0, z = 0] = posArray ?? [];
  return new THREE.Vector3(x, y, z);
}

import { FLIGHT_WORLD_DISTANCE_SCALE, worldToThree } from './world.js';

export const GATE_PROXIMITY = 12;

// Jump gates are the common-carrier transit backbone: sparse physical rings placed
// between distant clusters so non-hyperspace pilots can cross the large system.
export const JUMP_GATES = [
  { id: 'gate-inner-north', name: 'Inner North Gate', pos: [0, 0, 11200], connectsTo: ['gate-outer-north', 'gate-core'], activationRange: GATE_PROXIMITY },
  { id: 'gate-core', name: 'Core Relay Gate', pos: [7800, 0, -7200], connectsTo: ['gate-inner-north', 'gate-outer-east', 'gate-outer-west'], activationRange: GATE_PROXIMITY },
  { id: 'gate-outer-east', name: 'Outer East Gate', pos: [26800, 0, 18200], connectsTo: ['gate-core', 'gate-outer-south'], activationRange: GATE_PROXIMITY },
  { id: 'gate-outer-west', name: 'Outer West Gate', pos: [-28600, 0, -16600], connectsTo: ['gate-core', 'gate-outer-north'], activationRange: GATE_PROXIMITY },
  { id: 'gate-outer-north', name: 'Outer North Gate', pos: [0, 0, 34400], connectsTo: ['gate-inner-north', 'gate-outer-west'], activationRange: GATE_PROXIMITY },
  { id: 'gate-outer-south', name: 'Outer South Gate', pos: [0, 0, -39400], connectsTo: ['gate-outer-east'], activationRange: GATE_PROXIMITY }
];

/**
 * Builds one rotating cyan jump gate mesh at its scaled flight-world position.
 * @param {{id:string,name:string,pos:number[],connectsTo:string[],activationRange?:number}} gateDef Gate definition.
 * @param {typeof globalThis.THREE} THREE Three.js namespace.
 * @param {number} positionScale Scale applied to the raw gate coordinates.
 * @returns {THREE.Group} Physical jump gate object.
 */
export function createJumpGate(gateDef, THREE, positionScale = FLIGHT_WORLD_DISTANCE_SCALE) {
  if (!gateDef) throw new Error('createJumpGate requires a gate definition');
  if (!THREE) throw new Error('createJumpGate requires THREE');
  const group = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.95 });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(11, 0.55, 10, 36), ringMat);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.18, 8, 28), ringMat.clone ? ringMat.clone() : ringMat);
  const field = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40), coreMat);
  group.add(ring);
  group.add(inner);
  group.add(field);
  const worldPos = worldToThree(gateDef.pos, THREE, positionScale);
  group.position.copy?.(worldPos) ?? group.position.set?.(worldPos.x, worldPos.y, worldPos.z);
  group.userData = { ...(group.userData ?? {}), ...gateDef, gateId: gateDef.id, isJumpGate: true, activationRange: gateDef.activationRange ?? GATE_PROXIMITY };
  return group;
}

/**
 * Creates and attaches all jump gate meshes to the scene.
 * @param {THREE.Scene} scene Target scene.
 * @param {typeof globalThis.THREE} THREE Three.js namespace.
 * @param {number} positionScale Scale applied to raw gate coordinates.
 * @returns {THREE.Group[]} Jump gate objects.
 */
export function createAllJumpGates(scene, THREE, positionScale = FLIGHT_WORLD_DISTANCE_SCALE) {
  if (!scene) throw new Error('createAllJumpGates requires a scene');
  const gates = JUMP_GATES.map(gate => createJumpGate(gate, THREE, positionScale));
  for (const gate of gates) scene.add(gate);
  return gates;
}

/**
 * Spins active jump gate rings to make transit infrastructure readable in flight.
 * @param {THREE.Group[]} gates Gate objects.
 * @param {number} dt Seconds since last frame.
 * @returns {void}
 */
export function updateJumpGateRotations(gates, dt = 0) {
  for (const gate of gates ?? []) {
    if (!gate?.rotation) continue;
    gate.rotation.z += dt * 0.7;
    if (gate.children?.[1]?.rotation) gate.children[1].rotation.z -= dt * 1.15;
  }
}

/**
 * Finds the nearest gate to a position.
 * @param {THREE.Vector3} position Player/world position.
 * @param {THREE.Group[]} gates Gate objects.
 * @returns {{gate:THREE.Group,dist:number}|null} Nearest gate result.
 */
export function getNearestGate(position, gates = []) {
  if (!position) return null;
  let nearest = null;
  for (const gate of gates ?? []) {
    const dist = gate?.position?.distanceTo?.(position) ?? Infinity;
    if (dist < (nearest?.dist ?? Infinity)) nearest = { gate, dist };
  }
  return nearest;
}

/**
 * Returns the active gate when the player is inside its activation range.
 * @param {THREE.Vector3} playerPos Player/world position.
 * @param {THREE.Group[]} gates Gate objects.
 * @returns {THREE.Group|null} Gate in range, if any.
 */
export function isInJumpRange(playerPos, gates = []) {
  const nearest = getNearestGate(playerPos, gates);
  if (!nearest) return null;
  return nearest.dist <= (nearest.gate.userData?.activationRange ?? GATE_PROXIMITY) ? nearest.gate : null;
}

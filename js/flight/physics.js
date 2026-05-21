import { flightState } from './state.js';
import { reapplySkills } from './combat-state.js';
import { traderState, updateFuelDrain } from '../economy/trader.js';

export const orbitState = { dragging: false, moved: false, theta: 0, phi: Math.PI * 0.35, distance: 18 };
export const flightForward = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightRight = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightUp = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightTempVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightTempVec2 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
let skillsApplied = false;

export function updateFlight(time = 0) {
  if (!skillsApplied) {
    reapplySkills();
    skillsApplied = true;
  }
  const dt = Math.min(((time - (flightState.lastTime || 0)) / 1000) || 0.016, 0.05);
  const isThrusting = flightState.keys.has('KeyW') || flightState.keys.has('KeyS') || flightState.keys.has('ArrowUp') || flightState.keys.has('ArrowDown') || flightState.autopilot;
  if (updateFuelDrain(dt, isThrusting)) flightState.fuelDepleted = true;
  flightState.fuel = traderState.fuel;
}

export function updateFlightBasis() {}
export function applyLocalFlightRotation() {}
export function applyOrbitToCamera() {}
export function syncOrbitFromCamera() {}

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

export function canApplyThrust(state) {
  return (state.fuel ?? 0) > 0 && !state.fuelDepleted;
}

export function applyForwardThrust(state, forward, dt, multiplier = 1) {
  if (!canApplyThrust(state)) return state;
  state.vel.addScaledVector(forward, (state.thrust ?? 14) * multiplier * dt);
  return state;
}

export function applyReverseThrust(state, forward, dt) {
  if (!canApplyThrust(state)) return state;
  state.vel.addScaledVector(forward, -(state.thrust ?? 14) * 0.58 * dt);
  return state;
}

export function applyStrafe(state, right, dt, direction = 1) {
  if (!canApplyThrust(state)) return state;
  state.vel.addScaledVector(right, (state.strafe ?? 8) * direction * dt);
  return state;
}

export function applyRoll(state, amount) {
  state.roll = (state.roll ?? 0) + amount;
  return state;
}

export function drainFuelForThrust(fuelState, dt, isThrusting) {
  if (!isThrusting || fuelState.fuel <= 0) return fuelState;
  fuelState.fuel = Math.max(0, fuelState.fuel - (fuelState.fuelPerSecond ?? 0.35) * dt);
  fuelState.fuelDepleted = fuelState.fuel <= 0;
  return fuelState;
}

export function updateFlightBasis() {}
export function applyLocalFlightRotation() {}
export function applyOrbitToCamera() {}
export function syncOrbitFromCamera() {}

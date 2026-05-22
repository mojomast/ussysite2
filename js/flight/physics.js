import { combatState } from './combat-state.js';
import { traderState, updateFuelDrain } from '../economy/trader.js';

const THREE = globalThis.THREE;

export const orbitState = { dragging: false, moved: false, theta: 0, phi: Math.PI * 0.35, distance: 18 };
export const flightForward = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightRight = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightUp = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightTempVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightTempVec2 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightQuat = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
const flightInputVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
const flightInputQuat = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
let deps = null;

export const BASE_MAX_VELOCITY = 22;
export const DEFAULT_DAMPING = 0.985;

export function configureFlightPhysics(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Flight physics module not configured');
  return deps;
}

export function updateFlight(time = 0) {
  const {
    activeUniverseScale,
    firePrimaryWeapon,
    fireSecondaryWeapon,
    flightBounds,
    flightHud,
    flightState,
    getVoicePersona,
    isCoarsePointer,
    showGameMessage,
    skillTree,
    ttsEngine,
    updateAutopilot,
    updateCockpitRadar,
    updateCombatObjects,
    updateFlightCamera,
    updateFlightHud,
    updateFlightNavigation,
    updateMission,
    updateProjectLandingTarget,
    updateWeaponVfxPools
  } = requireDeps();

  const dt = Math.min(((time - flightState.lastTime) / 1000) || 0.016, 0.05);
  flightState.lastTime = time;
  updateFlightBasis();
  updateMission(time);
  const maxShield = skillTree.getMaxShield();
  flightState.energy = Math.min(skillTree.getMaxEnergy(), flightState.energy + 8 * dt);
  if (flightState.shield < maxShield && performance.now() - combatState.lastHitAt > combatState.shieldRegenDelay) {
    flightState.shield = Math.min(maxShield, flightState.shield + combatState.shieldRegenRate * dt);
  }
  combatState.heat = Math.max(0, combatState.heat - combatState.heatCoolRate * dt);
  if (combatState.overheated && combatState.heat <= 0) combatState.overheated = false;
  if (combatState.overheated) flightState.status = 'WEAPONS OFFLINE - COOLING';

  if (flightState.landed) {
    flightState.vel.multiplyScalar(Math.pow(0.9, dt * 60));
    updateWeaponVfxPools();
    if (skillTree.unlocked.has('hull_4') && flightState.armor < skillTree.getMaxArmor()) {
      flightState.armor = Math.min(skillTree.getMaxArmor(), flightState.armor + dt);
    }
    updateProjectLandingTarget();
    updateFlightNavigation();
    updateFlightCamera();
    updateCockpitRadar(time);
    updateFlightHud(false);
    return;
  }

  updateAutopilot(dt);

  if (flightState.pointerLocked || isCoarsePointer) {
    if (flightState.keys.has('KeyQ')) applyLocalFlightRotation(0, 0, 1, 1.85 * dt);
    if (flightState.keys.has('KeyE')) applyLocalFlightRotation(0, 0, 1, -1.85 * dt);
    updateFlightBasis();

    const shiftHeld = flightState.keys.has('ShiftLeft') || flightState.keys.has('ShiftRight');
    if (shiftHeld && skillTree.unlocked.has('eng_3') && performance.now() >= combatState.afterburnerCooldownUntil) {
      if (!combatState.afterburnerActive) {
        combatState.afterburnerActive = true;
        combatState.afterburnerUntil = performance.now() + 3000;
        combatState.afterburnerCooldownUntil = performance.now() + 12000;
      }
    }
    if (combatState.afterburnerActive && performance.now() >= combatState.afterburnerUntil) combatState.afterburnerActive = false;
    const boost = combatState.afterburnerActive ? 1.8 : 1;
    if (flightHud) flightHud.classList.toggle('afterburner-active', combatState.afterburnerActive);
    if (flightState.keys.has('KeyW') || flightState.keys.has('ArrowUp')) {
      flightState.vel.addScaledVector(flightForward, flightState.thrust * boost * dt);
    }
    if (flightState.keys.has('KeyS') || flightState.keys.has('ArrowDown')) {
      flightState.vel.addScaledVector(flightForward, -flightState.thrust * 0.58 * dt);
    }
    if (flightState.keys.has('KeyA') || flightState.keys.has('ArrowLeft')) {
      flightState.vel.addScaledVector(flightRight, -flightState.strafe * dt);
    }
    if (flightState.keys.has('KeyD') || flightState.keys.has('ArrowRight')) {
      flightState.vel.addScaledVector(flightRight, flightState.strafe * dt);
    }

    applyVelocityCapAndDrag(flightState, 0, boost);
    if (flightState.mouseButtons.has(0)) firePrimaryWeapon(time);
    if (flightState.mouseButtons.has(2)) fireSecondaryWeapon(time);
  }

  flightState.vel.multiplyScalar(Math.pow(flightState.damping, dt * 60));
  flightState.pos.addScaledVector(flightState.vel, dt);
  const isThrusting = flightState.keys.has('KeyW') || flightState.keys.has('KeyS')
    || flightState.keys.has('ArrowUp') || flightState.keys.has('ArrowDown')
    || flightState.autopilot;
  if (updateFuelDrain(dt, isThrusting) && !flightState.fuelDepleted) {
    flightState.fuelDepleted = true;
    flightState.thrust = 2;
    flightState.strafe = 1;
    showGameMessage({
      type: 'CRITICAL SYSTEM',
      source: 'USSYVERSE CONTROL',
      text: 'FUEL DEPLETED. THRUST REDUCED TO EMERGENCY DRIFT. DOCK AT ANY STATION TO REFUEL.'
    });
    ttsEngine.speak('FUEL DEPLETED. EMERGENCY DRIFT ONLY.', getVoicePersona('USSYVERSE CONTROL'));
  }
  flightState.fuel = traderState.fuel;
  const universeScale = typeof activeUniverseScale === 'function' ? activeUniverseScale() : activeUniverseScale;
  flightState.pos.clampLength(1.8, flightBounds * universeScale);

  updateProjectLandingTarget();
  updateFlightNavigation();
  updateCombatObjects(dt);
  updateFlightCamera();
  updateCockpitRadar(time);
  updateFlightHud(false);
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

export function applyVelocityCapAndDrag(state, dt, boost = 1) {
  const maxVelocity = (state.maxVelocity ?? state.maxSpeed ?? BASE_MAX_VELOCITY) * boost;
  if (state.vel.lengthSq() > maxVelocity * maxVelocity) state.vel.setLength(maxVelocity);
  if (dt) state.vel.multiplyScalar(Math.pow(state.damping ?? DEFAULT_DAMPING, dt * 60));
  return state;
}

export function updateFlightBasis() {
  const { flightState } = requireDeps();
  flightQuat.copy(flightState.orientation);
  flightForward.set(0, 0, -1).applyQuaternion(flightQuat).normalize();
  flightRight.set(1, 0, 0).applyQuaternion(flightQuat).normalize();
  flightUp.set(0, 1, 0).applyQuaternion(flightQuat).normalize();
}

export function applyLocalFlightRotation(x, y, z, angle) {
  if (!angle) return;
  const { flightState } = requireDeps();
  flightInputVec.set(x, y, z);
  flightInputQuat.setFromAxisAngle(flightInputVec, angle);
  flightState.orientation.multiply(flightInputQuat).normalize();
}
export function applyOrbitToCamera() {}
export function syncOrbitFromCamera() {}

import { combatState, decayKillStreakTimer } from './combat-state.js';
import { sfxEngine } from './sfx.js';
import { traderState, updateFuelDrain } from '../economy/trader.js';
import { isAutopilotActive } from './autopilot.js';

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
let coldJumpKeyWasDown = false;
let throttleZWasDown = false;
let throttleXWasDown = false;
let throttleRWasDown = false;
let matchSpeedKeyWasDown = false;
let evasionKeyWasDown = false;

export const BASE_MAX_VELOCITY = 22;
export const DEFAULT_DAMPING = 0.985;

export function configureFlightPhysics(options) {
  deps = options;
}

/** Sets the signed camera roll target for an evasion burst. */
export function triggerEvasionCameraRoll(state, rollDir, amount = 28) {
  state.cameraRollTarget = rollDir * amount;
  return state;
}

/** Advances evasion camera roll interpolation and target decay. */
export function updateEvasionCameraRoll(state, dt) {
  state.cameraRollCurrent = (state.cameraRollCurrent || 0)
    + ((state.cameraRollTarget || 0) - (state.cameraRollCurrent || 0)) * Math.min(1, dt * 12);
  state.cameraRollTarget = (state.cameraRollTarget || 0) * Math.pow(0.04, dt);
  if (Math.abs(state.cameraRollTarget) < 0.01) state.cameraRollTarget = 0;
  if (Math.abs(state.cameraRollCurrent) < 0.01) state.cameraRollCurrent = 0;
  return state;
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
    findNearestEnemy,
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
  combatState.coldJumpCooldown = Math.max(0, (combatState.coldJumpCooldown || 0) - dt * 1000);
  combatState.evasionCooldown = Math.max(0, (combatState.evasionCooldown || 0) - dt * 1000);
  decayKillStreakTimer(combatState, dt);
  updateEvasionCameraRoll(flightState, dt);

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
    const coldJumpKeyDown = flightState.keys.has('KeyF');
    if (coldJumpKeyDown && !coldJumpKeyWasDown && skillTree.unlocked.has('eng_5') && combatState.coldJumpCooldown <= 0) {
      flightState.pos.addScaledVector(flightForward, 40);
      sfxEngine.playFlat('missile', { volume: 0.8 });
      combatState.coldJumpCooldown = 25000;
      flightState.status = 'F - COLD JUMP EXECUTED';
      flightState.statusUntil = performance.now() + 1400;
    }
    coldJumpKeyWasDown = coldJumpKeyDown;

    const matchSpeedKeyDown = flightState.keys.has('KeyG');
    if (matchSpeedKeyDown && !matchSpeedKeyWasDown) {
      const nearestEnemy = typeof findNearestEnemy === 'function' ? findNearestEnemy() : null;
      if (nearestEnemy?.userData?.active && nearestEnemy.userData.velocity) {
        flightState.matchSpeedTarget = nearestEnemy.userData.velocity.clone();
        flightState.matchSpeedActive = true;
        flightState.matchSpeedUntil = performance.now() + 800;
        flightState.status = 'G — MATCHING TARGET VELOCITY';
        flightState.statusUntil = performance.now() + 1800;
      } else {
        flightState.matchSpeedTarget = new THREE.Vector3(0, 0, 0);
        flightState.matchSpeedActive = true;
        flightState.matchSpeedUntil = performance.now() + 1200;
        flightState.status = 'G — EMERGENCY BRAKE';
        flightState.statusUntil = performance.now() + 1800;
      }
    }
    matchSpeedKeyWasDown = matchSpeedKeyDown;

    if (flightState.matchSpeedActive && flightState.matchSpeedTarget) {
      const t = Math.min(1, dt * 4.5);
      flightState.vel.lerp(flightState.matchSpeedTarget, t);
      if (performance.now() >= flightState.matchSpeedUntil) {
        flightState.matchSpeedActive = false;
        flightState.matchSpeedTarget = null;
      }
    }

    const evasionKeyDown = flightState.keys.has('KeyC');
    if (evasionKeyDown && !evasionKeyWasDown && combatState.evasionCooldown <= 0) {
      const rollDir = Math.random() > 0.5 ? 1 : -1;
      flightState.vel.addScaledVector(flightRight, flightState.strafe * 3.2 * rollDir);
      flightState.vel.addScaledVector(flightUp, flightState.strafe * 1.4);
      applyLocalFlightRotation(0, 0, 1, rollDir * 1.2);
      triggerEvasionCameraRoll(flightState, rollDir);
      combatState.evasionCooldown = 4000;
      flightState.status = 'C — EVASION ROLL';
      flightState.statusUntil = performance.now() + 800;
      const overlay = globalThis.document?.getElementById?.('cockpit-overlay');
      if (overlay) {
        overlay.classList.add('evasion-flash');
        globalThis.setTimeout?.(() => overlay.classList.remove('evasion-flash'), 300);
      }
      sfxEngine.playFlat('boost', { volume: 0.7 });
    }
    evasionKeyWasDown = evasionKeyDown;

    const throttleRDown = flightState.keys.has('KeyR');
    if (throttleRDown && !throttleRWasDown) {
      flightState.throttleEnabled = !flightState.throttleEnabled;
      flightState.throttleLevel = flightState.throttleLevel ?? 0.5;
      flightState.status = flightState.throttleEnabled
        ? `THROTTLE ENGAGED — ${Math.round(flightState.throttleLevel * 100)}%`
        : 'THROTTLE DISENGAGED';
      flightState.statusUntil = performance.now() + 1600;
    }
    throttleRWasDown = throttleRDown;

    if (flightState.throttleEnabled) {
      const throttleZDown = flightState.keys.has('KeyZ');
      const throttleXDown = flightState.keys.has('KeyX');
      if (throttleZDown && !throttleZWasDown) {
        flightState.throttleLevel = Math.min(1.0, +((flightState.throttleLevel ?? 0.5) + 0.1).toFixed(1));
        flightState.status = `THROTTLE ${Math.round(flightState.throttleLevel * 100)}%`;
        flightState.statusUntil = performance.now() + 800;
      }
      if (throttleXDown && !throttleXWasDown) {
        flightState.throttleLevel = Math.max(0.0, +((flightState.throttleLevel ?? 0.5) - 0.1).toFixed(1));
        flightState.status = `THROTTLE ${Math.round(flightState.throttleLevel * 100)}%`;
        flightState.statusUntil = performance.now() + 800;
      }
      throttleZWasDown = throttleZDown;
      throttleXWasDown = throttleXDown;
    } else {
      throttleZWasDown = false;
      throttleXWasDown = false;
    }

    if (flightState.throttleEnabled) {
      // Continuous forward thrust at throttle level; Z/X adjust the static throttle setting.
      if (flightState.keys.has('KeyW') || flightState.keys.has('ArrowUp')) {
        flightState.vel.addScaledVector(flightForward, flightState.thrust * boost * flightState.throttleLevel * dt);
      }
      if (flightState.keys.has('KeyS') || flightState.keys.has('ArrowDown')) {
        flightState.vel.addScaledVector(flightForward, -flightState.thrust * 0.58 * flightState.throttleLevel * dt);
      }
      if (!flightState.keys.has('KeyW') && !flightState.keys.has('ArrowUp')
          && !flightState.keys.has('KeyS') && !flightState.keys.has('ArrowDown')
          && flightState.throttleLevel > 0) {
        flightState.vel.addScaledVector(flightForward, flightState.thrust * boost * flightState.throttleLevel * 0.6 * dt);
      }
    } else {
      if (flightState.keys.has('KeyW') || flightState.keys.has('ArrowUp')) {
        flightState.vel.addScaledVector(flightForward, flightState.thrust * boost * dt);
      }
      if (flightState.keys.has('KeyS') || flightState.keys.has('ArrowDown')) {
        flightState.vel.addScaledVector(flightForward, -flightState.thrust * 0.58 * dt);
      }
    }
    if (flightState.keys.has('KeyA') || flightState.keys.has('ArrowLeft')) {
      flightState.vel.addScaledVector(flightRight, -flightState.strafe * 1.15 * dt);
    }
    if (flightState.keys.has('KeyD') || flightState.keys.has('ArrowRight')) {
      flightState.vel.addScaledVector(flightRight, flightState.strafe * 1.15 * dt);
    }

    applyVelocityCapAndDrag(flightState, 0, boost);
    const autopilot = flightState.autopilot && typeof flightState.autopilot === 'object' ? flightState.autopilot : null;
    const manualCombatAllowed = !isAutopilotActive(flightState) && (autopilot?.hyperspeedMult ?? 1) <= 5;
    if (manualCombatAllowed && flightState.mouseButtons.has(0)) firePrimaryWeapon(time);
    if (manualCombatAllowed && flightState.mouseButtons.has(2)) fireSecondaryWeapon(time);
  }

  flightState.vel.multiplyScalar(Math.pow(flightState.damping, dt * 60));
  flightState.pos.addScaledVector(flightState.vel, dt);
  const isThrusting = flightState.keys.has('KeyW') || flightState.keys.has('KeyS')
    || flightState.keys.has('ArrowUp') || flightState.keys.has('ArrowDown')
    || (flightState.throttleEnabled && flightState.throttleLevel > 0)
    || isAutopilotActive(flightState);
  const fuelDrainScale = 1 + flightState.vel.length() * 0.012;
  if (updateFuelDrain(dt * fuelDrainScale, isThrusting) && !flightState.fuelDepleted) {
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
  state.vel.addScaledVector(right, (state.strafe ?? 8) * 1.15 * direction * dt);
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

export let flightNavLine = null;
const THREE = globalThis.THREE;
export const navTempVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const navTempVec2 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const navScreenVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightNavQuat = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
export const flightNavMatrix = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null;
let deps = null;

export function configureFlightNavigation(options) {
  deps = options;
  flightNavLine = options.flightNavLine || null;
}

function requireDeps() {
  if (!deps) throw new Error('Flight navigation module not configured');
  return deps;
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function getProjectNodeName(node) {
  return node?.userData?.project?.name || 'UNKNOWN';
}

export function updateCrosshairProjectTarget() {
  const { flightForward, flightState, projectNodes } = requireDeps();
  flightState.crosshairNode = null;
  let bestScore = Infinity;
  projectNodes.forEach(node => {
    if (!node.visible) return;
    navTempVec.copy(node.position).sub(flightState.pos);
    const distance = navTempVec.length();
    if (distance < 0.001) return;
    navTempVec.multiplyScalar(1 / distance);
    const alignment = navTempVec.dot(flightForward);
    if (alignment < 0.988) return;
    const score = (1 - alignment) * 1000 + distance * 0.001;
    if (score < bestScore) {
      bestScore = score;
      flightState.crosshairNode = node;
    }
  });
}

export function updateFlightNavigation() {
  const { flightState } = requireDeps();
  updateCrosshairProjectTarget();
  if (!flightState.navNode || !flightState.navNode.visible) {
    flightState.navDistance = Infinity;
    flightState.navEta = '--';
    flightState.autopilot = false;
    updateFlightNavLine();
    return;
  }

  navTempVec.copy(flightState.navNode.position).sub(flightState.pos);
  flightState.navDistance = navTempVec.length();
  const closingSpeed = flightState.navDistance > 0.001
    ? flightState.vel.dot(navTempVec.multiplyScalar(1 / flightState.navDistance))
    : 0;
  flightState.navEta = closingSpeed > 1 ? formatEta(flightState.navDistance / closingSpeed) : '--';
  updateFlightNavLine();
}

export function setNavigationTarget(node, source = 'manual') {
  const { flightState, selectProject, updateFlightHud } = requireDeps();
  if (!node) return false;
  flightState.navNode = node;
  flightState.navDistance = node.position.distanceTo(flightState.pos);
  flightState.status = `NAV SET: ${getProjectNodeName(node).toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2400;
  if (source === 'manual') selectProject(node.userData.project.id, false);
  updateFlightNavigation();
  updateFlightHud(true);
  return true;
}

export function setNavigationFromCrosshair() {
  const { flightState, updateFlightHud } = requireDeps();
  updateCrosshairProjectTarget();
  if (!flightState.crosshairNode) {
    flightState.status = 'PUT CROSSHAIR ON PROJECT NODE TO SET NAV';
    flightState.statusUntil = performance.now() + 2400;
    updateFlightHud(true);
    return;
  }
  setNavigationTarget(flightState.crosshairNode, 'manual');
}

export function toggleAutopilot() {
  const { flightState, updateFlightHud } = requireDeps();
  if (!flightState.navNode) {
    flightState.status = 'SET NAV TARGET BEFORE AUTOPILOT';
    flightState.statusUntil = performance.now() + 2400;
    updateFlightHud(true);
    return;
  }
  flightState.autopilot = !flightState.autopilot;
  flightState.status = flightState.autopilot ? `AUTOPILOT ENROUTE: ${getProjectNodeName(flightState.navNode).toUpperCase()}` : 'AUTOPILOT DISENGAGED';
  flightState.statusUntil = performance.now() + 2400;
  updateFlightHud(true);
}

export function disableAutopilot(reason) {
  const { flightState } = requireDeps();
  if (!flightState.autopilot) return;
  flightState.autopilot = false;
  if (reason) {
    flightState.status = reason;
    flightState.statusUntil = performance.now() + 1800;
  }
}

export function updateAutopilot(dt) {
  const { activeUniverseScale, flightForward, flightState, flightUp, landingRange, updateFlightBasis } = requireDeps();
  if (!flightState.autopilot || !flightState.navNode) return;
  navTempVec.copy(flightState.navNode.position).sub(flightState.pos);
  const distance = navTempVec.length();
  const universeScale = typeof activeUniverseScale === 'function' ? activeUniverseScale() : activeUniverseScale;
  const arrivalRange = landingRange * universeScale * 1.25;
  if (distance <= arrivalRange) {
    disableAutopilot('AUTOPILOT ARRIVAL HOLD');
    flightState.vel.multiplyScalar(Math.pow(0.9, dt * 60));
    return;
  }
  navTempVec.multiplyScalar(1 / distance);
  flightNavMatrix.lookAt(flightState.pos, flightState.navNode.position, flightUp);
  flightNavQuat.setFromRotationMatrix(flightNavMatrix);
  flightState.orientation.slerp(flightNavQuat, Math.min(1, dt * 0.75));
  updateFlightBasis();
  const alignment = flightForward.dot(navTempVec);
  if (alignment > 0.45) {
    const slowZone = arrivalRange * 4;
    const thrustScale = distance < slowZone ? THREE.MathUtils.clamp(distance / slowZone, 0.22, 0.72) : 0.86;
    flightState.vel.addScaledVector(flightForward, flightState.thrust * thrustScale * dt);
  }
  if (distance < arrivalRange * 3) {
    flightState.vel.multiplyScalar(Math.pow(0.965, dt * 60));
  }
}

export function updateFlightNavLine() {
  const { flightForward, flightState, isFlightActive } = requireDeps();
  if (!flightNavLine) return;
  const visible = isFlightActive() && !!flightState.navNode;
  flightNavLine.visible = visible;
  if (!visible) return;
  const positions = flightNavLine.geometry.attributes.position;
  navTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.4);
  positions.setXYZ(0, navTempVec.x, navTempVec.y, navTempVec.z);
  positions.setXYZ(1, flightState.navNode.position.x, flightState.navNode.position.y, flightState.navNode.position.z);
  positions.needsUpdate = true;
  flightNavLine.geometry.computeBoundingSphere();
}

export function updateProjectLandingTarget() {
  const { activeUniverseScale, combatAudio, flightState, getVoicePersona, isCoarsePointer, landingRange, missionState, projectNodeById, projectNodes } = requireDeps();
  flightState.nearestNode = null;
  flightState.nearestDistance = Infinity;
  projectNodes.forEach(node => {
    if (!node.visible) return;
    const dist = node.position.distanceTo(flightState.pos);
    if (dist < flightState.nearestDistance) {
      flightState.nearestDistance = dist;
      flightState.nearestNode = node;
    }
  });
  if (flightState.nearestNode) {
    const projectName = flightState.nearestNode.userData.project.name;
    if (flightState.landed) flightState.currentDockedProject = flightState.nearestNode.userData.project;
    const universeScale = typeof activeUniverseScale === 'function' ? activeUniverseScale() : activeUniverseScale;
    const activeLandingRange = landingRange * universeScale;
    const missionNode = projectNodeById.get(missionState.landingProjectId);
    const isMissionApproach = missionState.active && missionState.step === 'goLandAtProject' && flightState.nearestNode === missionNode;
    const isFinalApproach = isMissionApproach && flightState.nearestDistance < activeLandingRange * 1.5;
    if (isFinalApproach && !flightState.finalApproachSpoken) {
      flightState.finalApproachSpoken = true;
      combatAudio.bark('FINAL APPROACH', { ...getVoicePersona('NAVIGATION'), priority: 'normal' });
    } else if (!isFinalApproach) {
      flightState.finalApproachSpoken = false;
    }
    if (performance.now() > flightState.statusUntil) {
      flightState.status = flightState.nearestDistance <= activeLandingRange
        ? `LANDING RANGE: ${projectName}`
        : `${flightState.view.toUpperCase()} VIEW // ${flightState.pointerLocked || isCoarsePointer ? 'MOUSELOOK ARMED' : 'CLICK TO RECAPTURE'}`;
    }
  }
}

export function updateFlightNavMarker({ camera, flightNavMarker, isFlightActive, windowRef = window } = {}) {
  const { flightState } = requireDeps();
  if (!flightNavMarker) return;
  if (!isFlightActive() || !flightState.navNode) {
    flightNavMarker.classList.remove('active', 'offscreen');
    return;
  }

  navTempVec.copy(flightState.navNode.position).sub(camera.position).normalize();
  camera.getWorldDirection(navTempVec2);
  const inFront = navTempVec.dot(navTempVec2) > 0.05;
  navScreenVec.copy(flightState.navNode.position).project(camera);
  let x = (navScreenVec.x * 0.5 + 0.5) * windowRef.innerWidth;
  let y = (-navScreenVec.y * 0.5 + 0.5) * windowRef.innerHeight;
  if (!inFront) {
    x = windowRef.innerWidth - x;
    y = windowRef.innerHeight - y;
  }
  const margin = 76;
  const offscreen = !inFront || x < margin || x > windowRef.innerWidth - margin || y < margin || y > windowRef.innerHeight - margin;
  x = THREE.MathUtils.clamp(x, margin, windowRef.innerWidth - margin);
  y = THREE.MathUtils.clamp(y, margin, windowRef.innerHeight - margin);
  flightNavMarker.style.left = `${x}px`;
  flightNavMarker.style.top = `${y}px`;
  flightNavMarker.textContent = `NAV ${getProjectNodeName(flightState.navNode)}\n${Math.round(flightState.navDistance)}u // ETA ${flightState.navEta}\nAUTO ${flightState.autopilot ? 'ON' : 'OFF'}`;
  flightNavMarker.classList.toggle('active', true);
  flightNavMarker.classList.toggle('offscreen', offscreen);
}

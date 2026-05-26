import { AUTOPILOT_STATES, disengage, ensureAutopilotState, isAutopilotActive } from './autopilot.js';
import { getNavNode } from './navgraph.js';

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

function getNodePosition(node) {
  return node?.position || node?.pos || null;
}

function getNodeLabel(node, fallback = 'WAYPOINT') {
  return node?.userData?.project?.name || node?.name || node?.id || fallback;
}

function getActiveNavGraph() {
  const graph = deps?.navGraph;
  return typeof graph === 'function' ? graph() : graph;
}

function resolveFlightNavTarget(flightState) {
  const autopilot = ensureAutopilotState(flightState);
  const graph = getActiveNavGraph();
  const waypointId = autopilot.route?.[autopilot.routeIndex ?? 1] || autopilot.targetId;
  const routeNode = waypointId ? getNavNode(graph, waypointId) : null;
  const finalNode = autopilot.targetId ? getNavNode(graph, autopilot.targetId) : null;
  const node = flightState?.navNode || routeNode || finalNode || null;
  const pos = getNodePosition(node) || autopilot.targetPos || null;
  if (!pos) return null;
  return {
    node,
    pos,
    label: getNodeLabel(node, autopilot.targetId || 'WAYPOINT'),
    type: node?.type || node?.userData?.navType || null,
    autopilot,
    waypointId,
    finalNode
  };
}

function getDistance(a, b) {
  if (!a || !b) return Infinity;
  if (typeof a.distanceTo === 'function') return a.distanceTo(b);
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0), (a.z ?? 0) - (b.z ?? 0));
}

function formatRange(distance) {
  if (!Number.isFinite(distance)) return '--';
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)}kU` : `${Math.round(distance)}u`;
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
    const autopilot = ensureAutopilotState(flightState);
    if (isAutopilotActive(flightState) && !autopilot.targetId) disengage(flightState, 'NAV TARGET LOST');
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
  const autopilot = ensureAutopilotState(flightState);
  const active = isAutopilotActive(flightState);
  autopilot.state = active ? AUTOPILOT_STATES.IDLE : AUTOPILOT_STATES.ENGAGED;
  autopilot.blockedReason = active ? 'MANUAL' : null;
  flightState.status = !active ? `AUTOPILOT ENROUTE: ${getProjectNodeName(flightState.navNode).toUpperCase()}` : 'AUTOPILOT DISENGAGED';
  flightState.statusUntil = performance.now() + 2400;
  updateFlightHud(true);
}

export function disableAutopilot(reason) {
  const { flightState } = requireDeps();
  if (!isAutopilotActive(flightState)) return;
  disengage(flightState, reason || 'MANUAL');
  if (reason) {
    flightState.status = reason;
    flightState.statusUntil = performance.now() + 1800;
  }
}

export function updateAutopilot(dt) {
  const { activeUniverseScale, flightForward, flightState, flightUp, landingRange, updateFlightBasis } = requireDeps();
  const autopilot = ensureAutopilotState(flightState);
  if (!isAutopilotActive(flightState) || !flightState.navNode || autopilot.targetId) return;
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
  const target = resolveFlightNavTarget(flightState);
  const visible = isFlightActive() && !!target;
  flightNavLine.visible = visible;
  if (!visible) return;
  const positions = flightNavLine.geometry.attributes.position;
  const graph = getActiveNavGraph();
  const autopilot = target.autopilot;
  const routeIds = Array.isArray(autopilot.route) ? autopilot.route.slice(autopilot.routeIndex ?? 1) : [];
  const routePoints = routeIds
    .map(id => getNodePosition(getNavNode(graph, id)))
    .filter(Boolean);
  navTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.4);
  const points = [navTempVec, ...(routePoints.length ? routePoints : [target.pos])];
  const maxPoints = positions.count || points.length;
  points.slice(0, maxPoints).forEach((point, index) => {
    positions.setXYZ(index, point.x, point.y, point.z);
  });
  const used = Math.min(points.length, maxPoints);
  for (let i = used; i < maxPoints; i += 1) positions.setXYZ(i, target.pos.x, target.pos.y, target.pos.z);
  flightNavLine.geometry.setDrawRange?.(0, used);
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
  const target = resolveFlightNavTarget(flightState);
  if (!isFlightActive() || !target) {
    flightNavMarker.classList.remove('active', 'onscreen', 'offscreen', 'autopilot', 'gate', 'hyperspace');
    return;
  }

  navTempVec.copy(target.pos).sub(camera.position).normalize();
  camera.getWorldDirection(navTempVec2);
  const inFront = navTempVec.dot(navTempVec2) > 0.05;
  navScreenVec.copy(target.pos).project(camera);
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
  const angle = Math.atan2(y - (windowRef.innerHeight / 2), x - (windowRef.innerWidth / 2)) + Math.PI / 2;
  flightNavMarker.style.setProperty('--nav-arrow-rotation', `${angle}rad`);
  const autopilot = target.autopilot;
  const distance = getDistance(flightState.pos, target.pos);
  navTempVec.copy(target.pos).sub(flightState.pos);
  if (distance > 0.001) navTempVec.multiplyScalar(1 / distance);
  const closingSpeed = distance > 0.001 ? Math.max(0, flightState.vel?.dot?.(navTempVec) ?? 0) : 0;
  const eta = closingSpeed > 1 ? formatEta(distance / closingSpeed) : (flightState.navEta || '--');
  const waypoint = autopilot.route?.length > 1 ? ` // WP ${Math.min(autopilot.routeIndex ?? 1, autopilot.route.length - 1)}/${autopilot.route.length - 1}` : '';
  flightNavMarker.textContent = `NAV ${target.label}\nRANGE ${formatRange(distance)} // ETA ${eta}\nAUTO ${isAutopilotActive(flightState) ? (autopilot.routeModeLabel || 'ON') : 'OFF'}${waypoint}`;
  flightNavMarker.classList.toggle('active', true);
  flightNavMarker.classList.toggle('onscreen', !offscreen);
  flightNavMarker.classList.toggle('offscreen', offscreen);
  flightNavMarker.classList.toggle('autopilot', isAutopilotActive(flightState));
  flightNavMarker.classList.toggle('gate', target.type === 'gate' || autopilot.routeType === 'GATE');
  flightNavMarker.classList.toggle('hyperspace', autopilot.routeType === 'HYPERSPACE');
}

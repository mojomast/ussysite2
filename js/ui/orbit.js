import { isCoarsePointer } from '../constants.js';

const THREE = globalThis.THREE;

let deps = null;

export function configureOrbitUI(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Orbit UI module not configured');
  return deps;
}

export function syncOrbitFromCamera() {
  const { camTarget, orbitState } = requireDeps();
  const offset = new THREE.Vector3().copy(camTarget.pos).sub(camTarget.lookAt);
  orbitState.distance = THREE.MathUtils.clamp(offset.length(), orbitState.minDistance, orbitState.maxDistance);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  orbitState.theta = spherical.theta;
  orbitState.phi = THREE.MathUtils.clamp(spherical.phi, Math.PI * 0.12, Math.PI * 0.82);
}

export function applyOrbitToCamera() {
  const { camTarget, orbitState } = requireDeps();
  orbitState.phi = THREE.MathUtils.clamp(orbitState.phi, Math.PI * 0.12, Math.PI * 0.82);
  orbitState.distance = THREE.MathUtils.clamp(orbitState.distance, orbitState.minDistance, orbitState.maxDistance);
  const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(orbitState.distance, orbitState.phi, orbitState.theta));
  camTarget.pos.copy(camTarget.lookAt).add(offset);
}

export function beginOrbitDrag(event) {
  const { documentRef = document, orbitState } = requireDeps();
  orbitState.dragging = true;
  orbitState.moved = false;
  orbitState.pointerId = event.pointerId;
  orbitState.lastX = event.clientX;
  orbitState.lastY = event.clientY;
  orbitState.captureTarget = event.target;
  if (orbitState.captureTarget.setPointerCapture) orbitState.captureTarget.setPointerCapture(event.pointerId);
  documentRef.body.classList.add('scene-dragging');
}

export function onPointerMove(event) {
  const { orbitState } = requireDeps();
  if (!orbitState.dragging || orbitState.pointerId !== event.pointerId) return;
  const dx = event.clientX - orbitState.lastX;
  const dy = event.clientY - orbitState.lastY;
  orbitState.lastX = event.clientX;
  orbitState.lastY = event.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 3) orbitState.moved = true;
  orbitState.theta -= dx * orbitState.rotateSpeed;
  orbitState.phi -= dy * orbitState.rotateSpeed;
  applyOrbitToCamera();
}

export function endOrbitDrag(event) {
  const { documentRef = document, orbitState } = requireDeps();
  if (orbitState.pointerId !== event.pointerId) return;
  if (orbitState.captureTarget?.releasePointerCapture) {
    try { orbitState.captureTarget.releasePointerCapture(event.pointerId); } catch {}
  }
  orbitState.dragging = false;
  orbitState.pointerId = null;
  orbitState.captureTarget = null;
  documentRef.body.classList.remove('scene-dragging');
}

export function onSceneWheel(event) {
  const { isConsoleActive, isFlightActive, orbitState } = requireDeps();
  if (isFlightActive()) return;
  if (!isConsoleActive() || isCoarsePointer) return;
  if (event.target.closest && (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive'))) return;
  event.preventDefault();
  orbitState.distance += event.deltaY * orbitState.zoomSpeed * orbitState.distance;
  applyOrbitToCamera();
}

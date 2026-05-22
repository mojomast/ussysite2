import { updateCursorPosition } from './ui/cursor.js';
import {
  applyOrbitToCamera as applyOrbitToCameraModule,
  beginOrbitDrag,
  configureOrbitUI,
  endOrbitDrag,
  onPointerMove as onOrbitPointerMove,
  onSceneWheel as onOrbitSceneWheel,
  syncOrbitFromCamera as syncOrbitFromCameraModule
} from './ui/orbit.js';
import { registerHeroListeners } from './ui/hero.js';
import { toggleInventoryPanel } from './ui/inventory-panel.js';

const THREE = globalThis.THREE;

export const manualFlightKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);

export const orbitState = {
  dragging: false,
  moved: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  captureTarget: null,
  theta: 0,
  phi: Math.PI * 0.35,
  distance: 18,
  minDistance: 7,
  maxDistance: 82,
  rotateSpeed: 0.005,
  zoomSpeed: 0.0015
};

export const flightState = {
  keys: new Set(),
  mouseButtons: new Set(),
  pos: new THREE.Vector3(0, 2.2, 16),
  vel: new THREE.Vector3(),
  orientation: new THREE.Quaternion(),
  yaw: 0,
  pitch: 0,
  roll: 0,
  view: 'cockpit',
  pointerLocked: false,
  score: 0,
  shield: 100,
  armor: 100,
  energy: 100,
  ammo: 240,
  missiles: 8,
  fuel: 100,
  maxFuel: 100,
  fuelDepleted: false,
  lastTime: 0,
  lastShot: 0,
  lastMissile: 0,
  nearestNode: null,
  nearestDistance: Infinity,
  crosshairNode: null,
  navNode: null,
  navDistance: Infinity,
  navEta: '--',
  autopilot: false,
  status: 'TYPE USSY TO LAUNCH',
  statusUntil: 0,
  landed: false,
  shieldCriticalSpoken: false,
  finalApproachSpoken: false,
  currentDockedProject: null,
  lastHudUpdate: 0,
  mouseSensitivity: 0.0022,
  thrust: 14,
  strafe: 8,
  damping: 0.985
};

export const inputState = {
  pointerDirty: true,
  heroTouchStartY: 0
};

const flightInputVec = new THREE.Vector3();
const flightInputQuat = new THREE.Quaternion();

let deps = null;
let launchCodeBuffer = '';

export function configureInput(options) {
  deps = options;
  configureOrbitUI({
    camTarget: options.camTarget,
    documentRef: options.documentRef,
    isConsoleActive: options.isConsoleActive,
    isFlightActive: options.isFlightActive,
    orbitState
  });
}

function requireDeps() {
  if (!deps) throw new Error('Input module not configured');
  return deps;
}

function isTypingTarget(target) {
  return Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function clearFlightInput() {
  const { isFlightActive } = requireDeps();
  if (!isFlightActive()) return;
  flightState.keys.clear();
  flightState.mouseButtons.clear();
}

export function updatePointerFromClient(clientX, clientY) {
  const { mouse, telemetryCoord, windowRef = window } = requireDeps();
  mouse.x = (clientX / windowRef.innerWidth) * 2 - 1;
  mouse.y = -(clientY / windowRef.innerHeight) * 2 + 1;
  inputState.pointerDirty = true;
  telemetryCoord.innerText = `X: ${mouse.x.toFixed(2)} Y: ${mouse.y.toFixed(2)} Z: 0.00`;
}

export function getInteractiveHits() {
  const { camera, mouse, projectHitTargets, raycaster } = requireDeps();
  raycaster.setFromCamera(mouse, camera);
  const visibleTargets = projectHitTargets.filter(h => h.parent && h.parent.visible);
  return raycaster.intersectObjects(visibleTargets, true);
}

export function syncOrbitFromCamera() {
  syncOrbitFromCameraModule();
}

export function applyOrbitToCamera() {
  applyOrbitToCameraModule();
}

export function applyLocalFlightRotation(x, y, z, angle) {
  if (!angle) return;
  flightInputVec.set(x, y, z);
  flightInputQuat.setFromAxisAngle(flightInputVec, angle);
  flightState.orientation.multiply(flightInputQuat).normalize();
}

export function onPointerLockError() {
  const { documentRef = document, isFlightActive, updateFlightHud } = requireDeps();
  if (!isFlightActive()) return;
  flightState.pointerLocked = false;
  flightState.status = 'CLICK VIEWPORT TO CAPTURE MOUSELOOK';
  documentRef.body.classList.add('pointer-unlocked');
  clearFlightInput();
  updateFlightHud(true);
}

function onPointerLockChange() {
  const { documentRef = document, isFlightActive, onUndock, renderer, updateFlightHud } = requireDeps();
  flightState.pointerLocked = documentRef.pointerLockElement === renderer.domElement;
  if (!flightState.pointerLocked) clearFlightInput();
  documentRef.body.classList.toggle('pointer-unlocked', isFlightActive() && !flightState.pointerLocked);
  if (isFlightActive()) {
    if (flightState.pointerLocked) {
      if (flightState.landed && typeof onUndock === 'function') onUndock();
      flightState.landed = false;
      flightState.status = `MOUSELOOK ${flightState.view.toUpperCase()} VIEW`;
    } else if (performance.now() > flightState.statusUntil) {
      flightState.status = 'CLICK VIEWPORT TO RECAPTURE';
    }
    updateFlightHud(true);
  }
}

function onGlobalKeyDown(event) {
  const {
    dismissGameMessage,
    disableAutopilot,
    documentRef = document,
    enterFlightMode,
    exitFlightMode,
    gameMessageState,
    handleGameMessageChoice,
    isFlightActive,
    landOnNearestProject,
    openAudioSettingsMenu,
    openSkillTree,
    openStationMenu,
    radioChain,
    setNavigationFromCrosshair,
    toggleAutopilot,
    toggleFlightTts,
    toggleFlightView,
    toggleObjectivesView,
    traderState,
    unlockAudio
  } = requireDeps();

  if (radioChain.ctx && radioChain.ctx.state === 'suspended') radioChain.resume();
  if (isTypingTarget(event.target) || event.metaKey || event.altKey) return;
  if (!isFlightActive() && event.ctrlKey) return;

  if (event.key.length === 1 && !isFlightActive()) {
    launchCodeBuffer = (launchCodeBuffer + event.key.toLowerCase()).slice(-4);
    if (launchCodeBuffer === 'ussy') {
      event.preventDefault();
      launchCodeBuffer = '';
      if (typeof unlockAudio === 'function') unlockAudio();
      enterFlightMode();
      return;
    }
  }

  if (!isFlightActive()) return;
  if (typeof unlockAudio === 'function') unlockAudio();

  if (event.code === 'Escape') {
    const invPanel = documentRef.getElementById('inventory-panel');
    if (invPanel && !invPanel.hidden) {
      event.preventDefault();
      invPanel.hidden = true;
      return;
    }
  }

  if (handleGameMessageChoice(event)) {
    event.preventDefault();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    dismissGameMessage();
    return;
  }

  if (event.code !== 'Escape') event.preventDefault();
  if (event.code === 'KeyV') {
    event.preventDefault();
    if (!event.repeat) setNavigationFromCrosshair();
    return;
  }
  if (event.code === 'KeyP') {
    event.preventDefault();
    if (!event.repeat) toggleAutopilot();
    return;
  }
  if (event.code === 'KeyC') {
    event.preventDefault();
    if (!event.repeat) toggleFlightView();
    return;
  }
  if (event.code === 'KeyO') {
    event.preventDefault();
    if (!event.repeat) toggleObjectivesView();
    return;
  }
  if (event.code === 'KeyL') {
    event.preventDefault();
    if (!event.repeat) landOnNearestProject();
    return;
  }
  if (event.code === 'KeyT') {
    event.preventDefault();
    if (!event.repeat && flightState.landed && traderState.dockedStation && !gameMessageState.active) openStationMenu(traderState.dockedStation);
    return;
  }
  if (event.code === 'KeyI') {
    event.preventDefault();
    if (!event.repeat) toggleInventoryPanel();
    return;
  }
  if (event.code === 'KeyU') {
    event.preventDefault();
    if (!event.repeat && flightState.landed && !gameMessageState.active) openSkillTree();
    return;
  }
  if (event.code === 'KeyM') {
    event.preventDefault();
    if (!event.repeat) {
      if (event.shiftKey) toggleFlightTts();
      else openAudioSettingsMenu();
    }
    return;
  }
  if (event.code === 'Escape' && !flightState.pointerLocked) {
    event.preventDefault();
    exitFlightMode();
    return;
  }
  if (manualFlightKeys.has(event.code)) disableAutopilot('AUTOPILOT MANUAL OVERRIDE');
  flightState.keys.add(event.code);
}

function onGlobalKeyUp(event) {
  const { isFlightActive } = requireDeps();
  if (!isFlightActive()) return;
  flightState.keys.delete(event.code);
}

function onPointerDown(event) {
  const { documentRef = document, isConsoleActive, isFlightActive, playFireSfx, radioChain, renderer, unlockAudio } = requireDeps();
  if (radioChain.ctx && radioChain.ctx.state === 'suspended') radioChain.resume();
  if (isFlightActive()) {
    if (typeof unlockAudio === 'function') unlockAudio();
    if (event.button === 0 || event.button === 2) {
      event.preventDefault();
      flightState.mouseButtons.add(event.button);
      if (typeof playFireSfx === 'function') playFireSfx(event.button === 0 ? 'laser' : 'missile');
    }
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock && !(event.target.closest && event.target.closest('.hud-panel, .hud-interactive'))) {
      renderer.domElement.requestPointerLock();
    }
    return;
  }
  if (!isConsoleActive() || event.button !== 0) return;
  if (event.target.closest && (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive'))) return;

  beginOrbitDrag(event);
}

function onPointerMove(event) {
  onOrbitPointerMove(event);
}

function onPointerUp(event) {
  const { documentRef = document, isFlightActive } = requireDeps();
  if (isFlightActive()) {
    flightState.mouseButtons.delete(event.button);
    return;
  }
  endOrbitDrag(event);
}

function onSceneContextMenu(event) {
  const { isFlightActive } = requireDeps();
  if (!isFlightActive()) return;
  event.preventDefault();
}

function onSceneWheel(event) {
  onOrbitSceneWheel(event);
}

function onMouseMove(event) {
  const { disableAutopilot, isFlightActive } = requireDeps();
  if (isFlightActive() && flightState.pointerLocked) {
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) disableAutopilot('AUTOPILOT MANUAL OVERRIDE');
    applyLocalFlightRotation(0, 1, 0, -event.movementX * flightState.mouseSensitivity);
    applyLocalFlightRotation(1, 0, 0, -event.movementY * flightState.mouseSensitivity);
    return;
  }
  updateCursorPosition(event.clientX, event.clientY);
  updatePointerFromClient(event.clientX, event.clientY);
}

function onTouchStart(event) {
  if (event.touches.length > 0) {
    updatePointerFromClient(event.touches[0].clientX, event.touches[0].clientY);
  }
}

function onSceneClick(event) {
  const { isConsoleActive, isFlightActive, renderer, selectProject } = requireDeps();
  if (isFlightActive()) {
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock && !(event.target.closest && event.target.closest('.hud-panel, .hud-interactive'))) {
      renderer.domElement.requestPointerLock();
    }
    return;
  }
  if (!isConsoleActive()) return;
  if (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive')) return;
  if (orbitState.moved) {
    orbitState.moved = false;
    return;
  }

  updatePointerFromClient(event.clientX, event.clientY);
  const intersects = getInteractiveHits();

  if (intersects.length > 0) {
    const hitNode = intersects[0].object.userData.node || intersects[0].object;
    selectProject(hitNode.userData.project.id, true);
  }
}

export function registerInputListeners() {
  const {
    canvasContainer,
    documentRef = document,
    heroContainer,
    resetCameraView,
    windowRef = window
  } = requireDeps();

  documentRef.addEventListener('mousemove', onMouseMove);
  documentRef.addEventListener('click', onSceneClick);
  documentRef.addEventListener('contextmenu', onSceneContextMenu);
  documentRef.addEventListener('touchstart', onTouchStart, { passive: true });
  documentRef.addEventListener('pointerdown', onPointerDown);
  windowRef.addEventListener('pointermove', onPointerMove);
  windowRef.addEventListener('pointerup', onPointerUp);
  windowRef.addEventListener('pointercancel', onPointerUp);
  documentRef.addEventListener('wheel', onSceneWheel, { passive: false });
  documentRef.addEventListener('keydown', onGlobalKeyDown);
  documentRef.addEventListener('keyup', onGlobalKeyUp);
  documentRef.addEventListener('pointerlockchange', onPointerLockChange);
  documentRef.addEventListener('pointerlockerror', onPointerLockError);
  windowRef.addEventListener('blur', clearFlightInput);
  documentRef.addEventListener('visibilitychange', () => {
    if (documentRef.hidden) clearFlightInput();
  });
  canvasContainer.addEventListener('dblclick', resetCameraView);

  registerHeroListeners();
}

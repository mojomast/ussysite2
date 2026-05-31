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
import { createAutopilotState } from './flight/autopilot.js';
import { settingsState } from './flight/settings.js';

const THREE = globalThis.THREE;

export const manualFlightKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);

export const KEY_MAP = Object.freeze({
  'Mouse Move': 'Look / aim ship (pointer locked)',
  'W / Arrow Up': 'Forward thrust',
  'S / Arrow Down': 'Reverse thrust / brake',
  'A / Arrow Left': 'Strafe left',
  'D / Arrow Right': 'Strafe right',
  Q: 'Roll left',
  E: 'Roll right',
  Shift: 'Afterburner (when unlocked)',
  G: 'Match speed / emergency brake',
  F: 'Cold jump (when unlocked)',
  R: 'Toggle throttle hold',
  'Z / X': 'Throttle level up / down (throttle hold active)',
  'Shift+C': 'Toggle cockpit / third-person view',
  'Left Mouse Button': 'Primary fire',
  'Right Mouse Button': 'Secondary fire / missile',
  C: 'Evasion roll',
  V: 'Set nav target from crosshair',
  Y: 'Toggle autopilot',
  J: 'Activate jump gate in range',
  H: 'Help overlay in flight',
  'Shift+H': 'Hyperspace jump (when unlocked)',
  M: 'System map; click nodes for waypoint actions',
  L: 'Surface approach / land',
  F1: 'Help overlay in flight',
  O: 'Objectives panel',
  I: 'Inventory / manifest',
  B: 'Mission board (when docked or no modal active)',
  U: 'Upgrades / skills (when landed)',
  Tab: 'Settings menu',
  Escape: 'Close topmost overlay / pause flight',
  Space: 'Dismiss message / activate focused UI',
  '1-6': 'Modal/menu choices',
  '"ussy" (typed)': 'Enter flight mode from console',
  'Shift+M': 'Toggle flight TTS'
});

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
  paused: false,
  pauseReasons: new Set(),
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
  autopilot: createAutopilotState(),
  hyperspaceUnlocked: false,
  hyperspaceCooldownUntil: 0,
  surface: {
    state: 'NONE',
    planetId: null,
    approachDist: 0,
    orbitAltitude: 0,
    landingProgress: 0,
    surfaceY: 0,
    exitQueued: false
  },
  status: 'TYPE USSY TO LAUNCH',
  statusUntil: 0,
  landed: false,
  shieldCriticalSpoken: false,
  finalApproachSpoken: false,
  currentDockedProject: null,
  missionBoardOpen: false,
  missionBoardStationId: null,
  selectedMissionId: null,
  lastHudUpdate: 0,
  mouseSensitivity: 0.0022,
  thrust: 14,
  strafe: 8,
  damping: 0.985,
  matchSpeedActive: false,
  matchSpeedTarget: null,
  matchSpeedUntil: 0,
  cameraRollTarget: 0,
  cameraRollCurrent: 0
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
  const tag = target?.tagName?.toLowerCase?.();
  return tag === 'input'
    || tag === 'textarea'
    || tag === 'select'
    || Boolean(target?.isContentEditable)
    || Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function isVisibleElement(element) {
  return Boolean(element && !element.hidden && !(element.classList?.contains?.('hidden')));
}

function isFlightUiOpen(documentRef = document) {
  const messageRoot = documentRef.getElementById?.('game-message-system');
  if (messageRoot?.classList?.contains?.('active')) return true;
  const selectors = [
    'system-map-overlay',
    'help-menu',
    'settings-menu',
    'inventory-panel',
    'loadout-panel',
    'mission-board-overlay',
    'trade-panel',
    'station-menu',
    'tutorial-overlay'
  ];
  return selectors.some(id => isVisibleElement(documentRef.getElementById?.(id)));
}

function isFlightUiTarget(target) {
  return Boolean(target?.closest?.('.hud-panel, .hud-interactive, #game-message-system, #system-map-overlay, #help-menu, #settings-menu, #inventory-panel, #loadout-panel, #mission-board-overlay, #trade-panel, #station-menu, #tutorial-overlay'));
}

function releasePointerLockForUi(documentRef, renderer) {
  if (documentRef?.pointerLockElement === renderer?.domElement && documentRef.exitPointerLock) {
    documentRef.exitPointerLock();
  }
  flightState.pointerLocked = false;
  clearFlightInput();
}

export function isBackOrCloseKey(event) {
  return event?.code === 'Escape' || event?.code === 'Backspace';
}

export function isHelpKey(event) {
  const key = typeof event?.key === 'string' ? event.key.toLowerCase() : '';
  return event?.code === 'KeyH' || event?.code === 'F1' || key === 'h' || key === 'f1';
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
      if (flightState.landed) {
        flightState.status = 'DOCKED. SELECT UNDOCK BEFORE RECAPTURING MOUSELOOK.';
        if (documentRef.exitPointerLock) documentRef.exitPointerLock();
      } else {
        flightState.status = `MOUSELOOK ${flightState.view.toUpperCase()} VIEW`;
      }
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
    activateHyperspaceTravel,
    activateJumpGate,
    gameMessageState,
    handleGameMessageChoice,
    handleSurfaceEscape,
    isFlightActive,
    isSettingsMenuOpen,
    isTutorialOverlayVisible,
    landOnNearestProject,
    closeSettingsMenu,
    hideTutorialOverlay,
    openAudioSettingsMenu,
    openMissionBoard,
    openPauseMenu,
    openSettingsMenu,
    openSkillTree,
    openStationMenu,
    radioChain,
    renderer,
    setNavigationFromCrosshair,
    showFactionMission,
    toggleAutopilot,
    toggleFlightTts,
    toggleFlightView,
    toggleHelpMenu,
    toggleObjectivesView,
    traderState,
    unlockAudio
  } = requireDeps();

  if (radioChain.ctx && radioChain.ctx.state === 'suspended') radioChain.resume();
  if (event.defaultPrevented) return;
  if (event.code === 'Escape' && isSettingsMenuOpen?.()) {
    event.preventDefault();
    closeSettingsMenu?.();
    return;
  }

  if (isTypingTarget(event.target) || event.metaKey || event.altKey) return;
  if (!isFlightActive() && event.ctrlKey) return;

  if (event.code === 'Tab') {
    event.preventDefault();
    if (isSettingsMenuOpen?.()) {
      closeSettingsMenu?.();
      return;
    }
    if (!event.repeat) openSettingsMenu?.();
    return;
  }

  if (event.code === 'Escape' && isTutorialOverlayVisible?.()) {
    event.preventDefault();
    hideTutorialOverlay?.();
    return;
  }

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

  if (isFlightActive() && event.code === 'KeyH' && event.shiftKey && typeof activateHyperspaceTravel === 'function') {
    event.preventDefault();
    if (!event.repeat) activateHyperspaceTravel();
    return;
  }

  if (isHelpKey(event)) {
    event.preventDefault();
    if (!event.repeat && typeof toggleHelpMenu === 'function') toggleHelpMenu();
    return;
  }

  // Help menu Escape handled in help.js configureHelpMenu

  if (!isFlightActive()) return;
  if (typeof unlockAudio === 'function') unlockAudio();

  if (isBackOrCloseKey(event)) {
    const loadoutPanel = documentRef.getElementById('loadout-panel');
    if (loadoutPanel && !loadoutPanel.hidden) {
      event.preventDefault();
      loadoutPanel.hidden = true;
      return;
    }
    const invPanel = documentRef.getElementById('inventory-panel');
    if (invPanel && !invPanel.hidden) {
      event.preventDefault();
      invPanel.hidden = true;
      return;
    }
    const systemMapOverlay = documentRef.getElementById('system-map-overlay');
    if (systemMapOverlay && !systemMapOverlay.classList.contains('hidden')) {
      event.preventDefault();
      systemMapOverlay.classList.add('hidden');
      systemMapOverlay.setAttribute('aria-hidden', 'true');
      if (!isFlightUiOpen(documentRef) && renderer?.domElement?.requestPointerLock) {
        const lockRequest = renderer.domElement.requestPointerLock();
        lockRequest?.catch?.(() => {});
      }
      return;
    }
  }

  if (handleGameMessageChoice(event)) {
    event.preventDefault();
    return;
  }
  if (isBackOrCloseKey(event) && gameMessageState.active) {
    event.preventDefault();
    dismissGameMessage();
    return;
  }
  if (flightState.paused) {
    event.preventDefault();
    return;
  }
  if (event.code === 'Escape' && typeof handleSurfaceEscape === 'function' && handleSurfaceEscape()) {
    event.preventDefault();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    dismissGameMessage();
    return;
  }
  if (event.code === 'Backspace') {
    event.preventDefault();
    return;
  }

  if (event.code !== 'Escape') event.preventDefault();
  if (event.code === 'KeyV') {
    event.preventDefault();
    if (!event.repeat) setNavigationFromCrosshair();
    return;
  }
  if (event.code === 'KeyY') {
    event.preventDefault();
    if (!event.repeat) toggleAutopilot();
    return;
  }
  if (event.code === 'KeyJ') {
    event.preventDefault();
    if (!event.repeat && typeof activateJumpGate === 'function') activateJumpGate(true);
    return;
  }
  if (event.code === 'KeyC' && event.shiftKey) {
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
  if (event.code === 'KeyB') {
    event.preventDefault();
    if (!event.repeat) {
      if (typeof openMissionBoard === 'function') openMissionBoard(traderState.dockedStation);
      else if (flightState.landed && traderState.dockedStation && !gameMessageState.active) showFactionMission(traderState.dockedStation);
    }
    return;
  }
  if (event.code === 'KeyT') {
    event.preventDefault();
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
      else flightState.keys.add(event.code);
    }
    return;
  }
  if (event.code === 'Escape') {
    event.preventDefault();
    if (!event.repeat && typeof openPauseMenu === 'function') openPauseMenu();
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
  const uiOpen = isFlightUiOpen(documentRef);
  const interactiveHudTarget = isFlightUiTarget(event.target);
  if (isFlightActive()) {
    if (event.defaultPrevented || uiOpen || interactiveHudTarget) {
      event.preventDefault();
      releasePointerLockForUi(documentRef, renderer);
      clearFlightInput();
      return;
    }
    if (flightState.paused) return;
    if (typeof unlockAudio === 'function') unlockAudio();
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock) {
      event.preventDefault();
      clearFlightInput();
      renderer.domElement.requestPointerLock();
      return;
    }
    if (event.button === 0 || event.button === 2) {
      event.preventDefault();
      flightState.mouseButtons.add(event.button);
      if (typeof playFireSfx === 'function') playFireSfx(event.button === 0 ? 'laser' : 'missile');
    }
    return;
  }
  if (!isConsoleActive() || event.button !== 0) return;
  if (interactiveHudTarget) return;

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
  const { documentRef = document, isFlightActive, renderer } = requireDeps();
  if (isFlightActive() && (event.defaultPrevented || isFlightUiOpen(documentRef) || isFlightUiTarget(event.target))) {
    releasePointerLockForUi(documentRef, renderer);
    return;
  }
  onOrbitSceneWheel(event);
}

function onMouseMove(event) {
  const { disableAutopilot, documentRef = document, isFlightActive, renderer } = requireDeps();
  if (isFlightActive() && isFlightUiOpen(documentRef)) {
    releasePointerLockForUi(documentRef, renderer);
    updateCursorPosition(event.clientX, event.clientY);
    updatePointerFromClient(event.clientX, event.clientY);
    return;
  }
  if (isFlightActive() && flightState.pointerLocked) {
    if (flightState.paused) return;
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) disableAutopilot('AUTOPILOT MANUAL OVERRIDE');
    const pitchSensitivity = flightState.mouseSensitivity * (settingsState.mouseInvert ? -1 : 1);
    applyLocalFlightRotation(0, 1, 0, -event.movementX * flightState.mouseSensitivity);
    applyLocalFlightRotation(1, 0, 0, -event.movementY * pitchSensitivity);
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
  const { documentRef = document, isConsoleActive, isFlightActive, renderer, selectProject } = requireDeps();
  if (isFlightActive()) {
    if (event.defaultPrevented || isFlightUiOpen(documentRef) || isFlightUiTarget(event.target)) {
      releasePointerLockForUi(documentRef, renderer);
      return;
    }
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock) {
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

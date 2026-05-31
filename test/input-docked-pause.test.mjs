import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.THREE = {
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  },
  Quaternion: class Quaternion {
    setFromAxisAngle() { return this; }
    multiply() { return this; }
    normalize() { return this; }
  }
};
globalThis.performance ??= { now: () => 1000 };

const { configureHeroUI } = await import('../js/ui/hero.js');
const { configureInput, flightState, registerInputListeners } = await import('../js/input.js');

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: name => classes.add(name),
    remove: name => classes.delete(name),
    contains: name => classes.has(name),
    toggle(name, active) { active ? classes.add(name) : classes.delete(name); return classes.has(name); }
  };
}

function createElement(id, classes = []) {
  return {
    id,
    hidden: false,
    classList: createClassList(classes),
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    closest() { return null; }
  };
}

function configureHarness({ flightActive = true, messageActive = false, onEnterFlight = () => {}, onExitFlight = () => {}, onOpenPause = () => {}, requestPointerLock = () => {}, unlockAudio = () => {} } = {}) {
  const listeners = {};
  const elements = {
    'game-message-system': createElement('game-message-system', messageActive ? ['active'] : [])
  };
  const documentRef = {
    hidden: false,
    pointerLockElement: null,
    body: { classList: createClassList() },
    addEventListener(type, listener) { listeners[type] = listener; },
    getElementById: id => elements[id] || null,
    exitPointerLock() { this.pointerLockElement = null; }
  };
  const renderer = { domElement: { requestPointerLock } };
  configureHeroUI({ heroContainer: null });
  configureInput({
    activateConsoleMode() {},
    camTarget: {},
    camera: {},
    canvasContainer: createElement('canvas-container'),
    closeSettingsMenu() {},
    coreOuterParticles: null,
    customCursor: null,
    disableAutopilot() {},
    dismissGameMessage() {},
    documentRef,
    enterFlightMode: onEnterFlight,
    exitFlightMode: onExitFlight,
    gameMessageState: { active: messageActive },
    handleGameMessageChoice: () => false,
    handleSurfaceEscape: () => false,
    heroContainer: null,
    isConsoleActive: () => false,
    isFlightActive: () => flightActive,
    isSettingsMenuOpen: () => false,
    isTutorialOverlayVisible: () => false,
    landOnNearestProject() {},
    mouse: { x: 0, y: 0 },
    openAudioSettingsMenu() {},
    openMissionBoard() {},
    openPauseMenu: onOpenPause,
    openSettingsMenu() {},
    openSkillTree() {},
    projectHitTargets: [],
    radioChain: { ctx: null },
    raycaster: { setFromCamera() {}, intersectObjects: () => [] },
    renderer,
    resetCameraView() {},
    selectProject() {},
    setNavigationFromCrosshair() {},
    showFactionMission() {},
    telemetryCoord: { innerText: '' },
    toggleAutopilot() {},
    toggleFlightTts() {},
    toggleFlightView() {},
    toggleHelpMenu() {},
    toggleObjectivesView() {},
    traderState: { dockedStation: 'devussy' },
    unlockAudio,
    updateFlightHud() {},
    windowRef: { addEventListener() {} }
  });
  registerInputListeners();
  return { documentRef, elements, listeners, renderer };
}

function createKeyEvent(key, options = {}) {
  return {
    key,
    code: `Key${String(key).toUpperCase()}`,
    target: null,
    defaultPrevented: false,
    preventDefault() { this.prevented = true; this.defaultPrevented = true; },
    ...options
  };
}

test('Escape with unlocked pointer opens pause menu instead of exiting flight', () => {
  let pauseOpened = false;
  let exited = false;
  const { listeners } = configureHarness({
    onOpenPause: () => { pauseOpened = true; },
    onExitFlight: () => { exited = true; }
  });
  flightState.pointerLocked = false;
  flightState.paused = false;
  flightState.landed = true;

  const event = { code: 'Escape', key: 'Escape', target: null, preventDefault() { this.prevented = true; } };
  listeners.keydown(event);

  assert.equal(event.prevented, true);
  assert.equal(pauseOpened, true);
  assert.equal(exited, false);
});

test('active game messages block pointer recapture while docked', () => {
  let lockRequests = 0;
  const { listeners } = configureHarness({ messageActive: true, requestPointerLock: () => { lockRequests += 1; } });
  flightState.pointerLocked = false;
  flightState.landed = true;

  const event = { button: 0, target: null, preventDefault() { this.prevented = true; } };
  listeners.pointerdown(event);

  assert.equal(event.prevented, true);
  assert.equal(lockRequests, 0);
  assert.equal(flightState.pointerLocked, false);
});

test('typing ussy while inactive unlocks audio and enters flight once', () => {
  let entered = 0;
  let unlocked = 0;
  const { listeners } = configureHarness({
    flightActive: false,
    onEnterFlight: () => { entered += 1; },
    unlockAudio: () => { unlocked += 1; }
  });

  for (const key of ['u', 's', 's']) listeners.keydown(createKeyEvent(key));
  const finalEvent = createKeyEvent('y');
  listeners.keydown(finalEvent);

  assert.equal(finalEvent.prevented, true);
  assert.equal(unlocked, 1);
  assert.equal(entered, 1);
});

test('secret launch ignores input fields and already handled events', () => {
  let entered = 0;
  const { listeners } = configureHarness({ flightActive: false, onEnterFlight: () => { entered += 1; } });

  for (const key of ['u', 's', 's', 'y']) listeners.keydown(createKeyEvent(key, { target: { tagName: 'INPUT' } }));
  assert.equal(entered, 0);

  for (const key of ['u', 's', 's']) listeners.keydown(createKeyEvent(key));
  listeners.keydown(createKeyEvent('y', { defaultPrevented: true }));
  assert.equal(entered, 0);
});

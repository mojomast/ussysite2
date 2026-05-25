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
const { configureInput, registerInputListeners } = await import('../js/input.js');
const { HELP_CONTROLS, HELP_TIPS, configureHelpMenu, getBindingDiscrepancies, openHelpMenu, renderHelpContent, switchHelpTab } = await import('../js/flight/help.js');
const { PLANETS, STATIONS } = await import('../js/flight/world.js');

function createClassList() {
  const classes = new Set();
  return {
    add: name => classes.add(name),
    remove: name => classes.delete(name),
    contains: name => classes.has(name),
    toggle: (name, active) => (active ? classes.add(name) : classes.delete(name))
  };
}

function createElement(id = '') {
  return {
    id,
    hidden: false,
    textContent: '',
    className: '',
    children: [],
    dataset: {},
    attributes: {},
    style: {},
    listeners: {},
    classList: createClassList(),
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(listener);
    },
    closest() { return null; }
  };
}

function walk(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  for (const child of node.children || []) walk(child, predicate, matches);
  return matches;
}

function createHelpDocument() {
  const ids = [
    'help-menu',
    'help-menu-close',
    'help-tab-controls',
    'help-tab-how',
    'help-tab-universe',
    'help-tab-tips',
    'help-panel-controls',
    'help-panel-how',
    'help-panel-universe',
    'help-panel-tips'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, createElement(id)]));
  elements['help-menu'].hidden = true;
  return {
    elements,
    body: { classList: createClassList() },
    getElementById: id => elements[id] || null,
    createElement: tag => createElement(tag),
    addEventListener(type, listener) {
      if (!this.listeners) this.listeners = {};
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(listener);
    },
    querySelectorAll() { return []; }
  };
}

test('H activates hyperspace in flight and F1 toggles help', () => {
  let open = false;
  let hyperspaceActivations = 0;
  const listeners = {};
  const documentRef = {
    hidden: false,
    body: { classList: createClassList() },
    addEventListener(type, listener) { listeners[type] = listener; },
    getElementById: () => null
  };
  const windowRef = { addEventListener() {} };
  const canvasContainer = createElement('canvas-container');
  configureHeroUI({ heroContainer: null });
  configureInput({
    activateConsoleMode() {},
    activateHyperspaceTravel() { hyperspaceActivations += 1; },
    camTarget: {},
    camera: {},
    canvasContainer,
    coreOuterParticles: null,
    customCursor: null,
    disableAutopilot() {},
    dismissGameMessage() {},
    documentRef,
    enterFlightMode() {},
    exitFlightMode() {},
    gameMessageState: { active: false },
    handleGameMessageChoice: () => false,
    handleSurfaceEscape: () => false,
    heroContainer: null,
    isConsoleActive: () => false,
    isFlightActive: () => true,
    isHelpMenuOpen: () => open,
    landOnNearestProject() {},
    mouse: { x: 0, y: 0 },
    openMissionBoard() {},
    openSkillTree() {},
    projectHitTargets: [],
    radioChain: { ctx: null },
    raycaster: { setFromCamera() {}, intersectObjects: () => [] },
    renderer: { domElement: {} },
    resetCameraView() {},
    selectProject() {},
    setNavigationFromCrosshair() {},
    telemetryCoord: { innerText: '' },
    toggleAutopilot() {},
    toggleFlightTts() {},
    toggleFlightView() {},
    toggleHelpMenu: () => { open = !open; },
    toggleObjectivesView() {},
    traderState: {},
    windowRef
  });
  registerInputListeners();

  listeners.keydown({ code: 'KeyH', key: 'h', target: null, preventDefault() { this.prevented = true; } });
  assert.equal(hyperspaceActivations, 1);
  assert.equal(open, false);
  listeners.keydown({ code: 'KeyH', key: 'h', repeat: true, target: null, preventDefault() { this.prevented = true; } });
  assert.equal(hyperspaceActivations, 1);
  assert.equal(open, false);
  listeners.keydown({ code: '', key: 'F1', target: null, preventDefault() { this.prevented = true; } });
  assert.equal(open, true);
  listeners.keydown({ code: 'F1', key: 'F1', target: null, preventDefault() { this.prevented = true; } });
  assert.equal(open, false);
});

test('configureHelpMenu Escape closes open menu', () => {
  const documentRef = createHelpDocument();
  let prevented = false;
  configureHelpMenu({ documentRef, flightState: { paused: false, pauseReasons: new Set(), keys: new Set(), mouseButtons: new Set() }, isFlightActive: () => false });
  assert.equal(openHelpMenu(), true);
  assert.equal(documentRef.elements['help-menu'].hidden, false);

  documentRef.listeners.keydown[0]({ code: 'Escape', preventDefault() { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(documentRef.elements['help-menu'].hidden, true);
});

test('configureHelpMenu no double-init on second call', () => {
  const documentRef = createHelpDocument();
  configureHelpMenu({ documentRef, flightState: { paused: false, pauseReasons: new Set() }, isFlightActive: () => false });
  configureHelpMenu({ documentRef, flightState: { paused: false, pauseReasons: new Set() }, isFlightActive: () => false });

  assert.equal(documentRef.listeners.keydown.length, 1);
  assert.equal(documentRef.elements['help-menu-close'].listeners.click.length, 1);
  assert.equal(documentRef.elements['help-tab-controls'].listeners.click.length, 1);
});

test('getBindingDiscrepancies returns empty array on clean state', () => {
  assert.deepEqual(getBindingDiscrepancies(), []);
});

test('tab switch updates active panel and aria selection', () => {
  const documentRef = createHelpDocument();
  configureHelpMenu({ documentRef, flightState: { paused: false, pauseReasons: new Set() }, isFlightActive: () => false });

  assert.equal(switchHelpTab('universe', documentRef), true);
  assert.equal(documentRef.elements['help-tab-universe'].classList.contains('active'), true);
  assert.equal(documentRef.elements['help-tab-universe'].attributes['aria-selected'], 'true');
  assert.equal(documentRef.elements['help-panel-universe'].hidden, false);
  assert.equal(documentRef.elements['help-panel-controls'].hidden, true);
});

test('controls tab renders canonical rows per category', () => {
  const documentRef = createHelpDocument();
  assert.equal(renderHelpContent(documentRef), true);
  const controls = documentRef.elements['help-panel-controls'];
  for (const [category, rows] of Object.entries(HELP_CONTROLS)) {
    const rendered = walk(controls, node => node.dataset?.helpControlRow === category);
    assert.equal(rendered.length, rows.length, category);
  }
});

test('universe tab renders project planets and stations', () => {
  const documentRef = createHelpDocument();
  renderHelpContent(documentRef);
  const universe = documentRef.elements['help-panel-universe'];
  const planetCount = walk(universe, node => node.dataset?.helpUniverseCount === 'planets')[0];
  const stationCount = walk(universe, node => node.dataset?.helpUniverseCount === 'stations')[0];

  assert.equal(planetCount.children[0].textContent, String(PLANETS.length));
  assert.equal(stationCount.children[0].textContent, String(STATIONS.length));
});

test('tips tab renders at least eight tips', () => {
  const documentRef = createHelpDocument();
  renderHelpContent(documentRef);
  const tips = walk(documentRef.elements['help-panel-tips'], node => node.dataset?.helpTip === 'true');

  assert.ok(HELP_TIPS.length >= 8);
  assert.ok(tips.length >= 8);
});

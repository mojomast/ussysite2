import { PLANETS, STATIONS, JUMP_POINTS } from './world.js';
import { JUMP_GATES } from './jumpgates.js';
import { KEY_MAP } from '../input.js';

export const HELP_TABS = [
  { id: 'controls', label: 'CONTROLS' },
  { id: 'how', label: 'HOW TO PLAY' },
  { id: 'universe', label: 'UNIVERSE' },
  { id: 'tips', label: 'TIPS & TRICKS' }
];

export const HELP_CONTROLS = {
  FLIGHT: [
    ['Mouse Move', 'Look / aim ship (pointer locked)'],
    ['W / Arrow Up', 'Forward thrust'],
    ['S / Arrow Down', 'Reverse thrust / brake'],
    ['A / Arrow Left', 'Strafe left'],
    ['D / Arrow Right', 'Strafe right'],
    ['Q', 'Roll left'],
    ['E', 'Roll right'],
    ['Shift', 'Afterburner (when unlocked)'],
    ['G', 'Match speed / emergency brake'],
    ['F', 'Cold jump (when unlocked)'],
    ['R', 'Toggle throttle hold'],
    ['Z / X', 'Throttle level up / down (throttle hold active)'],
    ['Shift+C', 'Toggle cockpit / third-person view']
  ],
  COMBAT: [
    ['Left Mouse Button', 'Primary fire'],
    ['Right Mouse Button', 'Secondary fire / missile'],
    ['C', 'Evasion roll']
  ],
  NAVIGATION: [
    ['V', 'Set nav target from crosshair'],
    ['Y', 'Toggle autopilot'],
    ['J', 'Activate jump gate in range'],
    ['H', 'Hyperspace jump (when unlocked; F1 always opens help)'],
    ['M', 'System map'],
    ['L', 'Surface approach / land']
  ],
  UI: [
    ['H / F1', 'Help overlay'],
    ['O', 'Objectives panel'],
    ['I', 'Inventory / manifest'],
    ['B', 'Mission board (when docked or no modal active)'],
    ['U', 'Upgrades / skills (when landed)'],
    ['[TAB]', 'Settings menu (NEW - added in this feature)'],
    ['Escape', 'Close topmost overlay / exit flight (pointer unlocked)'],
    ['Space', 'Dismiss message / activate focused UI'],
    ['1-6', 'Modal/menu choices']
  ],
  SYSTEM: [
    ['"ussy" (typed)', 'Enter flight mode from console'],
    ['Shift+M', 'Toggle flight TTS']
  ]
};

export const HELP_TIPS = [
  'If mouse look is released, click the viewport to recapture pointer lock.',
  'Manual flight input disables basic autopilot; route autopilot can be aborted from the nav UI.',
  'Stop firing before overheating and watch heat bars before entering a bounty wave.',
  'Use G to match a target velocity or brake hard when no target is available.',
  'Dock often to restock ammo, missiles, shields, armor, energy, and fuel.',
  'Toggle O to review current and available objectives during free roam.',
  'Use B for the mission board only outside active modal text or messages.',
  'Use M to read station, planet, jump point, and route context before long travel.',
  'Engine skills unlock afterburner and cold jump behaviors that change escape options.',
  'Controls are keyboard/mouse oriented; no gamepad bindings are currently assigned.'
];

let deps = {
  documentRef: typeof document === 'undefined' ? null : document,
  flightState: null,
  isFlightActive: () => false,
  updateFlightHud: () => {}
};
let activeTab = 'controls';
const initializedDocuments = new WeakSet();

function getFlatHelpControlEntries() {
  return Object.values(HELP_CONTROLS).flat();
}

export function getBindingDiscrepancies() {
  const helpEntries = new Map(getFlatHelpControlEntries());
  const discrepancies = [];

  Object.entries(KEY_MAP).forEach(([input, action]) => {
    if (!helpEntries.has(input)) {
      discrepancies.push({ input, runtimeAction: action, helpAction: null, type: 'missing-help-entry' });
      return;
    }
    const helpAction = helpEntries.get(input);
    if (helpAction !== action) {
      discrepancies.push({ input, runtimeAction: action, helpAction, type: 'action-mismatch' });
    }
  });

  helpEntries.forEach((helpAction, input) => {
    if (!Object.hasOwn(KEY_MAP, input)) {
      discrepancies.push({ input, runtimeAction: null, helpAction, type: 'missing-runtime-entry' });
    }
  });

  return discrepancies;
}

function createEl(documentRef, tag, className, text) {
  const el = documentRef.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function setPauseReason(reason, active) {
  const { flightState, updateFlightHud } = deps;
  if (!flightState) return;
  if (!flightState.pauseReasons) flightState.pauseReasons = new Set();
  if (active) flightState.pauseReasons.add(reason);
  else flightState.pauseReasons.delete(reason);
  flightState.paused = flightState.pauseReasons.size > 0;
  updateFlightHud?.(true);
}

function renderControlsPanel(panel, documentRef) {
  panel.replaceChildren();
  Object.entries(HELP_CONTROLS).forEach(([category, rows]) => {
    const section = createEl(documentRef, 'section', 'help-section');
    section.dataset.helpControlCategory = category;
    section.appendChild(createEl(documentRef, 'h3', 'inspector-section-lbl', category));
    const grid = createEl(documentRef, 'div', 'help-control-grid');
    rows.forEach(([input, action]) => {
      const row = createEl(documentRef, 'div', 'help-control-row');
      row.dataset.helpControlRow = category;
      row.appendChild(createEl(documentRef, 'kbd', '', input));
      row.appendChild(createEl(documentRef, 'span', '', action));
      grid.appendChild(row);
    });
    section.appendChild(grid);
    panel.appendChild(section);
  });

  const callouts = createEl(documentRef, 'div', 'help-callouts');
  [
    'Resolved: autopilot moved to Y; P is reserved for pause.',
    'Resolved: throttle moved to R; T is reserved for target cycle.',
    'Resolved: Escape/Backspace are modal Back; B is mission board outside active modals/messages.',
    'Escape closes the help overlay before lower-priority flight actions.'
  ].forEach(text => callouts.appendChild(createEl(documentRef, 'p', '', text)));
  panel.appendChild(callouts);
}

function renderCardList(panel, documentRef, items) {
  panel.replaceChildren(...items.map(([title, body]) => {
    const card = createEl(documentRef, 'article', 'help-card');
    card.appendChild(createEl(documentRef, 'h3', '', title));
    card.appendChild(createEl(documentRef, 'p', '', body));
    return card;
  }));
}

function renderUniversePanel(panel, documentRef) {
  panel.replaceChildren();
  const summary = createEl(documentRef, 'div', 'help-universe-counts');
  [
    ['PLANETS', PLANETS.length],
    ['STATIONS', STATIONS.length],
    ['JUMP POINTS', JUMP_POINTS.length],
    ['JUMP GATES', JUMP_GATES.length]
  ].forEach(([label, value]) => {
    const item = createEl(documentRef, 'div', 'help-universe-count');
    item.dataset.helpUniverseCount = label.toLowerCase().replaceAll(' ', '-');
    item.appendChild(createEl(documentRef, 'strong', '', String(value)));
    item.appendChild(createEl(documentRef, 'span', '', label));
    summary.appendChild(item);
  });
  panel.appendChild(summary);

  [
    ['Planets', PLANETS.map(item => `${item.name} // ${item.type}${item.hasStation ? ' // station support' : ''}`)],
    ['Stations', STATIONS.map(item => `${item.name} // ${item.type}${item.hasTrading ? ' // trading' : ''}${item.hasMissions ? ' // missions' : ''}`)],
    ['Jump Points', JUMP_POINTS.map(item => item.name)],
    ['Jump Gates', JUMP_GATES.map(item => `${item.name} // links ${item.connectsTo.length}`)]
  ].forEach(([title, rows]) => {
    const section = createEl(documentRef, 'section', 'help-section');
    section.appendChild(createEl(documentRef, 'h3', 'inspector-section-lbl', title));
    const list = createEl(documentRef, 'ul', 'help-list');
    rows.forEach(text => list.appendChild(createEl(documentRef, 'li', '', text)));
    section.appendChild(list);
    panel.appendChild(section);
  });
}

function renderTipsPanel(panel, documentRef) {
  const list = createEl(documentRef, 'ol', 'help-tips-list');
  HELP_TIPS.forEach(tip => {
    const row = createEl(documentRef, 'li', '', tip);
    row.dataset.helpTip = 'true';
    list.appendChild(row);
  });
  panel.replaceChildren(list);
}

export function renderHelpContent(documentRef = deps.documentRef) {
  if (!documentRef) return false;
  const controls = documentRef.getElementById('help-panel-controls');
  const how = documentRef.getElementById('help-panel-how');
  const universe = documentRef.getElementById('help-panel-universe');
  const tips = documentRef.getElementById('help-panel-tips');
  if (!controls || !how || !universe || !tips) return false;

  renderControlsPanel(controls, documentRef);
  renderCardList(how, documentRef, [
    ['Launch', 'Type the hidden launch code from non-flight mode, then pick tutorial or free roam.'],
    ['Fly', 'Use mouse look, thrust, strafe, roll, afterburner, throttle hold, and match speed to control the ship.'],
    ['Fight', 'Fire primary and secondary weapons, manage heat and resources, and use C to evade.'],
    ['Navigate', 'Aim at a project and press V, use M for the map, and engage autopilot once routed.'],
    ['Land/Dock', 'Approach a project or station and press L to access services, cargo, contracts, and upgrades.'],
    ['Progress', 'Complete tutorials, contracts, distress calls, bounty waves, and trade runs for credits, XP, reputation, and skill points.'],
    ['Survive', 'Watch fuel, armor, shields, heat, and hostile contacts; use stations to refuel and recover.']
  ]);
  renderUniversePanel(universe, documentRef);
  renderTipsPanel(tips, documentRef);
  return true;
}

export function switchHelpTab(tabId, documentRef = deps.documentRef) {
  if (!HELP_TABS.some(tab => tab.id === tabId) || !documentRef) return false;
  activeTab = tabId;
  HELP_TABS.forEach(tab => {
    const button = documentRef.getElementById(`help-tab-${tab.id}`);
    const panel = documentRef.getElementById(`help-panel-${tab.id}`);
    const selected = tab.id === tabId;
    button?.classList?.toggle('active', selected);
    button?.setAttribute?.('aria-selected', selected ? 'true' : 'false');
    panel?.classList?.toggle('active', selected);
    if (panel) panel.hidden = !selected;
  });
  return true;
}

export function isHelpMenuOpen(documentRef = deps.documentRef) {
  const menu = documentRef?.getElementById?.('help-menu');
  return Boolean(menu && !menu.hidden);
}

export function openHelpMenu() {
  const { documentRef, isFlightActive } = deps;
  const menu = documentRef?.getElementById?.('help-menu');
  if (!menu) return false;
  renderHelpContent(documentRef);
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  switchHelpTab(activeTab, documentRef);
  if (isFlightActive?.()) {
    deps.flightState?.keys?.clear?.();
    deps.flightState?.mouseButtons?.clear?.();
    setPauseReason('help', true);
  }
  return true;
}

export function closeHelpMenu() {
  const { documentRef } = deps;
  const menu = documentRef?.getElementById?.('help-menu');
  if (!menu || menu.hidden) return false;
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  setPauseReason('help', false);
  return true;
}

export function toggleHelpMenu() {
  return isHelpMenuOpen() ? closeHelpMenu() : openHelpMenu();
}

export function configureHelpMenu(options = {}) {
  deps = { ...deps, ...options };
  const { documentRef } = deps;
  if (!documentRef || initializedDocuments.has(documentRef)) return;
  initializedDocuments.add(documentRef);
  renderHelpContent(documentRef);
  switchHelpTab(activeTab, documentRef);
  HELP_TABS.forEach(tab => {
    documentRef.getElementById(`help-tab-${tab.id}`)?.addEventListener?.('click', () => switchHelpTab(tab.id, documentRef));
  });
  documentRef.getElementById('help-menu-close')?.addEventListener?.('click', closeHelpMenu);
  documentRef.addEventListener?.('keydown', event => {
    if (event.code !== 'Escape' || !isHelpMenuOpen(documentRef)) return;
    event.preventDefault();
    closeHelpMenu();
  });
}

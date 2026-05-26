import { isCoarsePointer } from '../constants.js';
import { settingsState } from './settings.js';

let deps = {
  documentRef: typeof document === 'undefined' ? null : document,
  isFlightActive: () => false,
  requestPointerLock: () => {},
  saveSettingsToHash: () => {}
};
let _visible = false;
let autoDismissTimer = null;
const initializedDocuments = new WeakSet();

function getFlightRows() {
  return isCoarsePointer ? [
    ['VIRTUAL JOYSTICK / TOUCH DRAG', 'Look / move'],
    ['Q / E', 'Roll left / right'],
    ['Shift', 'Afterburner'],
    ['G', 'Match speed / brake'],
    ['R', 'Throttle hold'],
    ['Shift+C', 'Toggle view']
  ] : [
    ['Mouse Move', 'Look / aim'],
    ['W / Arrow Up', 'Forward thrust'],
    ['S / Arrow Down', 'Reverse / brake'],
    ['A / Arrow Left', 'Strafe left'],
    ['D / Arrow Right', 'Strafe right'],
    ['Q / E', 'Roll left / right'],
    ['Shift', 'Afterburner'],
    ['G', 'Match speed / brake'],
    ['R', 'Throttle hold'],
    ['Shift+C', 'Toggle view']
  ];
}

const combatNavRows = [
  ['LMB', 'Primary fire'],
  ['RMB', 'Secondary fire'],
  ['C', 'Evasion roll'],
  ['V', 'Set nav target'],
  ['Y', 'Toggle plotted-route autopilot'],
  ['M', 'Open map actions'],
  ['J', 'Activate nearby jump gate'],
  ['H', 'Hyperspace to nav target'],
  ['L', 'Land / dock when prompted'],
  ['F', 'Cold jump escape'],
  ['Z / X', 'Throttle hold level'],
  ['Space', 'Dismiss message']
];

const quickStartRows = [
  ['1', 'Start guided tutorial'],
  ['2', 'Enter free roam'],
  ['M + Click', 'Open waypoint actions'],
  ['Map Wheel / Drag', 'Zoom and pan the system map'],
  ['Map Menu', 'Fast travel, autopilot, inspect, dock, land, clear route'],
  ['Y', 'Engage or abort plotted route'],
  ['ESC', 'Close overlay / exit when unlocked']
];

const servicesRows = [
  ['Dock / Land', 'Access repair, cargo, loadout, missions'],
  ['B', 'Mission board when docked'],
  ['I', 'Inventory / cargo manifest'],
  ['U', 'Upgrades when landed'],
  ['O', 'Objectives panel'],
  ['TAB', 'Settings']
];

const supportRows = [
  ['F1', 'Help overlay'],
  ['Shift+M', 'Toggle flight TTS'],
  ['G', 'Match speed / brake'],
  ['H', 'Hyperspace jump'],
  ['J', 'Gate travel in range'],
  ['Mouse Click', 'Recapture mouselook']
];

function renderRows(rows) {
  return rows.map(([key, action]) => `
    <div class="tutorial-control-row">
      <kbd class="tutorial-kbd">${key}</kbd>
      <span class="tutorial-action">${action}</span>
    </div>`).join('');
}

function buildOverlay(documentRef) {
  const existing = documentRef.getElementById('tutorial-overlay');
  if (existing) return existing;
  const overlay = documentRef.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'tutorial-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.inert = true;
  overlay.innerHTML = `
    <section class="tutorial-overlay-panel" aria-labelledby="tutorial-overlay-title">
      <h2 id="tutorial-overlay-title">[USSYVERSE &mdash; CONTROLS REFERENCE]</h2>
      <p class="tutorial-overlay-subtitle">DISMISS THIS PANEL, THEN PRESS 1 FOR THE GUIDED TUTORIAL OR 2 FOR FREE ROAM.</p>
      <div class="tutorial-controls-grid">
        <section>
          <h3>QUICK START</h3>
          ${renderRows(quickStartRows)}
        </section>
        <section>
          <h3>FLIGHT &amp; MOVEMENT</h3>
          ${renderRows(getFlightRows())}
        </section>
        <section>
          <h3>COMBAT &amp; NAV</h3>
          ${renderRows(combatNavRows)}
        </section>
        <section>
          <h3>DOCKING &amp; SERVICES</h3>
          ${renderRows(servicesRows)}
        </section>
        <section>
          <h3>SUPPORT</h3>
          ${renderRows(supportRows)}
        </section>
      </div>
      <footer class="tutorial-overlay-footer">
        <button class="tutorial-button" id="tutorial-dismiss" type="button">[DISMISS]</button>
        <button class="tutorial-button" id="tutorial-never" type="button">[DON'T SHOW AGAIN]</button>
      </footer>
    </section>`;
  overlay.addEventListener('pointerdown', event => event.stopPropagation());
  documentRef.body.appendChild(overlay);
  return overlay;
}

function animateOverlay(overlay, frames, options, done) {
  if (!overlay.animate) {
    done?.();
    return null;
  }
  const animation = overlay.animate(frames, options);
  animation.addEventListener('finish', () => done?.(), { once: true });
  return animation;
}

export function configureTutorialOverlay(options = {}) {
  deps = { ...deps, ...options };
  const { documentRef } = deps;
  if (!documentRef || initializedDocuments.has(documentRef)) return;
  initializedDocuments.add(documentRef);
  buildOverlay(documentRef);
  documentRef.getElementById('tutorial-dismiss')?.addEventListener('click', hideTutorialOverlay);
  documentRef.getElementById('tutorial-never')?.addEventListener('click', () => {
    settingsState.tutorialOverlayDismissed = true;
    deps.saveSettingsToHash?.();
    hideTutorialOverlay();
  });
}

export function showTutorialOverlay() {
  const { documentRef } = deps;
  const overlay = documentRef?.getElementById?.('tutorial-overlay') || (documentRef ? buildOverlay(documentRef) : null);
  if (!overlay) return false;
  if (autoDismissTimer !== null) {
    window.clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
  _visible = true;
  overlay.hidden = false;
  overlay.inert = false;
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.opacity = '1';
  animateOverlay(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  autoDismissTimer = window.setTimeout(() => {
    if (_visible) hideTutorialOverlay();
    autoDismissTimer = null;
  }, 60000);
  return true;
}

export function hideTutorialOverlay() {
  const { documentRef } = deps;
  const overlay = documentRef?.getElementById?.('tutorial-overlay');
  if (!overlay || overlay.hidden) return false;
  if (autoDismissTimer !== null) {
    window.clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
  _visible = false;
  const active = documentRef.activeElement;
  if (active && typeof overlay.contains === 'function' && overlay.contains(active)) active.blur?.();
  overlay.hidden = true;
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.opacity = '';
  if (deps.isFlightActive?.()) deps.requestPointerLock?.();
  return true;
}

export function isTutorialOverlayVisible() {
  return _visible;
}

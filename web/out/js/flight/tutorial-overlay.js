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
  ['Y', 'Toggle autopilot'],
  ['M', 'System map'],
  ['L', 'Land / dock'],
  ['H / F1', 'Help overlay'],
  ['TAB', 'Settings'],
  ['ESC', 'Exit flight'],
  ['Space', 'Dismiss message']
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
  overlay.innerHTML = `
    <section class="tutorial-overlay-panel" aria-labelledby="tutorial-overlay-title">
      <h2 id="tutorial-overlay-title">[USSYVERSE &mdash; CONTROLS REFERENCE]</h2>
      <p class="tutorial-overlay-subtitle">REVIEW YOUR CONTROLS BEFORE ENGAGING, OPERATOR.</p>
      <div class="tutorial-controls-grid">
        <section>
          <h3>FLIGHT &amp; MOVEMENT</h3>
          ${renderRows(getFlightRows())}
        </section>
        <section>
          <h3>COMBAT &amp; NAV</h3>
          ${renderRows(combatNavRows)}
        </section>
      </div>
      <footer class="tutorial-overlay-footer">
        <button class="tutorial-button" id="tutorial-dismiss" type="button">[DISMISS]</button>
        <button class="tutorial-button" id="tutorial-never" type="button">[DON'T SHOW AGAIN]</button>
      </footer>
    </section>`;
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
  const finish = () => {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.opacity = '';
    if (deps.isFlightActive?.()) deps.requestPointerLock?.();
  };
  animateOverlay(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' }, finish) || finish();
  return true;
}

export function isTutorialOverlayVisible() {
  return _visible;
}

import { DEFAULT_SETTINGS, resetSettings, settingsState } from '../flight/settings.js';

const SETTINGS_TABS = [
  ['audio', 'AUDIO'],
  ['graphics', 'GRAPHICS'],
  ['gameplay', 'GAMEPLAY'],
  ['tts', 'TTS'],
  ['controls', 'CONTROLS'],
  ['accessibility', 'ACCESSIBILITY']
];

const SETTINGS_CONTROLS = {
  'FLIGHT & MOVEMENT': [
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
    ['H', 'Hyperspace jump (when unlocked)'],
    ['M', 'System map'],
    ['L', 'Surface approach / land']
  ],
  'HUD & MENUS': [
    ['F1', 'Help overlay in flight'],
    ['O', 'Objectives panel'],
    ['I', 'Inventory / manifest'],
    ['B', 'Mission board (when docked or no modal active)'],
    ['U', 'Upgrades / skills (when landed)'],
    ['Tab', 'Settings menu'],
    ['Escape', 'Close topmost overlay / exit flight (pointer unlocked)'],
    ['Space', 'Dismiss message / activate focused UI'],
    ['1-6', 'Modal / menu choices']
  ],
  SYSTEM: [
    ['"ussy" (typed)', 'Enter flight mode from console'],
    ['Shift+M', 'Toggle flight TTS']
  ]
};

let deps = {
  documentRef: typeof document === 'undefined' ? null : document,
  isFlightActive: () => false,
  releasePointerLock: () => {},
  requestPointerLock: () => {},
  speakTts: () => {},
  setTTSEnabled: null
};
let _open = false;
let activeTab = 'audio';
let _graphicsDebounceTimer = null;
const initializedDocuments = new WeakSet();

function noop() {}

function createEl(documentRef, tag, className = '', text = '') {
  const el = documentRef.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
}

function labelText(key, value) {
  if (key === 'mouseSensitivity') return `${(value / DEFAULT_SETTINGS.mouseSensitivity).toFixed(2)}x`;
  if (key === 'bloomStrength' || key === 'bloomThreshold' || key === 'bloomRadius') return Number(value).toFixed(2);
  if (key === 'ttsRate') return `${Number(value).toFixed(1)}x`;
  if (key === 'ttsPitch' || key === 'hudScale') return Number(value).toFixed(2);
  return `${Math.round(Number(value))}`;
}

function syncValueLabel(documentRef, key) {
  const label = documentRef.getElementById(`settings-value-${key}`);
  if (label) label.textContent = labelText(key, settingsState[key]);
}

function liveApplyAudio() {
  deps.setSfxVolume?.(settingsState.sfxVolume);
  deps.setRadioVolume?.(settingsState.radioVolume);
  deps.setChatterVolume?.(settingsState.chatterVolume);
  deps.setTTSEnabled?.(settingsState.ttsEnabled);
  deps.setTTSBackendEnabled?.(settingsState.ttsBackendEnabled);
  const docRef = deps.documentRef ?? (typeof document !== 'undefined' ? document : null);
  docRef?.documentElement.style.setProperty('--hud-scale', String(settingsState.hudScale));
}

function liveApplyGraphics() {
  if (_graphicsDebounceTimer !== null) clearTimeout(_graphicsDebounceTimer);
  _graphicsDebounceTimer = setTimeout(() => {
    _graphicsDebounceTimer = null;
    deps.setBloomStrength?.(settingsState.bloomStrength);
    deps.setBloomThreshold?.(settingsState.bloomThreshold);
    deps.setBloomRadius?.(settingsState.bloomRadius);
    deps.setPixelRatio?.(settingsState.pixelRatio);
  }, 80);
}

function liveApplyGameplay() {
  deps.setMouseSensitivity?.(settingsState.mouseSensitivity);
}

function liveApply() {
  liveApplyAudio();
  liveApplyGraphics();
  liveApplyGameplay();
}

function bindRange(documentRef, key, { min, max, step, toState = Number, fromState = value => value, apply = liveApply } = {}) {
  const input = documentRef.getElementById(`settings-${key}`);
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(fromState(settingsState[key]));
  syncValueLabel(documentRef, key);
  input.oninput = () => {
    settingsState[key] = toState(input.value);
    syncValueLabel(documentRef, key);
    apply();
  };
}

function bindCheckbox(documentRef, key, apply = liveApply) {
  const input = documentRef.getElementById(`settings-${key}`);
  if (!input) return;
  input.checked = Boolean(settingsState[key]);
  input.onchange = () => {
    settingsState[key] = input.checked;
    apply();
  };
}

function bindSelect(documentRef, key, apply = liveApply) {
  const input = documentRef.getElementById(`settings-${key}`);
  if (!input) return;
  input.value = settingsState[key];
  input.onchange = () => {
    settingsState[key] = input.value;
    apply();
  };
}

function settingRange(key, label, min, max, step) {
  return `
    <label class="settings-field" for="settings-${key}">
      <span>${label}<strong id="settings-value-${key}"></strong></span>
      <input id="settings-${key}" type="range" min="${min}" max="${max}" step="${step}">
    </label>`;
}

function settingToggle(key, label, note = '') {
  return `
    <label class="settings-toggle" for="settings-${key}">
      <span>${label}${note ? `<small>${note}</small>` : ''}</span>
      <input id="settings-${key}" type="checkbox">
    </label>`;
}

function renderControlsReference() {
  return Object.entries(SETTINGS_CONTROLS).map(([section, rows]) => `
    <section class="settings-control-section">
      <h3>${section}</h3>
      <div class="settings-control-grid">
        ${rows.map(([key, action]) => `
          <div class="settings-control-row">
            <kbd class="settings-kbd">${key}</kbd>
            <span class="settings-key-action">${action}</span>
          </div>`).join('')}
      </div>
    </section>`).join('') + '<p class="settings-note">Type \'ussy\' in the console to enter flight mode</p>';
}

function buildMenu(documentRef) {
  const existing = documentRef.getElementById('settings-menu');
  if (existing) return existing;

  const menu = createEl(documentRef, 'div', 'settings-menu');
  menu.id = 'settings-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-hidden', 'true');
  menu.innerHTML = `
    <div class="settings-menu-backdrop" data-settings-close></div>
    <section class="settings-menu-shell" aria-labelledby="settings-menu-title">
      <header class="settings-menu-header">
        <div>
          <div class="settings-menu-kicker">CONFIGURATION</div>
          <h2 id="settings-menu-title">[SETTINGS]</h2>
        </div>
        <button class="settings-menu-close" type="button" data-settings-close>[ESC]</button>
      </header>
      <nav class="settings-tabs" aria-label="Settings tabs">
        ${SETTINGS_TABS.map(([id, label]) => `<button id="settings-tab-${id}" class="settings-tab" type="button" data-settings-tab="${id}" aria-controls="settings-panel-${id}">${label}</button>`).join('')}
      </nav>
      <div class="settings-menu-body">
        <section id="settings-panel-audio" class="settings-panel">
          ${settingRange('sfxVolume', 'SFX Volume', 0, 100, 1)}
          ${settingRange('radioVolume', 'Radio Volume', 0, 100, 1)}
          ${settingRange('chatterVolume', 'Chatter Volume', 0, 100, 1)}
          ${settingRange('ttsVolume', 'TTS Volume', 0, 100, 1)}
          ${settingToggle('ttsEnabled', 'TTS Enabled')}
        </section>
        <section id="settings-panel-graphics" class="settings-panel">
          ${settingRange('bloomStrength', 'Bloom Strength', 0, 1.5, 0.05)}
          ${settingRange('bloomThreshold', 'Bloom Threshold', 0.5, 1, 0.02)}
          ${settingRange('bloomRadius', 'Bloom Radius', 0, 1, 0.05)}
          <label class="settings-field" for="settings-pixelRatio"><span>Pixel Ratio</span><select id="settings-pixelRatio"><option value="auto">Auto</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>
          <label class="settings-field" for="settings-particleDensity"><span>Particle Density</span><select id="settings-particleDensity"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <p class="settings-note">Particle density and pixel ratio take effect on flight mode restart</p>
        </section>
        <section id="settings-panel-gameplay" class="settings-panel">
          ${settingToggle('flightAssistDefault', 'Flight Assist Default')}
          ${settingToggle('mouseInvert', 'Mouse Invert')}
          ${settingRange('mouseSensitivity', 'Mouse Sensitivity', 0.25, 4, 0.05)}
          <fieldset class="settings-radio-group"><legend>Crosshair Style</legend><label><input type="radio" name="settings-crosshairStyle" value="default"> Default</label><label><input type="radio" name="settings-crosshairStyle" value="minimal"> Minimal</label><label><input type="radio" name="settings-crosshairStyle" value="dot"> Dot</label></fieldset>
        </section>
        <section id="settings-panel-tts" class="settings-panel">
          ${settingToggle('ttsBackendEnabled', 'TTS Backend Enabled')}
          ${settingRange('ttsRate', 'Browser TTS Rate', 0.5, 2, 0.1)}
          ${settingRange('ttsPitch', 'Browser TTS Pitch', 0.5, 1.5, 0.05)}
          <p class="settings-note">Backend voices may ignore browser rate/pitch.</p>
          <button class="settings-action" id="settings-test-voice" type="button">[TEST VOICE]</button>
        </section>
        <section id="settings-panel-controls" class="settings-panel settings-controls-panel">${renderControlsReference()}</section>
        <section id="settings-panel-accessibility" class="settings-panel">
          ${settingToggle('reducedMotion', 'Reduced Motion (manual override)', 'Disables bloom, reduces debris count, simplifies animations')}
          ${settingRange('hudScale', 'HUD Scale', 0.75, 1.5, 0.05)}
        </section>
      </div>
      <footer class="settings-menu-footer">
        <button class="settings-action" id="settings-reset" type="button">[RESET DEFAULTS]</button>
        <button class="settings-action" type="button" data-settings-close>[CLOSE]</button>
      </footer>
    </section>`;
  documentRef.body.appendChild(menu);
  return menu;
}

function switchSettingsTab(tabId, documentRef = deps.documentRef) {
  if (!SETTINGS_TABS.some(([id]) => id === tabId) || !documentRef) return false;
  activeTab = tabId;
  SETTINGS_TABS.forEach(([id]) => {
    const selected = id === tabId;
    const button = documentRef.getElementById(`settings-tab-${id}`);
    button?.classList.toggle('active', selected);
    button?.setAttribute('aria-selected', selected ? 'true' : 'false');
    const panel = documentRef.getElementById(`settings-panel-${id}`);
    if (panel) panel.hidden = !selected;
  });
  return true;
}

function syncControls(documentRef = deps.documentRef) {
  if (!documentRef) return;
  bindRange(documentRef, 'sfxVolume', { min: 0, max: 100, step: 1, apply: liveApplyAudio });
  bindRange(documentRef, 'radioVolume', { min: 0, max: 100, step: 1, apply: liveApplyAudio });
  bindRange(documentRef, 'chatterVolume', { min: 0, max: 100, step: 1, apply: liveApplyAudio });
  bindRange(documentRef, 'ttsVolume', { min: 0, max: 100, step: 1, apply: liveApplyAudio });
  bindRange(documentRef, 'bloomStrength', { min: 0, max: 1.5, step: 0.05, apply: liveApplyGraphics });
  bindRange(documentRef, 'bloomThreshold', { min: 0.5, max: 1, step: 0.02, apply: liveApplyGraphics });
  bindRange(documentRef, 'bloomRadius', { min: 0, max: 1, step: 0.05, apply: liveApplyGraphics });
  bindRange(documentRef, 'mouseSensitivity', {
    min: 0.25,
    max: 4,
    step: 0.05,
    fromState: value => value / DEFAULT_SETTINGS.mouseSensitivity,
    toState: value => Number(value) * DEFAULT_SETTINGS.mouseSensitivity,
    apply: liveApplyGameplay
  });
  bindRange(documentRef, 'ttsRate', { min: 0.5, max: 2, step: 0.1, apply: liveApplyAudio });
  bindRange(documentRef, 'ttsPitch', { min: 0.5, max: 1.5, step: 0.05, apply: liveApplyAudio });
  bindRange(documentRef, 'hudScale', { min: 0.75, max: 1.5, step: 0.05, apply: liveApplyAudio });
  ['ttsEnabled', 'ttsBackendEnabled'].forEach(key => bindCheckbox(documentRef, key, liveApplyAudio));
  ['flightAssistDefault', 'mouseInvert'].forEach(key => bindCheckbox(documentRef, key, noop));
  bindCheckbox(documentRef, 'reducedMotion', liveApplyGraphics);
  bindSelect(documentRef, 'pixelRatio', liveApplyGraphics);
  bindSelect(documentRef, 'particleDensity', noop);
  documentRef.querySelectorAll('input[name="settings-crosshairStyle"]').forEach(input => {
    input.checked = input.value === settingsState.crosshairStyle;
    input.onchange = () => {
      if (!input.checked) return;
      settingsState.crosshairStyle = input.value;
      noop();
    };
  });
}

function bindMenu(documentRef) {
  SETTINGS_TABS.forEach(([id]) => {
    documentRef.getElementById(`settings-tab-${id}`)?.addEventListener('click', () => switchSettingsTab(id, documentRef));
  });
  documentRef.querySelectorAll('[data-settings-close]').forEach(button => button.addEventListener('click', closeSettingsMenu));
  documentRef.getElementById('settings-reset')?.addEventListener('click', () => {
    resetSettings();
    syncControls(documentRef);
    liveApply();
  });
  documentRef.getElementById('settings-test-voice')?.addEventListener('click', () => {
    deps.speakTts?.('USSYVERSE CONTROL, SYSTEMS NOMINAL', {
      rate: settingsState.ttsRate,
      pitch: settingsState.ttsPitch,
      volume: settingsState.ttsVolume / 100,
      priority: 'high'
    });
  });
}

export function configureSettingsMenu(options = {}) {
  deps = { ...deps, ...options };
  const { documentRef } = deps;
  if (!documentRef || initializedDocuments.has(documentRef)) return;
  initializedDocuments.add(documentRef);
  buildMenu(documentRef);
  bindMenu(documentRef);
  syncControls(documentRef);
  switchSettingsTab(activeTab, documentRef);
}

export function openSettingsMenu() {
  const { documentRef } = deps;
  if (!documentRef) return false;
  let menu = documentRef.getElementById('settings-menu');
  if (!menu) {
    menu = buildMenu(documentRef);
    bindMenu(documentRef);
    syncControls(documentRef);
    switchSettingsTab(activeTab, documentRef);
  }
  deps.releasePointerLock?.();
  _open = true;
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  syncControls(documentRef);
  switchSettingsTab(activeTab, documentRef);
  return true;
}

export function closeSettingsMenu() {
  const { documentRef } = deps;
  const menu = documentRef?.getElementById?.('settings-menu');
  if (!menu || menu.hidden) return false;
  _open = false;
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  if (deps.isFlightActive?.()) deps.requestPointerLock?.();
  return true;
}

export function isSettingsMenuOpen() {
  return _open;
}

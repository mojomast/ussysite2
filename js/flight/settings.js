// Canonical flight/UI settings store. Persisted through the shared #save hash.

export const DEFAULT_SETTINGS = {
  // Audio
  sfxVolume: 80,
  radioVolume: 70,
  chatterVolume: 60,
  ttsVolume: 75,
  ttsEnabled: true,
  ttsBackendEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 0.72,
  // Graphics
  bloomStrength: 0.55,
  bloomThreshold: 0.82,
  bloomRadius: 0.4,
  pixelRatio: 'auto',
  particleDensity: 'high',
  // Gameplay
  flightAssistDefault: true,
  mouseInvert: false,
  mouseSensitivity: 0.0022,
  crosshairStyle: 'default',
  // Accessibility
  reducedMotion: false,
  hudScale: 1.0,
  // Tutorial
  tutorialOverlayDismissed: false
};

export const settingsState = { ...DEFAULT_SETTINGS };

const numericRanges = {
  sfxVolume: [0, 100],
  radioVolume: [0, 100],
  chatterVolume: [0, 100],
  ttsVolume: [0, 100],
  ttsRate: [0.5, 2],
  ttsPitch: [0.5, 1.5],
  bloomStrength: [0, 1.5],
  bloomThreshold: [0.5, 1],
  bloomRadius: [0, 1],
  mouseSensitivity: [0.00055, 0.0088],
  hudScale: [0.75, 1.5]
};

const enumValues = {
  pixelRatio: new Set(['auto', '1', '1.5', '2']),
  particleDensity: new Set(['low', 'medium', 'high']),
  crosshairStyle: new Set(['default', 'minimal', 'dot'])
};

const booleanKeys = new Set([
  'ttsEnabled',
  'ttsBackendEnabled',
  'flightAssistDefault',
  'mouseInvert',
  'reducedMotion',
  'tutorialOverlayDismissed'
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function extractEncodedConfig(hashString = '') {
  const text = String(hashString || '');
  const slotMatch = text.match(/:cfg:([A-Za-z0-9+/=]+)/);
  if (slotMatch) return slotMatch[1];
  return /^[A-Za-z0-9+/=]+$/.test(text) ? text : '';
}

function applyPartialSettings(data = {}) {
  Object.entries(numericRanges).forEach(([key, [min, max]]) => {
    const value = Number(data[key]);
    if (Number.isFinite(value)) settingsState[key] = clamp(value, min, max);
  });

  Object.entries(enumValues).forEach(([key, values]) => {
    if (values.has(data[key])) settingsState[key] = data[key];
  });

  booleanKeys.forEach(key => {
    if (typeof data[key] === 'boolean') settingsState[key] = data[key];
  });
}

export function loadSettings(hashString = '') {
  const encoded = extractEncodedConfig(hashString);
  if (!encoded) return false;

  try {
    const parsed = JSON.parse(atob(encoded));
    if (!parsed || typeof parsed !== 'object') return false;
    applyPartialSettings(parsed);
    return true;
  } catch {
    return false;
  }
}

export function saveSettings() {
  return btoa(JSON.stringify(settingsState));
}

export function applySettings(deps = {}) {
  deps.setSfxVolume?.(settingsState.sfxVolume);
  deps.setRadioVolume?.(settingsState.radioVolume);
  deps.setChatterVolume?.(settingsState.chatterVolume);
  deps.setTTSBackendEnabled?.(settingsState.ttsBackendEnabled);
  deps.setBloomStrength?.(settingsState.bloomStrength);
  deps.setBloomThreshold?.(settingsState.bloomThreshold);
  deps.setPixelRatio?.(settingsState.pixelRatio);
  deps.setMouseSensitivity?.(settingsState.mouseSensitivity);
  document.documentElement.style.setProperty('--hud-scale', String(settingsState.hudScale));
}

export function resetSettings() {
  Object.assign(settingsState, DEFAULT_SETTINGS);
}

import { gameMessageState } from './state.js';
import { ttsEngine } from '../tts/engine.js';

export const gameMessageSystem = {
  root: null,
  type: null,
  source: null,
  body: null,
  choices: null
};

export function getVoicePersona(source = '') {
  const normalizedSource = String(source).toUpperCase();
  if (normalizedSource.includes('USSYVERSE CONTROL')) return { pitch: 0.80, rate: 0.95, voiceId: 'onyx' };
  if (normalizedSource.includes('COMBAT SYSTEM')) return { pitch: 0.70, rate: 1.25, voiceId: 'onyx' };
  if (normalizedSource.includes('NAVIGATION')) return { pitch: 0.88, rate: 0.92, voiceId: 'alloy' };
  return { pitch: 0.82, rate: 1.0, voiceId: 'onyx' };
}

export function showGameMessage({ type = 'MISSION', source = 'USSYVERSE CONTROL', text = '', choices = [], onDismiss = null } = {}) {
  Object.assign(gameMessageState, { active: true, type, source, text, choices, onDismiss });
  ttsEngine.speak(text, { ...getVoicePersona(source), priority: 'high' });
}
export function renderGameMessage() {}
export function updateGameMessage() {}
export function dismissGameMessage() { gameMessageState.active = false; return true; }
export function handleGameMessageChoice() { return false; }

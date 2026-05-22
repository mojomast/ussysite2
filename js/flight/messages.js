let deps = {};

export const gameMessageSystem = {
  root: null,
  type: null,
  source: null,
  body: null,
  choices: null
};

export function configureMessages(options = {}) {
  deps = { ...deps, ...options };
  gameMessageSystem.root = deps.gameMessageSystem || null;
  gameMessageSystem.type = deps.gameMessageType || null;
  gameMessageSystem.source = deps.gameMessageSource || null;
  gameMessageSystem.body = deps.gameMessageBody || null;
  gameMessageSystem.choices = deps.gameMessageChoices || null;
}

export function getVoicePersona(source = '') {
  const normalizedSource = String(source).toUpperCase();
  if (normalizedSource.includes('USSYVERSE CONTROL')) return { pitch: 0.80, rate: 0.95, voiceId: 'onyx' };
  if (normalizedSource.includes('DEVUSSY DOCK CONTROL')) return { pitch: 0.75, rate: 1.0, voiceId: 'echo' };
  if (normalizedSource.includes('COMBAT SYSTEM')) return { pitch: 0.70, rate: 1.25, voiceId: 'onyx' };
  if (normalizedSource.includes('NAVIGATION')) return { pitch: 0.88, rate: 0.92, voiceId: 'alloy' };
  if (normalizedSource.includes('DEVUSSY')) return { pitch: 0.78, rate: 1.0, voiceId: 'echo' };
  if (normalizedSource.includes('FACTION')) return { pitch: 0.72, rate: 0.96, voiceId: 'fable' };
  return { pitch: 0.82, rate: 1.0, voiceId: 'onyx' };
}

export function showGameMessage({ type = 'MISSION', source = 'USSYVERSE CONTROL', text = '', choices = [], onDismiss = null, typeSpeed = 18, ttsPriority = 'high' } = {}) {
  const { gameMessageState, ttsEngine } = deps;
  if (!gameMessageState) return;
  const messageToken = Symbol('game-message');
  gameMessageState.active = true;
  gameMessageState.type = type;
  gameMessageState.source = source;
  gameMessageState.text = text;
  gameMessageState.shown = '';
  gameMessageState.index = 0;
  gameMessageState.nextTypeAt = 0;
  gameMessageState.ttsWaitUntil = ttsEngine?.enabled ? performance.now() + 3500 : 0;
  gameMessageState.token = messageToken;
  gameMessageState.typeSpeed = typeSpeed;
  gameMessageState.choices = choices;
  gameMessageState.onDismiss = onDismiss;
  renderGameMessage();
  ttsEngine?.speak(text, {
    ...getVoicePersona(source),
    priority: ttsPriority,
    onStart: () => {
      if (!gameMessageState.active || gameMessageState.token !== messageToken) return;
      gameMessageState.ttsWaitUntil = 0;
      gameMessageState.nextTypeAt = performance.now() + 180;
    }
  });
}

export function renderGameMessage() {
  const { documentRef = document, gameMessageState } = deps;
  const root = gameMessageSystem.root;
  if (!root || !gameMessageState) return;
  root.classList.toggle('active', gameMessageState.active);
  if (gameMessageSystem.type) gameMessageSystem.type.textContent = gameMessageState.type;
  if (gameMessageSystem.source) gameMessageSystem.source.textContent = gameMessageState.source;
  if (gameMessageSystem.body) {
    gameMessageSystem.body.textContent = gameMessageState.active && gameMessageState.index < gameMessageState.text.length
      ? `${gameMessageState.shown}_`
      : gameMessageState.text;
  }
  if (gameMessageSystem.choices) {
    gameMessageSystem.choices.innerHTML = '';
    gameMessageState.choices.forEach(choice => {
      const item = documentRef.createElement('div');
      item.className = 'game-message-choice';
      item.innerHTML = `<kbd>${choice.key}</kbd><span>${choice.label}</span>`;
      gameMessageSystem.choices.appendChild(item);
    });
  }
}

export function updateGameMessage(time) {
  const { gameMessageState } = deps;
  if (!gameMessageState?.active || gameMessageState.index >= gameMessageState.text.length) return;
  if (time < gameMessageState.ttsWaitUntil) return;
  if (time < gameMessageState.nextTypeAt) return;
  const chunk = gameMessageState.text.slice(gameMessageState.index, gameMessageState.index + 2);
  gameMessageState.shown += chunk;
  gameMessageState.index += chunk.length;
  gameMessageState.nextTypeAt = time + gameMessageState.typeSpeed;
  renderGameMessage();
}

export function dismissGameMessage() {
  const { gameMessageState, ttsEngine } = deps;
  if (!gameMessageState?.active) return false;
  const callback = gameMessageState.onDismiss;
  gameMessageState.active = false;
  gameMessageState.onDismiss = null;
  renderGameMessage();
  ttsEngine?.stop();
  if (callback) callback();
  return true;
}

export function handleGameMessageChoice(event) {
  const { gameMessageState, ttsEngine } = deps;
  if (!gameMessageState?.active || gameMessageState.choices.length === 0) return false;
  const key = event.key.toLowerCase();
  const code = event.code.toLowerCase();
  const choice = gameMessageState.choices.find(item => item.key.toLowerCase() === key || item.code?.toLowerCase() === code);
  if (!choice) return false;
  gameMessageState.active = false;
  renderGameMessage();
  ttsEngine?.speak(`${choice.label}`, { rate: 1.1, pitch: 0.9 });
  if (choice.action) choice.action();
  return true;
}

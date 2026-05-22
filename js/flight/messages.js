let deps = {};

export const gameMessageSystem = {
  root: null,
  type: null,
  source: null,
  body: null,
  choices: null,
  footer: null
};

export function configureMessages(options = {}) {
  deps = { ...deps, ...options };
  gameMessageSystem.root = deps.gameMessageSystem || null;
  gameMessageSystem.type = deps.gameMessageType || null;
  gameMessageSystem.source = deps.gameMessageSource || null;
  gameMessageSystem.body = deps.gameMessageBody || null;
  gameMessageSystem.choices = deps.gameMessageChoices || null;
  gameMessageSystem.footer = gameMessageSystem.root?.querySelector('.game-message-dismiss') || null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function showGameMessage({ type = 'MISSION', source = 'USSYVERSE CONTROL', text = '', choices = [], ui = null, onDismiss = null, typeSpeed = 18, ttsPriority = 'high' } = {}) {
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
  gameMessageState.ui = ui;
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
  const ui = gameMessageState.ui || null;
  root.classList.toggle('active', gameMessageState.active);
  root.classList.toggle('game-message-docked', ui?.layout === 'dock-grid');
  if (ui?.colorClass) root.dataset.color = ui.colorClass;
  else delete root.dataset.color;
  ['cyan', 'green', 'purple', 'pink', 'yellow'].forEach(color => root.classList.toggle(`lore-${color}`, ui?.colorClass === color));
  if (gameMessageSystem.type) gameMessageSystem.type.textContent = ui?.headerTitle || gameMessageState.type;
  if (gameMessageSystem.source) {
    gameMessageSystem.source.textContent = ui?.headerBadge ? `${ui.headerBadge} // ${gameMessageState.source}` : gameMessageState.source;
    ['cyan', 'green', 'purple', 'pink', 'yellow'].forEach(color => gameMessageSystem.source.classList.toggle(`badge-${color}`, ui?.colorClass === color));
  }
  if (gameMessageSystem.body) {
    gameMessageSystem.body.textContent = gameMessageState.active && gameMessageState.index < gameMessageState.text.length
      ? `${gameMessageState.shown}_`
      : gameMessageState.text;
  }
  if (gameMessageSystem.choices) {
    gameMessageSystem.choices.innerHTML = '';
    gameMessageSystem.choices.classList.toggle('dock-choice-grid', ui?.layout === 'dock-grid');
    gameMessageState.choices.forEach(choice => {
      const item = documentRef.createElement('button');
      item.type = 'button';
      item.className = 'game-message-choice';
      if (choice.tone) item.dataset.tone = choice.tone;
      if (choice.disabled) item.disabled = true;
      item.innerHTML = `${choice.icon ? `<i data-lucide="${escapeHtml(choice.icon)}" aria-hidden="true"></i>` : ''}<div class="game-message-choice-copy"><span>${escapeHtml(choice.label)}</span>${choice.hint ? `<small>${escapeHtml(choice.hint)}</small>` : ''}</div><kbd>${escapeHtml(choice.key)}</kbd>`;
      item.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        activateGameMessageChoice(choice);
      });
      gameMessageSystem.choices.appendChild(item);
    });
    documentRef.defaultView?.lucide?.createIcons?.();
  }
  if (gameMessageSystem.footer) {
    if (ui?.layout === 'dock-grid') {
      const stats = (ui.footerStats || []).map(stat => `<span>${escapeHtml(stat)}</span>`).join('');
      const links = (ui.footerChoices || []).map(choice => `<button type="button" class="game-message-footer-link" data-key="${escapeHtml(choice.key)}">${escapeHtml(choice.label)} <kbd>${escapeHtml(choice.key)}</kbd></button>`).join('');
      gameMessageSystem.footer.innerHTML = `<div class="game-message-footer-stats">${stats}</div><div class="game-message-footer-actions">${links}</div>`;
      gameMessageSystem.footer.querySelectorAll('.game-message-footer-link').forEach((button, index) => {
        const choice = ui.footerChoices?.[index];
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          activateGameMessageChoice(choice);
        });
      });
    } else {
      gameMessageSystem.footer.innerHTML = 'PRESS <kbd>SPACE</kbd> TO DISMISS';
    }
  }
}

export function isBackNavigationKey(event) {
  return event?.code === 'Escape' || event?.code === 'Backspace';
}

export function choiceMatchesKeyboardEvent(choice, event) {
  if (!choice || !event) return false;
  const key = event.key.toLowerCase();
  const code = event.code.toLowerCase();
  const aliases = choice.aliases || [];
  return choice.key.toLowerCase() === key
    || choice.code?.toLowerCase() === code
    || aliases.some(alias => String(alias).toLowerCase() === key || String(alias).toLowerCase() === code);
}

function activateGameMessageChoice(choice) {
  const { gameMessageState, ttsEngine } = deps;
  if (!choice || choice.disabled || !gameMessageState?.active) return false;
  gameMessageState.active = false;
  renderGameMessage();
  ttsEngine?.speak(`${choice.label}`, { rate: 1.1, pitch: 0.9 });
  if (choice.action) choice.action();
  return true;
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
  gameMessageState.ui = null;
  renderGameMessage();
  ttsEngine?.stop();
  if (callback) callback();
  return true;
}

export function handleGameMessageChoice(event) {
  const { gameMessageState } = deps;
  const allChoices = [...(gameMessageState?.choices || []), ...(gameMessageState?.ui?.footerChoices || [])];
  if (!gameMessageState?.active || allChoices.length === 0) return false;
  const choice = allChoices.find(item => choiceMatchesKeyboardEvent(item, event));
  if (!choice) return false;
  return activateGameMessageChoice(choice);
}

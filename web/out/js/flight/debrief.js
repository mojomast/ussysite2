let dismissTimer = null;
let keyHandler = null;

function getPanel() {
  return globalThis.document?.getElementById?.('combat-debrief') || null;
}

function formatLine(label, value) {
  return `<div class="combat-debrief-row"><span>${label}</span><strong>${value}</strong></div>`;
}

/** Shows the post-combat debrief overlay until timeout or keypress. */
export function showDebrief(data = {}) {
  const panel = getPanel();
  if (!panel) return;
  hideDebrief();
  panel.innerHTML = [
    '<div class="combat-debrief-title">COMBAT DEBRIEF</div>',
    '<div class="combat-debrief-rule"></div>',
    formatLine('KILLS', data.kills ?? 0),
    formatLine('ACCURACY', `${data.accuracy ?? 0}%`),
    formatLine('CREDITS', `+${data.creditsEarned ?? 0} CR`),
    formatLine('XP EARNED', `+${data.xpEarned ?? 0} XP`),
    formatLine('PEAK STREAK', `${data.peakStreak ?? 0}x`),
    '<div class="combat-debrief-hint">ANY KEY TO DISMISS</div>'
  ].join('');
  panel.classList.add('active');
  keyHandler = () => hideDebrief();
  globalThis.document?.addEventListener?.('keydown', keyHandler, { once: true });
  dismissTimer = globalThis.setTimeout?.(() => hideDebrief(), 5000) || null;
}

/** Hides the post-combat debrief overlay and clears dismiss hooks. */
export function hideDebrief() {
  const panel = getPanel();
  if (dismissTimer) globalThis.clearTimeout?.(dismissTimer);
  dismissTimer = null;
  if (keyHandler) globalThis.document?.removeEventListener?.('keydown', keyHandler);
  keyHandler = null;
  if (panel) panel.classList.remove('active');
}

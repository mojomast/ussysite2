import { traderState } from '../economy/trader.js';
import { WEAPON_DEFS } from './combat-overhaul.js';
import { combatState } from './combat-state.js';

export function updateFlightHud() {
  const primary = WEAPON_DEFS.find(weapon => weapon.id === combatState.primaryWeapon)?.name || '--';
  const secondary = WEAPON_DEFS.find(weapon => weapon.id === combatState.secondaryWeapon)?.name || '--';
  const primaryEl = document.getElementById('flight-weapon-primary');
  const secondaryEl = document.getElementById('flight-weapon-secondary');
  const spEl = document.getElementById('flight-sp');
  const xpBar = document.getElementById('flight-xp-bar');
  const xpLabel = document.getElementById('flight-xp-label');
  if (primaryEl) primaryEl.textContent = primary;
  if (secondaryEl) secondaryEl.textContent = secondary;
  if (spEl) spEl.textContent = `SP:${combatState.skillPoints}`;
  if (xpBar) xpBar.style.width = `${Math.min(100, (combatState.xp / combatState.xpToNextPoint) * 100).toFixed(1)}%`;
  if (xpLabel) xpLabel.textContent = `XP ${combatState.xp}/${combatState.xpToNextPoint}`;
  return traderState.fuel;
}

export function showCreditGain(amount) {
  const el = document.getElementById('flight-credit-gain');
  if (!el) return;
  el.textContent = `+${amount}CR`;
  el.classList.remove('credit-flash');
  void el.offsetWidth;
  el.classList.add('credit-flash');
}

export function updateCockpitRadar() {}
export function updateFlightCamera() {}
export function updateFlightNavMarker() {}
export function mapRadarPoint() { return { x: 0, y: 0, distance: 0 }; }
export function drawRadarContact() {}
export function updateTtsStatusIndicator() {}
export function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

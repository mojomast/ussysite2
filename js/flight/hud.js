import { traderState } from '../economy/trader.js';

export function updateFlightHud() { return traderState.fuel; }
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

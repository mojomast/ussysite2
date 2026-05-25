// Thin flight runtime boundary: dependency wiring and frame entry points live in flight state.
export { init, tick, enterFlightMode } from './state.js';
export { sfxEngine } from './sfx.js';

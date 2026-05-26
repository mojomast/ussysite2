// Thin flight runtime boundary: dependency wiring and frame entry points live in flight state.
export { init, tick, enterFlightMode } from './state.js?v=runtime-stability-fix-20260526';
export { sfxEngine } from './sfx.js?v=runtime-stability-fix-20260526';

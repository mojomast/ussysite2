const runtimeWindow = typeof window !== 'undefined' ? window : null;
const matchMedia = typeof runtimeWindow?.matchMedia === 'function'
  ? query => runtimeWindow.matchMedia(query).matches
  : () => false;

export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const isCoarsePointer = matchMedia('(pointer: coarse)');

export const maxPlayerAmmo = 240;
export const maxPlayerMissilesStored = 8;
export const flightUniverseScale = 10;

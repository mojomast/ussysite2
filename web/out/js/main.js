import { init, tick } from './flight/runtime.js';
import { sfxEngine } from './flight/sfx.js';

globalThis.__USSY_SFX__ = sfxEngine;
globalThis.__USSY_BUILD__ = 'sfx-debug-20260522';

function animationLoop(time) {
  requestAnimationFrame(animationLoop);
  tick(time);
}

function bootstrap() {
  init();
  requestAnimationFrame(animationLoop);
}

document.addEventListener('DOMContentLoaded', bootstrap, { once: true });

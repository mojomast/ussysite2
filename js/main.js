import { init, tick } from './flight/runtime.js';

function animationLoop(time) {
  requestAnimationFrame(animationLoop);
  tick(time);
}

function bootstrap() {
  init();
  requestAnimationFrame(animationLoop);
}

document.addEventListener('DOMContentLoaded', bootstrap, { once: true });

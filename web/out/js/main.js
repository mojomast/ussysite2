globalThis.__USSY_BUILD__ = 'sfx-tune-20260522';

let runtimePromise = null;
let runtime = null;
let initialized = false;
let animationStarted = false;
let launchBuffer = '';

function animationLoop(time) {
  requestAnimationFrame(animationLoop);
  runtime?.tick?.(time);
}

function getLoadingOverlay() {
  return document.getElementById('flight-loading-overlay');
}

function setFlightLoading(message, failed = false) {
  const overlay = getLoadingOverlay();
  if (!overlay) return;
  const text = overlay.querySelector('[data-flight-loading-text]');
  if (text) text.textContent = message;
  overlay.hidden = false;
  overlay.classList.toggle('failed', failed);
}

function hideFlightLoading() {
  const overlay = getLoadingOverlay();
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.remove('failed');
}

function nextPaint() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

async function loadFlightRuntime() {
  if (!runtimePromise) {
    setFlightLoading('Initializing flight systems...');
    await nextPaint();
    runtimePromise = import('./flight/runtime.js');
  }
  runtime = await runtimePromise;
  globalThis.__USSY_SFX__ = runtime.sfxEngine;
  if (!initialized) {
    setFlightLoading('Calibrating starfield and controls...');
    await nextPaint();
    runtime.init();
    initialized = true;
  }
  if (!animationStarted) {
    animationStarted = true;
    requestAnimationFrame(animationLoop);
  }
  return runtime;
}

async function launchFlight() {
  try {
    const loadedRuntime = await loadFlightRuntime();
    hideFlightLoading();
    loadedRuntime.enterFlightMode();
  } catch (error) {
    console.error('Flight systems failed to initialize', error);
    setFlightLoading('Flight systems failed to initialize. Reload and try again.', true);
  }
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase?.();
  return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
}

function onLaunchKeydown(event) {
  if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) return;
  if (event.key.length !== 1) return;
  launchBuffer = `${launchBuffer}${event.key.toLowerCase()}`.slice(-4);
  if (launchBuffer === 'ussy') {
    launchBuffer = '';
    event.preventDefault();
    launchFlight();
  }
}

function bootstrap() {
  document.addEventListener('keydown', onLaunchKeydown);
}

document.addEventListener('DOMContentLoaded', bootstrap, { once: true });

globalThis.__USSY_BUILD__ = 'three-classic-hotfix-20260525';

let runtimePromise = null;
let runtime = null;
let initialized = false;
let animationStarted = false;

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

async function loadFlightRuntime({ showLoading = true } = {}) {
  if (!runtimePromise) {
    if (showLoading) setFlightLoading('Initializing flight systems...');
    await nextPaint();
    runtimePromise = import('./flight/runtime.js');
  }
  runtime = await runtimePromise;
  globalThis.__USSY_SFX__ = runtime.sfxEngine;
  if (!initialized) {
    if (showLoading) setFlightLoading('Calibrating starfield and controls...');
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
    const loadedRuntime = await loadFlightRuntime({ showLoading: true });
    hideFlightLoading();
    loadedRuntime.enterFlightMode();
  } catch (error) {
    console.error('Flight systems failed to initialize', error);
    setFlightLoading('Flight systems failed to initialize. Reload and try again.', true);
  }
}

function bootstrap() {
  loadFlightRuntime({ showLoading: false }).catch(error => {
    console.error('Ussyverse failed to initialize', error);
    setFlightLoading('Ussyverse failed to initialize. Reload and try again.', true);
  });
}

document.addEventListener('DOMContentLoaded', bootstrap, { once: true });

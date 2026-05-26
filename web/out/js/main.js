globalThis.__USSY_BUILD__ = 'runtime-stability-fix-20260526';

export const FLIGHT_RUNTIME_URL = './flight/runtime.js?v=runtime-stability-fix-20260526';

export function createFlightMain(deps = {}) {
  const doc = deps.documentRef ?? deps.document ?? globalThis.document;
  const win = deps.windowRef ?? deps.window ?? globalThis.window;
  const raf = deps.requestAnimationFrame ?? globalThis.requestAnimationFrame;
  const timeout = deps.setTimeout ?? globalThis.setTimeout;
  const importRuntime = deps.importRuntime ?? (specifier => import(specifier));
  const log = deps.console ?? globalThis.console ?? console;
  const globals = deps.globalThis ?? globalThis;

  let runtimePromise = null;
  let initPromise = null;
  let runtime = null;
  let animationStarted = false;
  let launchPromise = null;

  function animationLoop(time) {
    raf(animationLoop);
    runtime?.tick?.(time);
  }

  function getLoadingOverlay() {
    return doc?.getElementById?.('flight-loading-overlay') ?? null;
  }

  function setFlightLoading(message, failed = false) {
    const overlay = getLoadingOverlay();
    if (!overlay) return;
    const text = overlay.querySelector?.('[data-flight-loading-text]');
    if (text) text.textContent = message;
    overlay.hidden = false;
    overlay.classList?.toggle?.('failed', failed);
  }

  function hideFlightLoading() {
    const overlay = getLoadingOverlay();
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList?.remove?.('failed');
  }

  function nextPaint() {
    return new Promise(resolve => raf(resolve));
  }

  function importFlightRuntime({ showLoading = false } = {}) {
    if (!runtimePromise) {
      if (showLoading) setFlightLoading('Initializing flight systems...');
      runtimePromise = (async () => {
        await nextPaint();
        const loadedRuntime = await importRuntime(FLIGHT_RUNTIME_URL);
        runtime = loadedRuntime;
        globals.__USSY_SFX__ = loadedRuntime.sfxEngine;
        return loadedRuntime;
      })().catch(error => {
        runtimePromise = null;
        throw error;
      });
    }
    return runtimePromise;
  }

  function initializeFlightRuntime({ showLoading = true } = {}) {
    if (!initPromise) {
      initPromise = (async () => {
        const loadedRuntime = await importFlightRuntime({ showLoading });
        if (showLoading) setFlightLoading('Calibrating starfield and controls...');
        await nextPaint();
        loadedRuntime.init();
        if (!animationStarted) {
          animationStarted = true;
          raf(animationLoop);
        }
        return loadedRuntime;
      })().catch(error => {
        initPromise = null;
        throw error;
      });
    }
    return initPromise;
  }

  function launchFlight() {
    if (!launchPromise) {
      launchPromise = (async () => {
        try {
          const loadedRuntime = await initializeFlightRuntime({ showLoading: true });
          hideFlightLoading();
          loadedRuntime.enterFlightMode();
          return loadedRuntime;
        } catch (error) {
          log.error?.('Flight systems failed to initialize', error);
          setFlightLoading('Flight systems failed to initialize. Reload and try again.', true);
          return null;
        } finally {
          launchPromise = null;
        }
      })();
    }
    return launchPromise;
  }

  function bootstrap() {
    const preload = () => initializeFlightRuntime({ showLoading: false }).catch(error => {
      log.error?.('Ussyverse idle preload failed', error);
    });
    const idlePreload = () => timeout(preload, 3500);
    if (typeof win?.requestIdleCallback === 'function') win.requestIdleCallback(idlePreload, { timeout: 5000 });
    else idlePreload();
  }

  return { bootstrap, importFlightRuntime, initializeFlightRuntime, launchFlight };
}

const flightMain = createFlightMain();
if (globalThis.document?.addEventListener) {
  globalThis.document.addEventListener('DOMContentLoaded', flightMain.bootstrap, { once: true });
}

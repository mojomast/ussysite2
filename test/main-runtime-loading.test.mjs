import test from 'node:test';
import assert from 'node:assert/strict';

const { createFlightMain, FLIGHT_RUNTIME_URL } = await import('../js/main.js');

function createOverlay() {
  const classes = new Set();
  const text = { textContent: '' };
  return {
    hidden: true,
    text,
    classes,
    querySelector: selector => (selector === '[data-flight-loading-text]' ? text : null),
    classList: {
      toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

function createHarness(options = {}) {
  const frames = [];
  const timers = [];
  const idleCallbacks = [];
  const listeners = {};
  let currentTime = 0;
  const overlay = createOverlay();
  const runtime = {
    initCalls: 0,
    enterCalls: 0,
    ticks: [],
    sfxEngine: { id: 'sfx' },
    init() { this.initCalls += 1; },
    enterFlightMode() { this.enterCalls += 1; },
    tick(time) { this.ticks.push(time); }
  };
  const imports = [];
  const errors = [];
  const globals = {};
  const main = createFlightMain({
    documentRef: {
      addEventListener(type, listener) { listeners[type] = listener; },
      getElementById: id => (id === 'flight-loading-overlay' ? overlay : null)
    },
    windowRef: { requestIdleCallback: cb => idleCallbacks.push(cb) },
    requestAnimationFrame: cb => frames.push(cb),
    setTimeout: cb => timers.push(cb),
    importRuntime: async specifier => {
      imports.push(specifier);
      if (options.rejectImportOnce && imports.length === 1) throw new Error('import failed');
      return runtime;
    },
    console: { error: (...args) => errors.push(args) },
    globalThis: globals,
    now: () => currentTime
  });
  const runFrame = (time = 0) => {
    const cb = frames.shift();
    assert.ok(cb, 'expected queued animation frame');
    cb(time);
  };
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  const keyEvent = (key, options = {}) => ({
    key,
    code: `Key${String(key).toUpperCase()}`,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    ...options
  });
  const pressLaunchKey = (key, options = {}) => listeners.keydown(keyEvent(key, options));
  return { errors, flush, frames, globals, idleCallbacks, imports, keyEvent, listeners, main, overlay, pressLaunchKey, runFrame, runtime, setNow: value => { currentTime = value; }, timers };
}

test('bootstrap initializes universe runtime without entering flight', async () => {
  const harness = createHarness();

  harness.main.bootstrap();
  assert.equal(harness.imports.length, 0);
  assert.equal(harness.runtime.initCalls, 0);
  assert.equal(typeof harness.listeners.keydown, 'function');

  harness.runFrame(1);
  await harness.flush();
  harness.runFrame(2);
  await harness.flush();

  assert.deepEqual(harness.imports, [FLIGHT_RUNTIME_URL]);
  assert.equal(harness.runtime.initCalls, 1);
  assert.equal(harness.runtime.enterCalls, 0);
  assert.equal(harness.overlay.hidden, true);
});

test('concurrent launches import and initialize runtime once', async () => {
  const harness = createHarness();

  const first = harness.main.launchFlight();
  const second = harness.main.launchFlight();
  assert.equal(first, second);
  assert.equal(harness.overlay.hidden, false);
  assert.equal(harness.overlay.text.textContent, 'Initializing flight systems...');

  harness.runFrame(10);
  await harness.flush();
  assert.equal(harness.overlay.text.textContent, 'Calibrating starfield and controls...');
  harness.runFrame(20);
  await first;

  assert.deepEqual(harness.imports, [FLIGHT_RUNTIME_URL]);
  assert.equal(harness.runtime.initCalls, 1);
  assert.equal(harness.runtime.enterCalls, 1);
  assert.equal(harness.overlay.hidden, true);
  assert.equal(harness.overlay.classList.contains('failed'), false);
  assert.equal(harness.globals.__USSY_SFX__, harness.runtime.sfxEngine);

  harness.runFrame(30);
  assert.deepEqual(harness.runtime.ticks, [30]);
});

test('launch import failure shows failed overlay and does not enter flight', async () => {
  const harness = createHarness({ rejectImportOnce: true });

  const result = harness.main.launchFlight();
  harness.runFrame(10);
  await harness.flush();
  assert.equal(await result, null);

  assert.deepEqual(harness.imports, [FLIGHT_RUNTIME_URL]);
  assert.equal(harness.runtime.initCalls, 0);
  assert.equal(harness.runtime.enterCalls, 0);
  assert.equal(harness.overlay.hidden, false);
  assert.equal(harness.overlay.classList.contains('failed'), true);
  assert.equal(harness.overlay.text.textContent, 'Flight systems failed to initialize. Reload and try again.');
  assert.equal(harness.errors.length, 1);
});

test('launch retries after failed import and succeeds', async () => {
  const harness = createHarness({ rejectImportOnce: true });

  const failed = harness.main.launchFlight();
  harness.runFrame(10);
  await harness.flush();
  assert.equal(await failed, null);

  const retried = harness.main.launchFlight();
  assert.equal(harness.overlay.text.textContent, 'Initializing flight systems...');
  assert.equal(harness.overlay.classList.contains('failed'), false);
  harness.runFrame(20);
  await harness.flush();
  harness.runFrame(30);
  assert.equal(await retried, harness.runtime);

  assert.deepEqual(harness.imports, [FLIGHT_RUNTIME_URL, FLIGHT_RUNTIME_URL]);
  assert.equal(harness.runtime.initCalls, 1);
  assert.equal(harness.runtime.enterCalls, 1);
  assert.equal(harness.overlay.hidden, true);
});

test('bootstrap launch code imports runtime on demand', async () => {
  const harness = createHarness();

  harness.main.bootstrap();
  for (const key of ['u', 's', 's']) harness.pressLaunchKey(key);
  const finalEvent = harness.keyEvent('y');
  harness.listeners.keydown(finalEvent);

  assert.equal(finalEvent.defaultPrevented, true);
  assert.equal(harness.overlay.hidden, false);
  assert.equal(harness.overlay.text.textContent, 'Initializing flight systems...');
  assert.equal(harness.imports.length, 0);

  harness.runFrame(10);
  await harness.flush();
  harness.runFrame(20);
  await harness.flush();

  assert.deepEqual(harness.imports, [FLIGHT_RUNTIME_URL]);
  assert.equal(harness.runtime.initCalls, 1);
  assert.equal(harness.runtime.enterCalls, 1);
  assert.equal(harness.overlay.hidden, true);
});

test('bootstrap launch code ignores typing targets and stale sequences', async () => {
  const harness = createHarness();

  harness.main.bootstrap();
  for (const key of ['u', 's', 's', 'y']) {
    harness.pressLaunchKey(key, { target: { tagName: 'INPUT' } });
  }
  assert.equal(harness.imports.length, 0);

  harness.setNow(0);
  harness.pressLaunchKey('u');
  harness.setNow(1600);
  for (const key of ['s', 's', 'y']) harness.pressLaunchKey(key);
  assert.equal(harness.imports.length, 0);
});

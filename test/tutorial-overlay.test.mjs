import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  setTimeout: () => 1,
  clearTimeout() {}
};

const { configureTutorialOverlay, hideTutorialOverlay, showTutorialOverlay } = await import('../js/flight/tutorial-overlay.js');

function createElement(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    hidden: false,
    innerHTML: '',
    attributes: {},
    listeners: {},
    style: {},
    children: [],
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    animate(_frames, _options) {
      return { addEventListener(_type, listener) { listener(); } };
    }
  };
}

function createDocument() {
  const elements = new Map();
  const body = createElement('body');
  return {
    body,
    createElement,
    getElementById(id) {
      if (elements.has(id)) return elements.get(id);
      const overlay = [...body.children].find(child => child.id === 'tutorial-overlay');
      if (id === 'tutorial-overlay') return overlay || null;
      if ((id === 'tutorial-dismiss' || id === 'tutorial-never') && overlay) {
        const button = createElement('button');
        button.id = id;
        elements.set(id, button);
        return button;
      }
      return null;
    }
  };
}

test('tutorial hide clears overlay blocker before requesting pointer lock', () => {
  const documentRef = createDocument();
  const calls = [];

  configureTutorialOverlay({
    documentRef,
    isFlightActive: () => true,
    requestPointerLock: () => calls.push('lock')
  });
  assert.equal(showTutorialOverlay(), true);

  const overlay = documentRef.getElementById('tutorial-overlay');
  overlay.animate = () => { throw new Error('hide should not defer pointer lock behind fade'); };

  assert.equal(hideTutorialOverlay(), true);
  assert.deepEqual(calls, ['lock']);
  assert.equal(overlay.hidden, true);
  assert.equal(overlay.inert, true);
  assert.equal(overlay.attributes['aria-hidden'], 'true');
});

test('tutorial overlay covers first-flight navigation and service basics', () => {
  const documentRef = createDocument();
  configureTutorialOverlay({ documentRef, isFlightActive: () => false });
  const overlay = documentRef.getElementById('tutorial-overlay');
  const copy = overlay.innerHTML;

  assert.match(copy, /PRESS 1 FOR THE GUIDED TUTORIAL OR 2 FOR FREE ROAM/);
  assert.match(copy, /Open waypoint actions/i);
  assert.match(copy, /Zoom and pan the system map/i);
  assert.match(copy, /Fast travel, autopilot, inspect, dock, land, clear route/i);
  assert.match(copy, /Activate nearby jump gate/i);
  assert.match(copy, /Hyperspace to nav target/i);
  assert.match(copy, /Mission board when docked/i);
  assert.match(copy, /Close overlay \/ exit when unlocked/i);
  assert.doesNotMatch(copy, /dogfight mode/i);
});

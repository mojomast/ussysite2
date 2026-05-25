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

test('tutorial hide requests pointer lock before fade completion', () => {
  const documentRef = createDocument();
  const calls = [];

  configureTutorialOverlay({
    documentRef,
    isFlightActive: () => true,
    requestPointerLock: () => calls.push('lock')
  });
  assert.equal(showTutorialOverlay(), true);

  const overlay = documentRef.getElementById('tutorial-overlay');
  overlay.animate = (_frames, _options) => ({
    addEventListener(_type, listener) {
      calls.push('finish-registered');
      listener();
    }
  });

  assert.equal(hideTutorialOverlay(), true);
  assert.deepEqual(calls, ['lock', 'finish-registered']);
  assert.equal(overlay.hidden, true);
});

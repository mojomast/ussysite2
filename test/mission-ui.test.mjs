import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.THREE = {
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    distanceTo(other) {
      return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
    }
  }
};
globalThis.performance ??= { now: () => 1000 };

const { buildNavGraph } = await import('../js/flight/navgraph.js');
const { generateMissionsForStation } = await import('../js/flight/missions.js');
const {
  acceptSelectedMission,
  canOpenMissionBoard,
  closeMissionBoard,
  openMissionBoard,
  renderMissionBoard
} = await import('../js/flight/missionUI.js');
const { STATIONS } = await import('../js/flight/world.js');

function createElement(id = '') {
  const classes = new Set();
  return {
    id,
    hidden: false,
    textContent: '',
    innerHTML: '',
    children: [],
    dataset: {},
    attributes: {},
    style: {},
    listeners: {},
    className: '',
    type: '',
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle: (name, active) => (active ? classes.add(name) : classes.delete(name))
    },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; }
  };
}

function createDocument() {
  const elements = Object.fromEntries([
    'mission-board-overlay',
    'mission-board-detail',
    'mission-active-sidebar',
    'mission-board-list',
    'mission-board-station',
    'mission-board-credits'
  ].map(id => [id, createElement(id)]));
  return {
    elements,
    getElementById: id => elements[id] || null,
    createElement: tag => createElement(tag)
  };
}

function state() {
  return {
    stationDef: STATIONS.find(station => station.id === 'hub-alpha'),
    navGraph: buildNavGraph(),
    flightState: { landed: true, missionBoardOpen: false },
    traderState: { credits: 1000, dockedStation: 'hub-alpha', activeMissions: [], completedMissionIds: [], missionBoard: { declinedMissionIds: [] } },
    documentRef: createDocument(),
    now: 42 * 86400000
  };
}

describe('mission board UI', () => {
  it('gates opening to landed docked stations with mission boards', () => {
    const station = STATIONS.find(item => item.id === 'hub-alpha');
    assert.equal(canOpenMissionBoard({ landed: true }, { dockedStation: 'hub-alpha' }, station), true);
    assert.equal(canOpenMissionBoard({ landed: false }, { dockedStation: 'hub-alpha' }, station), false);
    assert.equal(canOpenMissionBoard({ landed: true }, { dockedStation: 'hub-alpha' }, { ...station, hasMissions: false }), false);
  });

  it('renders card click selection into the detail panel', () => {
    const context = state();
    assert.equal(openMissionBoard(context).ok, true);
    const list = context.documentRef.elements['mission-board-list'];
    const detail = context.documentRef.elements['mission-board-detail'];
    const secondTitle = list.children[1].children?.[0]?.textContent;

    list.children[1].listeners.click();

    assert.equal(detail.children[0].textContent, secondTitle || generateMissionsForStation(context.stationDef, context.navGraph, 42)[1].title);
  });

  it('accepting updates the active sidebar', () => {
    const context = state();
    openMissionBoard(context);

    const result = acceptSelectedMission({ ...context, now: 1000 });

    assert.equal(result.ok, true);
    assert.equal(context.traderState.activeMissions.length, 1);
    assert.match(context.documentRef.elements['mission-active-sidebar'].children[0].textContent, /1\..+\/\//);
  });

  it('enforces active mission cap in UI accept flow', () => {
    const context = state();
    const existing = generateMissionsForStation(context.stationDef, context.navGraph, 42).slice(0, 3)
      .map(mission => ({ ...mission, status: 'ACTIVE', acceptedAt: 0 }));
    context.traderState.activeMissions = existing;
    openMissionBoard(context);

    const result = acceptSelectedMission({ ...context, now: 1000 });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'ACTIVE_LIMIT');
    assert.equal(context.traderState.activeMissions.length, 3);
    closeMissionBoard(context);
  });
});

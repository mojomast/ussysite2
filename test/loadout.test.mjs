import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

class TestClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class TestElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.classList = new TestClassList();
    this.hidden = false;
    this.onclick = null;
    this.listeners = new Map();
    this._textContent = '';
    this.innerHTML = '';
  }

  append(child) { this.children.push(child); }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  click() {
    if (this.onclick) this.onclick();
    const handler = this.listeners.get('click');
    if (handler) handler({ currentTarget: this });
  }
  set textContent(value) { this._textContent = String(value); this.children = []; }
  get textContent() { return this._textContent; }
}

function createDocument() {
  const ids = [
    'loadout-panel', 'loadout-credits', 'flight-credits', 'loadout-close',
    'loadout-primary-name', 'loadout-primary-damage', 'loadout-primary-fire-rate', 'loadout-primary-range', 'loadout-primary-options',
    'loadout-secondary-name', 'loadout-secondary-damage', 'loadout-secondary-fire-rate', 'loadout-secondary-options',
    'loadout-hull-value', 'loadout-shield-value', 'loadout-buy-armor', 'loadout-buy-shield'
  ];
  const elements = new Map(ids.map(id => [id, new TestElement(id)]));
  return {
    createElement: () => new TestElement(),
    getElementById: id => elements.get(id) || null
  };
}

const { WEAPON_DEFS, WEAPON_PRICES } = await import('../js/flight/combat-overhaul.js');
const { renderLoadoutScreen } = await import('../js/flight/loadout.js');

function state({ credits = 1000, owned = ['laser_mk1', 'missile_rack'], hull = 80, maxHull = 100, maxShieldHp = 0 } = {}) {
  return {
    traderState: { credits },
    combatState: {
      primaryWeapon: 'laser_mk1',
      secondaryWeapon: 'missile_rack',
      ownedWeapons: new Set(owned),
      hull,
      maxHull,
      maxShieldHp
    }
  };
}

function getOption(documentRef, slot, weaponId) {
  return documentRef.getElementById(`loadout-${slot}-options`).children.find(child => child.dataset.weaponId === weaponId);
}

describe('renderLoadoutScreen', () => {
  it('populates primary weapon name', () => {
    const documentRef = createDocument();
    const { traderState, combatState } = state();
    renderLoadoutScreen(traderState, WEAPON_DEFS, combatState, { documentRef });
    assert.equal(documentRef.getElementById('loadout-primary-name').textContent, 'STANDARD PULSE');
  });

  it('buys a weapon, deducts credits, and equips it', () => {
    const documentRef = createDocument();
    const { traderState, combatState } = state({ credits: 2000 });
    renderLoadoutScreen(traderState, WEAPON_DEFS, combatState, { documentRef });
    getOption(documentRef, 'primary', 'laser_mk2').click();
    assert.equal(traderState.credits, 2000 - WEAPON_PRICES.laser_mk2);
    assert.equal(combatState.ownedWeapons.has('laser_mk2'), true);
    assert.equal(combatState.primaryWeapon, 'laser_mk2');
  });

  it('leaves state unchanged when credits are insufficient', () => {
    const documentRef = createDocument();
    const { traderState, combatState } = state({ credits: 1 });
    renderLoadoutScreen(traderState, WEAPON_DEFS, combatState, { documentRef });
    getOption(documentRef, 'primary', 'railgun').click();
    assert.equal(traderState.credits, 1);
    assert.equal(combatState.ownedWeapons.has('railgun'), false);
    assert.equal(combatState.primaryWeapon, 'laser_mk1');
  });

  it('armor purchase caps hull at maxHull', () => {
    const documentRef = createDocument();
    const { traderState, combatState } = state({ hull: 90, maxHull: 100 });
    renderLoadoutScreen(traderState, WEAPON_DEFS, combatState, { documentRef });
    documentRef.getElementById('loadout-buy-armor').click();
    assert.equal(combatState.hull, 100);
    assert.equal(traderState.credits, 920);
  });

  it('shield purchase increments maxShieldHp and deducts 150 credits', () => {
    const documentRef = createDocument();
    const { traderState, combatState } = state({ maxShieldHp: 2 });
    renderLoadoutScreen(traderState, WEAPON_DEFS, combatState, { documentRef });
    documentRef.getElementById('loadout-buy-shield').click();
    assert.equal(combatState.maxShieldHp, 3);
    assert.equal(traderState.credits, 850);
  });
});

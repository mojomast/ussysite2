import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document ??= { getElementById: () => null };

const { combatState, reset } = await import('../js/flight/combat-state.js');
const {
  addKillFeedEntry,
  capRadarTrajectory,
  shouldDrawEnemyRadarContact,
  updateBossHealthBar,
  updateKillFeed,
  worldToRadar
} = await import('../js/flight/hud.js');

function createElement() {
  const classes = new Set();
  return {
    textContent: '',
    style: {},
    attributes: {},
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle: (name, active) => (active ? classes.add(name) : classes.delete(name))
    },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}

function createDocument(elements) {
  return {
    getElementById: id => elements[id] || null,
    createElement() {
      return {
        className: '',
        textContent: '',
        style: {
          opacity: '',
          props: {},
          setProperty(name, value) { this.props[name] = value; }
        }
      };
    }
  };
}

function createKillFeedElement() {
  return {
    children: [],
    replaceChildren(...children) { this.children = children; }
  };
}

test('worldToRadar maps world x/z into radar canvas coordinates', () => {
  assert.deepEqual(
    worldToRadar({ x: 14, z: 6 }, { x: 10, z: 2 }, 3),
    { x: 12, y: -12 }
  );
});

test('capRadarTrajectory limits trajectory tips to 14px', () => {
  const capped = capRadarTrajectory(30, 40);
  assert.equal(capped.length, 14);
  assert.ok(Math.abs(Math.hypot(capped.x, capped.y) - 14) < 0.000001);
});

test('stunned enemies do not draw radar contacts or trajectory lines', () => {
  const now = performance.now();
  const enemy = {
    visible: true,
    userData: {
      active: true,
      stunUntil: now + 1000,
      velocity: { x: 10, y: 0, z: 0 }
    }
  };

  assert.equal(shouldDrawEnemyRadarContact(enemy, now), false);
});

test('updateBossHealthBar renders active boss health and shield values', () => {
  const elements = {
    'boss-health-hud': createElement(),
    'boss-health-label': createElement(),
    'boss-health-value': createElement(),
    'boss-health-bar': createElement(),
    'boss-shield-bar': createElement()
  };
  const boss = {
    userData: {
      active: true,
      isBoss: true,
      health: 9,
      maxHealth: 18,
      shieldHp: 3,
      maxShieldHp: 6,
      bossPhase: 2
    }
  };

  assert.equal(updateBossHealthBar({ bossActive: true, bossEnemyRef: boss }, 1000, true, createDocument(elements)), true);
  assert.equal(elements['boss-health-hud'].classList.contains('active'), true);
  assert.equal(elements['boss-health-hud'].attributes['aria-hidden'], 'false');
  assert.equal(elements['boss-health-label'].textContent, 'HERMES-DREADNOUGHT // PHASE 2');
  assert.equal(elements['boss-health-value'].textContent, '9/18 HULL // 3/6 SHD');
  assert.equal(elements['boss-health-bar'].style.width, '50.0%');
  assert.equal(elements['boss-shield-bar'].style.width, '50.0%');
});

test('updateBossHealthBar hides when boss is inactive', () => {
  const elements = { 'boss-health-hud': createElement() };
  assert.equal(updateBossHealthBar({ bossActive: false, bossEnemyRef: null }, 2000, true, createDocument(elements)), true);
  assert.equal(elements['boss-health-hud'].classList.contains('active'), false);
  assert.equal(elements['boss-health-hud'].attributes['aria-hidden'], 'true');
});

test('updateBossHealthBar throttles DOM writes', () => {
  const elements = { 'boss-health-hud': createElement() };
  const doc = createDocument(elements);
  assert.equal(updateBossHealthBar({ bossActive: false }, 3000, true, doc), true);
  assert.equal(updateBossHealthBar({ bossActive: false }, 3050, false, doc), false);
  assert.equal(updateBossHealthBar({ bossActive: false }, 3121, false, doc), true);
});

test('addKillFeedEntry trims to newest four and marks dirty', () => {
  reset(combatState);
  for (let i = 1; i <= 5; i += 1) addKillFeedEntry(`ENTRY ${i}`, { now: i * 100, color: 'red' });

  assert.equal(combatState.killFeed.length, 4);
  assert.deepEqual(combatState.killFeed.map(entry => entry.text), ['ENTRY 2', 'ENTRY 3', 'ENTRY 4', 'ENTRY 5']);
  assert.equal(combatState.killFeedDirty, true);
});

test('updateKillFeed clears dirty flag and renders newest first', () => {
  reset(combatState);
  const elements = { 'kill-feed': createKillFeedElement() };
  const doc = createDocument(elements);
  addKillFeedEntry('FIRST', { now: 100, color: 'red' });
  addKillFeedEntry('SECOND', { now: 200, color: 'blue' });

  assert.equal(updateKillFeed(300, doc, true), true);
  assert.equal(combatState.killFeedDirty, false);
  assert.deepEqual(elements['kill-feed'].children.map(child => child.textContent), ['SECOND', 'FIRST']);
  assert.equal(elements['kill-feed'].children[0].style.props['--kill-feed-entry-color'], 'blue');
});

test('updateKillFeed prunes entries older than four seconds', () => {
  reset(combatState);
  const elements = { 'kill-feed': createKillFeedElement() };
  const doc = createDocument(elements);
  addKillFeedEntry('OLD', { now: 0, color: 'red' });
  updateKillFeed(100, doc, true);

  assert.equal(combatState.killFeedDirty, false);
  assert.equal(updateKillFeed(4101, doc, true), true);
  assert.equal(combatState.killFeed.length, 0);
  assert.equal(elements['kill-feed'].children.length, 0);
  assert.equal(combatState.killFeedDirty, false);
});

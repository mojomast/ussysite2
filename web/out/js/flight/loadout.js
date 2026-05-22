import { WEAPON_PRICES } from './combat-overhaul.js';

const ARMOR_COST = 80;
const SHIELD_COST = 150;

function byId(id, documentRef = document) {
  return documentRef.getElementById(id);
}

function setText(id, value, documentRef = document) {
  const node = byId(id, documentRef);
  if (node) node.textContent = value;
}

function weaponById(weaponDefs, weaponId) {
  return weaponDefs.find(weapon => weapon.id === weaponId) || null;
}

function getOwnedSet(state) {
  if (state.ownedWeapons instanceof Set) return state.ownedWeapons;
  if (Array.isArray(state.ownedWeapons)) {
    state.ownedWeapons = new Set(state.ownedWeapons);
    return state.ownedWeapons;
  }
  state.ownedWeapons = new Set();
  return state.ownedWeapons;
}

function getEquipped(state, slot) {
  return state[`${slot}Weapon`] || state.equipped?.[slot] || '';
}

function setEquipped(state, slot, weaponId) {
  state[`${slot}Weapon`] = weaponId;
  if (state.equipped && typeof state.equipped === 'object') state.equipped[slot] = weaponId;
}

function slotForWeapon(weapon) {
  return weapon.type === 'missile' || weapon.type === 'area' ? 'secondary' : 'primary';
}

function formatFireRate(weapon) {
  if (!weapon?.cooldown) return '--';
  return `${(1000 / weapon.cooldown).toFixed(1)}/s`;
}

function formatRange(weapon) {
  if (weapon?.projectileSpeed && weapon?.projectileLife) return `${Math.round((weapon.projectileSpeed * weapon.projectileLife) / 1000)}u`;
  if (weapon?.aoeRadius) return `${weapon.aoeRadius}u AOE`;
  return '--';
}

function flashInsufficient(node) {
  if (!node) return;
  node.classList.add('insufficient');
  const timer = globalThis.setTimeout;
  if (typeof timer === 'function') timer(() => node.classList.remove('insufficient'), 600);
}

function renderEquippedCard(slot, weapon, documentRef) {
  setText(`loadout-${slot}-name`, weapon?.name || 'UNASSIGNED', documentRef);
  setText(`loadout-${slot}-damage`, weapon ? `DMG ${weapon.damage}` : 'DMG --', documentRef);
  setText(`loadout-${slot}-fire-rate`, weapon ? `FIRE ${formatFireRate(weapon)}` : 'FIRE --', documentRef);
  setText(`loadout-${slot}-range`, weapon ? `RANGE ${formatRange(weapon)}` : 'RANGE --', documentRef);
}

function makeOptionButton({ traderState, combatState, weapon, equippedId, owned, slot, rerender, onChange, documentRef }) {
  const button = documentRef.createElement('button');
  const price = WEAPON_PRICES[weapon.id] ?? 0;
  const isEquipped = equippedId === weapon.id;
  button.type = 'button';
  button.className = `loadout-option-btn ${owned ? 'owned' : 'locked'}`;
  button.dataset.weaponId = weapon.id;
  button.innerHTML = `
    <span>${weapon.name}</span>
    <small>DMG ${weapon.damage} // FIRE ${formatFireRate(weapon)} // RANGE ${formatRange(weapon)}</small>
    <strong>${owned ? 'EQUIP' : `${price}CR`}</strong>
  `;
  if (isEquipped) button.hidden = true;
  button.addEventListener('click', () => {
    if (!owned) {
      if (traderState.credits < price) {
        flashInsufficient(button);
        return;
      }
      traderState.credits -= price;
      getOwnedSet(combatState).add(weapon.id);
    }
    setEquipped(combatState, slot, weapon.id);
    onChange?.();
    rerender();
  });
  return button;
}

function buyArmor(traderState, combatState, node, onChange) {
  if (traderState.credits < ARMOR_COST) {
    flashInsufficient(node);
    return false;
  }
  const maxHull = Number.isFinite(combatState.maxHull) ? combatState.maxHull : 100;
  const currentHull = Number.isFinite(combatState.hull) ? combatState.hull : (Number.isFinite(combatState.armor) ? combatState.armor : maxHull);
  traderState.credits -= ARMOR_COST;
  combatState.hull = Math.min(maxHull, currentHull + 20);
  if (Number.isFinite(combatState.armor)) combatState.armor = Math.min(maxHull, combatState.hull);
  onChange?.();
  return true;
}

function buyShield(traderState, combatState, node, onChange) {
  if (traderState.credits < SHIELD_COST) {
    flashInsufficient(node);
    return false;
  }
  traderState.credits -= SHIELD_COST;
  combatState.maxShieldHp = (Number(combatState.maxShieldHp) || 0) + 1;
  onChange?.();
  return true;
}

export function closeLoadoutScreen(documentRef = document) {
  const panel = byId('loadout-panel', documentRef);
  if (panel) panel.hidden = true;
}

export function renderLoadoutScreen(traderState, weaponDefs, combatState, options = {}) {
  const documentRef = options.documentRef || document;
  const panel = byId('loadout-panel', documentRef);
  if (!panel) return null;
  const owned = getOwnedSet(combatState);
  const primaryId = getEquipped(combatState, 'primary');
  const secondaryId = getEquipped(combatState, 'secondary');
  const primary = weaponById(weaponDefs, primaryId);
  const secondary = weaponById(weaponDefs, secondaryId);

  panel.hidden = false;
  setText('loadout-credits', `${traderState.credits}CR`, documentRef);
  setText('flight-credits', `${traderState.credits}CR`, documentRef);
  renderEquippedCard('primary', primary, documentRef);
  renderEquippedCard('secondary', secondary, documentRef);
  setText('loadout-hull-value', `${Math.round(Number(combatState.hull ?? combatState.armor ?? 0))}/${Math.round(Number(combatState.maxHull ?? 100))}`, documentRef);
  setText('loadout-shield-value', `${Math.round(Number(combatState.maxShieldHp ?? 0))}`, documentRef);

  const rerender = () => renderLoadoutScreen(traderState, weaponDefs, combatState, options);
  for (const slot of ['primary', 'secondary']) {
    const grid = byId(`loadout-${slot}-options`, documentRef);
    if (!grid) continue;
    grid.textContent = '';
    const equippedId = slot === 'primary' ? primaryId : secondaryId;
    const weapons = weaponDefs.filter(weapon => slotForWeapon(weapon) === slot && weapon.id !== equippedId);
    if (!weapons.length) {
      const empty = documentRef.createElement('span');
      empty.className = 'loadout-empty';
      empty.textContent = 'NO ALTERNATE SYSTEMS AVAILABLE';
      grid.append(empty);
      continue;
    }
    weapons.forEach(weapon => grid.append(makeOptionButton({
      traderState,
      combatState,
      weapon,
      equippedId,
      owned: owned.has(weapon.id),
      slot,
      rerender,
      onChange: options.onChange,
      documentRef
    })));
  }

  const armorButton = byId('loadout-buy-armor', documentRef);
  if (armorButton) {
    armorButton.onclick = () => {
      if (buyArmor(traderState, combatState, armorButton, options.onChange)) rerender();
    };
  }
  const shieldButton = byId('loadout-buy-shield', documentRef);
  if (shieldButton) {
    shieldButton.onclick = () => {
      if (buyShield(traderState, combatState, shieldButton, options.onChange)) rerender();
    };
  }
  const closeButton = byId('loadout-close', documentRef);
  if (closeButton) closeButton.onclick = () => {
    closeLoadoutScreen(documentRef);
    options.onClose?.();
  };

  return panel;
}

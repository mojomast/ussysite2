import { COMMODITIES, traderState } from '../economy/trader.js';
import { WEAPON_DEFS, SKILL_TREE_NODES } from '../flight/combat-overhaul.js';
import { combatState } from '../flight/combat-state.js';
import { flightState } from '../flight/state.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cargoUsed() {
  return Object.values(traderState.cargo).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0);
}

function weaponById(weaponId) {
  return WEAPON_DEFS.find(weapon => weapon.id === weaponId) || null;
}

function skillStatus(node) {
  if (combatState.unlocked.has(node.id)) return 'unlocked';
  if (node.requires && !combatState.unlocked.has(node.requires)) return 'locked';
  if (combatState.skillPoints >= node.cost) return 'available';
  return 'locked';
}

function renderCargo() {
  const rows = COMMODITIES.map(commodity => {
    const qty = traderState.cargo[commodity.id] || 0;
    return `
      <div class="inv-row ${qty > 0 ? '' : 'is-empty'}">
        <span>${escapeHtml(commodity.name)}</span>
        <strong>${qty}</strong>
      </div>`;
  });
  const emptySlots = Math.max(0, traderState.maxCargo - cargoUsed());
  for (let i = 0; i < emptySlots; i++) {
    rows.push('<div class="inv-row inv-placeholder"><span>EMPTY SLOT</span><strong>--</strong></div>');
  }
  return rows.join('');
}

function renderWeaponCard(label, weaponId) {
  const weapon = weaponById(weaponId);
  if (!weapon) return `<div class="inv-card"><span class="inv-kicker">${label}</span><strong>UNASSIGNED</strong></div>`;
  return `
    <div class="inv-card inv-weapon-card">
      <span class="inv-kicker">${label}</span>
      <strong>${escapeHtml(weapon.name)}</strong>
      <p>${escapeHtml(weapon.description)}</p>
      <div class="inv-stat-grid">
        <span>DMG ${weapon.damage}</span>
        <span>CD ${weapon.cooldown}ms</span>
        <span>ENG ${weapon.energyCost}</span>
        <span>AMMO ${weapon.ammoCost}</span>
      </div>
    </div>`;
}

function renderWeapons() {
  const owned = [...combatState.ownedWeapons]
    .map(weaponId => weaponById(weaponId))
    .filter(Boolean)
    .map(weapon => `<span class="inv-chip">${escapeHtml(weapon.name)}</span>`)
    .join('');
  return `
    ${renderWeaponCard('PRIMARY', combatState.primaryWeapon)}
    ${renderWeaponCard('SECONDARY', combatState.secondaryWeapon)}
    <div class="inv-card">
      <span class="inv-kicker">ARSENAL</span>
      <div class="inv-chip-list">${owned || '<span class="inv-chip is-empty">NO OWNED WEAPONS</span>'}</div>
    </div>
    <div class="inv-card inv-flight-readout">
      <span>SHIELD ${Math.round(flightState.shield || 0)}</span>
      <span>ARMOR ${Math.round(flightState.armor || 0)}</span>
      <span>ENERGY ${Math.round(flightState.energy || 0)}</span>
      <span>HEAT ${Math.round(combatState.heat)}/${combatState.maxHeat}</span>
    </div>`;
}

function renderSkills() {
  const branches = ['HULL', 'SHIELD', 'WEAPONS', 'ENGINES'];
  return branches.map(branch => {
    const nodes = SKILL_TREE_NODES
      .filter(node => node.branch === branch)
      .map(node => {
        const status = skillStatus(node);
        return `
          <div class="inv-skill inv-skill-${status}">
            <span><span class="inv-tier-badge">${branch}</span>${escapeHtml(node.name)}</span>
            <strong>${node.cost}SP</strong>
            <small>${escapeHtml(status.toUpperCase())} // ${escapeHtml(node.effect)}</small>
          </div>`;
      }).join('');
    return `<div class="inv-skill-branch"><h4>${branch}</h4>${nodes}</div>`;
  }).join('');
}

export function renderInventoryPanel() {
  const panel = document.getElementById('inventory-panel');
  if (!panel) return;
  const cargoGrid = document.getElementById('inv-cargo-grid');
  const weaponsGrid = document.getElementById('inv-weapons-grid');
  const skillsGrid = document.getElementById('inv-skills-grid');
  const spDisplay = document.getElementById('inv-sp');
  const creditsDisplay = document.getElementById('inv-credits-display');
  const cargoDisplay = document.getElementById('inv-cargo-used');
  const upgradesDisplay = document.getElementById('inv-upgrades-count');

  if (cargoGrid) cargoGrid.innerHTML = `<div class="inv-col-title">CARGO HOLD</div>${renderCargo()}`;
  if (weaponsGrid) weaponsGrid.innerHTML = `<div class="inv-col-title">WEAPONS</div>${renderWeapons()}`;
  if (skillsGrid) skillsGrid.innerHTML = `<div class="inv-col-title">SKILL TREE</div><div class="inv-skill-summary">XP ${combatState.xp}/${combatState.xpToNextPoint} // SP ${combatState.skillPoints}</div>${renderSkills()}`;
  if (spDisplay) spDisplay.textContent = `SP: ${combatState.skillPoints}`;
  if (creditsDisplay) creditsDisplay.textContent = `${traderState.credits}CR`;
  if (cargoDisplay) cargoDisplay.textContent = `CARGO: ${cargoUsed()}/${traderState.maxCargo}`;
  if (upgradesDisplay) upgradesDisplay.textContent = `SKILLS: ${combatState.unlocked.size}/${SKILL_TREE_NODES.length}`;
}

export function toggleInventoryPanel() {
  const panel = document.getElementById('inventory-panel');
  if (!panel) return;
  const hidden = panel.hidden;
  panel.hidden = !hidden;
  if (!hidden) return;
  renderInventoryPanel();
}

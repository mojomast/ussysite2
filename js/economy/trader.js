import { ttsEngine } from '../tts/engine.js';
import {
  SKILL_TREE_NODES,
  WEAPON_DEFS,
  WEAPON_PRICES,
  getStationEquipment,
  normalizeStationCategory
} from '../flight/combat-overhaul.js';
import { combatState, buyWeapon, equipWeapon, reapplySkills, unlockSkillNode } from '../flight/combat-state.js';
import { refreshInventoryIfOpen } from '../ui/inventory-panel.js';

export const traderState = {
  credits: 1000,
  fuel: 100,
  maxFuel: 100,
  fuelPerSecond: 0.35,
  fuelCostPerUnit: 8,
  cargo: {},
  maxCargo: 20,
  cargoUsed: 0,
  lastTrade: null,
  tradeLog: [],
  docked: false,
  dockedStation: null
};

export const COMMODITIES = [
  { id: 'devplans', name: 'DEVPLANS', basePrice: 45, category: 'core' },
  { id: 'agents', name: 'AGENT CORES', basePrice: 120, category: 'core' },
  { id: 'audiodata', name: 'AUDIO DATA', basePrice: 70, category: 'creative' },
  { id: 'mediafiles', name: 'MEDIA FILES', basePrice: 55, category: 'creative' },
  { id: 'govdata', name: 'GOV DATA', basePrice: 90, category: 'governance' },
  { id: 'shellcreds', name: 'SHELL CREDS', basePrice: 150, category: 'infrastructure' },
  { id: 'exploitkit', name: 'EXPLOIT KIT', basePrice: 200, category: 'security' },
  { id: 'rawlogs', name: 'RAW LOGS', basePrice: 30, category: 'tools' }
];

const stationProfiles = new Map();
const noop = () => {};
let showGameMessageRef = noop;
let dismissGameMessageRef = noop;
let updateFlightHudRef = noop;
let getVoicePersonaRef = () => ({});
let onTradeRef = noop;

export function configureTrader({ showGameMessage, dismissGameMessage, updateFlightHud, getVoicePersona, onTrade } = {}) {
  if (typeof showGameMessage === 'function') showGameMessageRef = showGameMessage;
  if (typeof dismissGameMessage === 'function') dismissGameMessageRef = dismissGameMessage;
  if (typeof updateFlightHud === 'function') updateFlightHudRef = updateFlightHud;
  if (typeof getVoicePersona === 'function') getVoicePersonaRef = getVoicePersona;
  if (typeof onTrade === 'function') onTradeRef = onTrade;
}

function getProject(projectId) {
  return (window.USSY_PROJECTS || []).find(project => project.id === projectId) || null;
}

function normalizeCategory(category) {
  if (category === 'infra') return 'infrastructure';
  if (category === 'ai') return 'security';
  return category;
}

export function getStationProfile(projectId) {
  if (stationProfiles.has(projectId)) return stationProfiles.get(projectId);
  const category = normalizeCategory(getProject(projectId)?.category);
  let produces = ['rawlogs'];
  let demands = ['devplans'];

  if (category === 'core') {
    produces = ['devplans', 'agents'];
    demands = ['shellcreds'];
  } else if (category === 'creative') {
    produces = ['audiodata', 'mediafiles'];
    demands = ['devplans'];
  } else if (category === 'infrastructure') {
    produces = ['shellcreds'];
    demands = ['rawlogs'];
  } else if (category === 'security') {
    produces = ['exploitkit'];
    demands = ['govdata'];
  } else if (category === 'governance') {
    produces = ['govdata'];
    demands = ['agents'];
  } else if (category === 'tools') {
    produces = ['rawlogs'];
    demands = ['audiodata'];
  }

  const profile = { produces, demands, fuelAvailable: true, fuelStock: 100 };
  stationProfiles.set(projectId, profile);
  return profile;
}

export function getMarketPrice(projectId, commodityId, action = 'buy') {
  const commodity = COMMODITIES.find(item => item.id === commodityId);
  if (!commodity) return 0;
  const profile = getStationProfile(projectId);
  let multiplier = 1;
  if (profile.produces.includes(commodityId)) multiplier = 0.78;
  if (profile.demands.includes(commodityId)) multiplier = 1.35;
  if (action === 'sell' && !profile.demands.includes(commodityId)) multiplier *= 0.88;
  const hashSource = `${projectId}:${commodityId}`;
  const hash = Array.from(hashSource).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const noise = ((hash % 100) / 100) * 0.24 - 0.12;
  return Math.max(1, Math.round(commodity.basePrice * (multiplier + noise)));
}

export function getCargoUsed() {
  traderState.cargoUsed = Object.values(traderState.cargo).reduce((sum, qty) => sum + qty, 0);
  return traderState.cargoUsed;
}

function getCommodityName(commodityId) {
  return COMMODITIES.find(item => item.id === commodityId)?.name || commodityId.toUpperCase();
}

function stationName(projectId) {
  return getProject(projectId)?.name || 'UNKNOWN';
}

function stationSource(projectId) {
  return `${stationName(projectId).toUpperCase()} DOCK CONTROL`;
}

export function openTradeMenu(projectId) {
  traderState.docked = true;
  traderState.dockedStation = projectId;
  const projectName = stationName(projectId);
  showGameMessageRef({
    type: 'STATION COMMS',
    source: stationSource(projectId),
    text: `WELCOME TO ${projectName.toUpperCase()} STATION. CREDITS: ${traderState.credits}. FUEL: ${Math.round(traderState.fuel)}%. CARGO: ${getCargoUsed()}/${traderState.maxCargo} UNITS. SELECT SERVICE:`,
    choices: [
      { key: '1', code: 'Digit1', label: 'VIEW MARKET', action: () => showMarket(projectId, 0) },
      { key: '2', code: 'Digit2', label: 'REFUEL', action: () => refuelDialog(projectId) },
      { key: '3', code: 'Digit3', label: 'VIEW CARGO', action: () => showCargoHold(projectId) },
      { key: '4', code: 'Digit4', label: 'SHIPYARD', action: () => showShipyard(projectId) },
      { key: 'space', code: 'Space', label: 'DISMISS', action: () => dismissGameMessageRef() }
    ]
  });
}

export function closeTradeMenu() {
  dismissGameMessageRef();
}

function sortedMarket(projectId) {
  const profile = getStationProfile(projectId);
  return [...COMMODITIES].sort((a, b) => {
    const score = id => (profile.produces.includes(id) ? 2 : 0) + (profile.demands.includes(id) ? 3 : 0);
    return score(b.id) - score(a.id) || a.name.localeCompare(b.name);
  });
}

function showMarket(projectId, page = 0) {
  const items = sortedMarket(projectId);
  const start = page * 3;
  const visible = items.slice(start, start + 3);
  const choices = visible.map((commodity, idx) => {
    const buyPrice = getMarketPrice(projectId, commodity.id, 'buy');
    const sellPrice = getMarketPrice(projectId, commodity.id, 'sell');
    const stock = traderState.cargo[commodity.id] || 0;
    return {
      key: String(idx + 1),
      code: `Digit${idx + 1}`,
      label: `${commodity.name} BUY ${buyPrice}cr SELL ${sellPrice}cr HOLD:${stock}`,
      action: () => tradeActionDialog(projectId, commodity.id)
    };
  });
  if (start + 3 < items.length) {
    choices.push({ key: '4', code: 'Digit4', label: 'NEXT MARKET PAGE', action: () => showMarket(projectId, page + 1) });
  } else {
    choices.push({ key: '4', code: 'Digit4', label: 'BACK', action: () => openTradeMenu(projectId) });
  }
  showGameMessageRef({
    type: 'STATION MARKET',
    source: stationSource(projectId),
    text: `MARKET PAGE ${page + 1}. PRODUCTION GOODS ARE CHEAP. DEMAND GOODS PAY PREMIUMS. SELECT COMMODITY:`,
    choices
  });
}

function getWeaponSlot(weaponId) {
  const weapon = WEAPON_DEFS.find(item => item.id === weaponId);
  if (!weapon) return '';
  if (combatState.primaryWeapon === weaponId) return 'PRIMARY';
  if (combatState.secondaryWeapon === weaponId) return 'SECONDARY';
  return '';
}

function weaponShopRows(weaponIds) {
  return weaponIds.map(weaponId => {
    const weapon = WEAPON_DEFS.find(item => item.id === weaponId);
    if (!weapon) return `UNKNOWN ${weaponId}`;
    const price = WEAPON_PRICES[weaponId] ?? 0;
    const owned = combatState.ownedWeapons.has(weaponId);
    const slot = getWeaponSlot(weaponId);
    return `${weapon.name} ${price}cr ${owned ? 'OWNED' : 'LOCKED'}${slot ? ` ${slot}` : ''}`;
  });
}

function showShipyard(projectId) {
  showGameMessageRef({
    type: 'SHIPYARD',
    source: `${stationName(projectId).toUpperCase()} SHIPYARD`,
    text: `SHIPYARD ONLINE. CREDITS: ${traderState.credits}CR. SP: ${combatState.skillPoints}. SELECT BAY:`,
    choices: [
      { key: '1', code: 'Digit1', label: 'WEAPONS', action: () => showWeaponShop(projectId, 0) },
      { key: '2', code: 'Digit2', label: 'SKILL TREE', action: () => showSkillTreeBranchMenu(projectId) },
      { key: '3', code: 'Digit3', label: 'BACK', action: () => openTradeMenu(projectId) }
    ]
  });
}

function showSkillTreeBranchMenu(projectId) {
  showGameMessageRef({
    type: 'SKILL TREE',
    source: `${stationName(projectId).toUpperCase()} SHIPYARD`,
    text: `SELECT UPGRADE BRANCH. SP: ${combatState.skillPoints}.`,
    choices: [
      { key: '1', code: 'Digit1', label: 'HULL', action: () => showSkillTree('HULL', projectId) },
      { key: '2', code: 'Digit2', label: 'SHIELD', action: () => showSkillTree('SHIELD', projectId) },
      { key: '3', code: 'Digit3', label: 'WEAPONS', action: () => showSkillTree('WEAPONS', projectId) },
      { key: '4', code: 'Digit4', label: 'ENGINES', action: () => showSkillTree('ENGINES', projectId) }
    ]
  });
}

function stationWeaponIds(projectId) {
  const category = getProject(projectId)?.category;
  return getStationEquipment(normalizeStationCategory(category));
}

function showWeaponShop(projectId, page = 0) {
  const weaponIds = stationWeaponIds(projectId);
  const start = page * 3;
  const visible = weaponIds.slice(start, start + 3);
  const choices = visible.map((weaponId, idx) => {
    const weapon = WEAPON_DEFS.find(item => item.id === weaponId);
    return {
      key: String(idx + 1),
      code: `Digit${idx + 1}`,
      label: weapon?.name || weaponId.toUpperCase(),
      action: () => weaponDetailDialog(projectId, weaponId, page)
    };
  });

  if (start + 3 < weaponIds.length) {
    choices.push({ key: '4', code: 'Digit4', label: 'NEXT WEAPON PAGE', action: () => showWeaponShop(projectId, page + 1) });
  } else {
    choices.push({ key: '4', code: 'Digit4', label: 'BACK', action: () => showShipyard(projectId) });
  }

  showGameMessageRef({
    type: 'WEAPON SHOP',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: `WEAPONS PAGE ${page + 1}. ${weaponShopRows(visible).join(' // ')}`,
    choices
  });
}

function weaponDetailDialog(projectId, weaponId, page = 0) {
  const weapon = WEAPON_DEFS.find(item => item.id === weaponId);
  if (!weapon) return showWeaponShop(projectId, page);
  const price = WEAPON_PRICES[weaponId] ?? 0;
  const owned = combatState.ownedWeapons.has(weaponId);
  const choices = [];
  if (!owned && traderState.credits >= price) {
    choices.push({ key: '1', code: 'Digit1', label: `BUY ${price}CR`, action: () => confirmWeaponBuy(projectId, weaponId, page) });
  }
  if (owned) {
    choices.push({ key: '1', code: 'Digit1', label: 'EQUIP PRIMARY', action: () => confirmWeaponEquip(projectId, weaponId, 'primary', page) });
    choices.push({ key: '2', code: 'Digit2', label: 'EQUIP SECONDARY', action: () => confirmWeaponEquip(projectId, weaponId, 'secondary', page) });
  }
  choices.push({ key: 'b', code: 'KeyB', label: 'BACK', action: () => showWeaponShop(projectId, page) });
  showGameMessageRef({
    type: 'WEAPON DETAIL',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: `${weapon.name}. DMG ${weapon.damage}. CD ${weapon.cooldown}MS. ENERGY ${weapon.energyCost}. ${weapon.description} PRICE ${price}CR. ${owned ? 'OWNED.' : `CREDITS ${traderState.credits}CR.`}`,
    choices
  });
}

function confirmWeaponBuy(projectId, weaponId, page = 0) {
  const result = buyWeapon(weaponId, traderState);
  reapplySkills();
  updateFlightHudRef(true);
  refreshInventoryIfOpen();
  showGameMessageRef({
    type: result.success ? 'WEAPON PURCHASED' : 'PURCHASE DENIED',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: result.message,
    choices: [
      { key: '1', code: 'Digit1', label: 'DETAIL', action: () => weaponDetailDialog(projectId, weaponId, page) },
      { key: '2', code: 'Digit2', label: 'WEAPON SHOP', action: () => showWeaponShop(projectId, page) }
    ]
  });
}

function confirmWeaponEquip(projectId, weaponId, slot, page = 0) {
  const result = equipWeapon(weaponId, slot);
  reapplySkills();
  updateFlightHudRef(true);
  refreshInventoryIfOpen();
  showGameMessageRef({
    type: result.success ? 'WEAPON EQUIPPED' : 'EQUIP FAILED',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: result.message,
    choices: [
      { key: '1', code: 'Digit1', label: 'WEAPON SHOP', action: () => showWeaponShop(projectId, page) },
      { key: '2', code: 'Digit2', label: 'SHIPYARD', action: () => showShipyard(projectId) }
    ]
  });
}

function skillNodeStatus(node) {
  if (combatState.unlocked.has(node.id)) return 'UNLOCKED';
  if (node.requires && !combatState.unlocked.has(node.requires)) return 'LOCKED';
  if (combatState.skillPoints >= node.cost) return 'AVAILABLE';
  return 'LOCKED';
}

function showSkillTree(branch = 'HULL', projectId) {
  const nodes = SKILL_TREE_NODES.filter(node => node.branch === branch);
  const available = nodes.filter(node => skillNodeStatus(node) === 'AVAILABLE').slice(0, 3);
  const choices = available.map((node, idx) => ({
    key: String(idx + 1),
    code: `Digit${idx + 1}`,
    label: `${node.name} ${node.cost}SP`,
    action: () => confirmSkillUnlock(projectId, node.id, branch)
  }));
  choices.push({ key: '4', code: 'Digit4', label: 'BACK', action: () => showShipyard(projectId) });

  showGameMessageRef({
    type: `${branch} SKILLS`,
    source: `${stationName(projectId).toUpperCase()} SHIPYARD`,
    text: `SP ${combatState.skillPoints}. ${nodes.map(node => {
      const status = skillNodeStatus(node);
      const requires = node.requires ? ` REQUIRES ${node.requires.toUpperCase()}` : '';
      const marker = status === 'UNLOCKED' ? 'OK' : (status === 'AVAILABLE' ? 'AVAILABLE' : 'LOCKED');
      return `${node.name} ${node.cost}SP ${marker}${status === 'LOCKED' ? requires : ''}`;
    }).join(' // ')}`,
    choices
  });
}

function confirmSkillUnlock(projectId, nodeId, branch) {
  const result = unlockSkillNode(nodeId);
  reapplySkills();
  updateFlightHudRef(true);
  refreshInventoryIfOpen();
  showGameMessageRef({
    type: result.success ? 'SKILL UNLOCKED' : 'SKILL LOCKED',
    source: `${stationName(projectId).toUpperCase()} SHIPYARD`,
    text: result.message,
    choices: [{ key: '1', code: 'Digit1', label: 'BACK', action: () => showSkillTree(branch, projectId) }]
  });
}

function tradeActionDialog(projectId, commodityId) {
  const commodityName = getCommodityName(commodityId);
  const stock = traderState.cargo[commodityId] || 0;
  showGameMessageRef({
    type: 'TRADE CONSOLE',
    source: stationSource(projectId),
    text: `${commodityName}. BUY PRICE ${getMarketPrice(projectId, commodityId, 'buy')}cr. SELL PRICE ${getMarketPrice(projectId, commodityId, 'sell')}cr. HOLDING ${stock}. SELECT ACTION:`,
    choices: [
      { key: '1', code: 'Digit1', label: `BUY ${commodityName}`, action: () => buyDialog(projectId, commodityId) },
      { key: '2', code: 'Digit2', label: `SELL ${commodityName}`, action: () => sellDialog(projectId, commodityId) },
      { key: '3', code: 'Digit3', label: 'BACK TO MARKET', action: () => showMarket(projectId, 0) },
      { key: '4', code: 'Digit4', label: 'STATION MENU', action: () => openTradeMenu(projectId) }
    ]
  });
}

function quantityChoices(max, onSelect, backAction) {
  const amounts = [1, 5, 10, max].filter((qty, idx, arr) => qty > 0 && qty <= max && arr.indexOf(qty) === idx);
  const choices = amounts.slice(0, 4).map((qty, idx) => ({
    key: String(idx + 1),
    code: `Digit${idx + 1}`,
    label: qty === max ? `MAX ${qty}` : `${qty} UNIT${qty === 1 ? '' : 'S'}`,
    action: () => onSelect(qty)
  }));
  if (choices.length < 4) choices.push({ key: '4', code: 'Digit4', label: 'BACK', action: backAction });
  return choices;
}

function buyDialog(projectId, commodityId) {
  const price = getMarketPrice(projectId, commodityId, 'buy');
  const cargoSpace = traderState.maxCargo - getCargoUsed();
  const affordable = Math.floor(traderState.credits / price);
  const max = Math.min(affordable, cargoSpace);
  const name = getCommodityName(commodityId);
  showGameMessageRef({
    type: 'BUY ORDER',
    source: stationSource(projectId),
    text: `BUY ${name} AT ${price}cr EACH. YOU HAVE ${traderState.credits}cr. HOW MANY? MAX ${max}.`,
    choices: max > 0
      ? quantityChoices(max, qty => confirmTrade('buy', projectId, commodityId, qty), () => tradeActionDialog(projectId, commodityId))
      : [{ key: '1', code: 'Digit1', label: 'BACK', action: () => tradeActionDialog(projectId, commodityId) }]
  });
}

function sellDialog(projectId, commodityId) {
  const price = getMarketPrice(projectId, commodityId, 'sell');
  const max = traderState.cargo[commodityId] || 0;
  const name = getCommodityName(commodityId);
  showGameMessageRef({
    type: 'SELL ORDER',
    source: stationSource(projectId),
    text: `SELL ${name} AT ${price}cr EACH. HOLDING ${max}. HOW MANY?`,
    choices: max > 0
      ? quantityChoices(max, qty => confirmTrade('sell', projectId, commodityId, qty), () => tradeActionDialog(projectId, commodityId))
      : [{ key: '1', code: 'Digit1', label: 'BACK', action: () => tradeActionDialog(projectId, commodityId) }]
  });
}

function confirmTrade(action, projectId, commodityId, qty) {
  const result = executeTrade(action, projectId, commodityId, qty);
  updateFlightHudRef(true);
  refreshInventoryIfOpen();
  showGameMessageRef({
    type: result.success ? 'TRADE CONFIRMED' : 'TRADE REJECTED',
    source: stationSource(projectId),
    text: result.message,
    choices: [
      { key: '1', code: 'Digit1', label: 'MARKET', action: () => showMarket(projectId, 0) },
      { key: '2', code: 'Digit2', label: 'STATION MENU', action: () => openTradeMenu(projectId) }
    ]
  });
}

export function executeTrade(action, projectId, commodityId, qty) {
  const quantity = Math.max(0, Math.floor(qty));
  const commodity = COMMODITIES.find(item => item.id === commodityId);
  if (!commodity || quantity <= 0) return { success: false, message: 'INVALID TRADE ORDER.' };
  const price = getMarketPrice(projectId, commodityId, action);
  const total = price * quantity;

  if (action === 'buy') {
    if (traderState.credits < total) return { success: false, message: 'INSUFFICIENT CREDITS FOR PURCHASE.' };
    if (getCargoUsed() + quantity > traderState.maxCargo) return { success: false, message: 'CARGO HOLD CAPACITY EXCEEDED.' };
    traderState.credits -= total;
    traderState.cargo[commodityId] = (traderState.cargo[commodityId] || 0) + quantity;
    recordTrade(action, projectId, commodity, quantity, price);
    onTradeRef({ ...traderState.lastTrade, total });
    ttsEngine.speak('CARGO LOADED. CREDITS DEDUCTED.', getVoicePersonaRef('USSYVERSE CONTROL'));
    return { success: true, message: `CARGO LOADED: ${quantity} ${commodity.name}. ${total} CREDITS DEDUCTED.` };
  }

  if (action === 'sell') {
    if ((traderState.cargo[commodityId] || 0) < quantity) return { success: false, message: 'REQUESTED CARGO IS NOT IN HOLD.' };
    traderState.credits += total;
    traderState.cargo[commodityId] -= quantity;
    if (traderState.cargo[commodityId] <= 0) delete traderState.cargo[commodityId];
    recordTrade(action, projectId, commodity, quantity, price);
    onTradeRef({ ...traderState.lastTrade, total });
    ttsEngine.speak('CARGO SOLD. CREDITS RECEIVED.', getVoicePersonaRef('USSYVERSE CONTROL'));
    return { success: true, message: `CARGO SOLD: ${quantity} ${commodity.name}. ${total} CREDITS RECEIVED.` };
  }

  return { success: false, message: 'UNKNOWN TRADE ACTION.' };
}

function recordTrade(action, stationId, commodity, qty, price) {
  getCargoUsed();
  traderState.lastTrade = { stationId, commodity: commodity.id, action, qty, price };
  traderState.tradeLog.unshift(traderState.lastTrade);
  traderState.tradeLog = traderState.tradeLog.slice(0, 10);
}

function refuelDialog(projectId) {
  const missing = Math.max(0, traderState.maxFuel - traderState.fuel);
  const cost = Math.round(missing * traderState.fuelCostPerUnit);
  showGameMessageRef({
    type: 'REFUEL SERVICE',
    source: stationSource(projectId),
    text: `REFUEL COST: ${cost}cr FOR ${Math.ceil(missing)} UNITS. CREDITS: ${traderState.credits}.`,
    choices: [
      { key: '1', code: 'Digit1', label: 'CONFIRM REFUEL', action: () => confirmRefuel(projectId) },
      { key: '2', code: 'Digit2', label: 'BACK', action: () => openTradeMenu(projectId) }
    ]
  });
}

function confirmRefuel(projectId) {
  const result = refuelAt(projectId);
  updateFlightHudRef(true);
  refreshInventoryIfOpen();
  showGameMessageRef({
    type: result.success ? 'REFUEL COMPLETE' : 'REFUEL DENIED',
    source: stationSource(projectId),
    text: result.message,
    choices: [{ key: '1', code: 'Digit1', label: 'STATION MENU', action: () => openTradeMenu(projectId) }]
  });
}

export function refuelAt(projectId, options = {}) {
  const profile = getStationProfile(projectId);
  const missing = Math.max(0, traderState.maxFuel - traderState.fuel);
  const available = profile.fuelAvailable ? Math.min(missing, profile.fuelStock) : 0;
  const cost = options.free ? 0 : Math.round(available * traderState.fuelCostPerUnit);
  if (available <= 0) return { success: true, message: 'FUEL TANKS ALREADY FULL OR STATION STOCK EMPTY.' };
  if (!options.free && traderState.credits < cost) return { success: false, message: 'INSUFFICIENT CREDITS FOR REFUELING.' };
  traderState.credits -= cost;
  traderState.fuel = Math.min(traderState.maxFuel, traderState.fuel + available);
  profile.fuelStock = Math.max(0, profile.fuelStock - available);
  if (!options.silent) ttsEngine.speak('FUELING COMPLETE.', getVoicePersonaRef('USSYVERSE CONTROL'));
  return { success: true, message: `FUELING COMPLETE. ${Math.round(available)} UNITS LOADED. COST ${cost}cr.` };
}

function showCargoHold(projectId) {
  const rows = Object.entries(traderState.cargo)
    .filter(([, qty]) => qty > 0)
    .map(([commodityId, qty]) => `${getCommodityName(commodityId)}:${qty}`);
  const summary = rows.length ? rows.join(' // ') : 'CARGO HOLD EMPTY';
  showGameMessageRef({
    type: 'CARGO HOLD',
    source: stationSource(projectId),
    text: `${summary}. USED ${getCargoUsed()}/${traderState.maxCargo}. RECENT: ${getTradeLogSummary() || 'NO TRADES LOGGED'}.`,
    choices: [{ key: '1', code: 'Digit1', label: 'STATION MENU', action: () => openTradeMenu(projectId) }]
  });
}

export function updateFuelDrain(dt, isThrusting) {
  if (!isThrusting || traderState.fuel <= 0) return traderState.fuel <= 0;
  traderState.fuel = Math.max(0, traderState.fuel - traderState.fuelPerSecond * dt);
  return traderState.fuel <= 0;
}

export function getTradeLogSummary() {
  return traderState.tradeLog
    .slice(0, 10)
    .map(entry => `${entry.action.toUpperCase()} ${entry.qty} ${getCommodityName(entry.commodity)} @ ${entry.price}cr`)
    .join(' | ');
}

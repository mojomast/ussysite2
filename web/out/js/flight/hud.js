import { isCoarsePointer, maxPlayerAmmo, maxPlayerMissilesStored } from '../constants.js';
import { traderState } from '../economy/trader.js';
import { WEAPON_DEFS, getWeaponDef } from './combat-overhaul.js';
import { combatState } from './combat-state.js';
import { ensureAutopilotState, isAutopilotActive } from './autopilot.js';
import { SURFACE_STATES, getSurfaceServices } from './surface.js';
import { worldToThree } from './world.js';

let deps = {};
let radarLastUpdate = 0;
let killFeedLastUpdate = 0;
let leadPipToEnemyVec = null;
let leadPipPredictedVec = null;
let leadPipProjectedVec = null;

const KILL_FEED_MAX_ENTRIES = 4;
const KILL_FEED_MAX_AGE_MS = 4000;
const KILL_FEED_RENDER_INTERVAL_MS = 80;
let bossHudLastUpdate = 0;
let navHudLastUpdate = 0;
const killFeedEntries = [];
const RADAR_TRAJECTORY_SECONDS = 1.2;
const RADAR_TRAJECTORY_MAX_PX = 14;

const HUD_PRIMARY_HINTS = [
  ['H', 'HELP'],
  ['J', 'GATE'],
  ['TAB', 'SETTINGS'],
  ['Y', 'AUTOPILOT'],
  ['M', 'MAP'],
  ['ESC', 'EXIT'],
  ['G', 'BRAKE']
];

const HUD_SECONDARY_HINTS = [
  ['V', 'NAV TARGET'],
  ['H', 'HYPERSPACE'],
  ['L', 'LAND'],
  ['O', 'OBJECTIVES'],
  ['I', 'INVENTORY'],
  ['B', 'MISSIONS']
];

const HUD_TOUCH_HINTS = [
  ['❓', 'HELP'],
  ['⚙️', 'SETTINGS'],
  ['🗺️', 'MAP'],
  ['🚪', 'EXIT']
];

function createReusableVector3(source) {
  const VectorCtor = typeof source?.constructor === 'function' ? source.constructor : globalThis.THREE?.Vector3;
  if (!VectorCtor) return null;
  try {
    return new VectorCtor();
  } catch {
    return null;
  }
}

function copyVector3(target, source) {
  if (typeof target?.copy === 'function') {
    target.copy(source);
    return target;
  }
  if (typeof target?.set === 'function') {
    target.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
    return target;
  }
  target.x = source.x ?? 0;
  target.y = source.y ?? 0;
  target.z = source.z ?? 0;
  return target;
}

function ensureLeadPipVectors(source) {
  leadPipToEnemyVec ||= createReusableVector3(source);
  leadPipPredictedVec ||= createReusableVector3(source);
  leadPipProjectedVec ||= createReusableVector3(source);
  return leadPipToEnemyVec && leadPipPredictedVec && leadPipProjectedVec;
}

function createHint(documentRef, key, action, secondary = false) {
  const hint = documentRef.createElement('span');
  hint.className = secondary ? 'hud-control-hint hud-control-hint-secondary' : 'hud-control-hint';
  const keyEl = documentRef.createElement('kbd');
  keyEl.className = 'hud-key';
  keyEl.textContent = key;
  const actionEl = documentRef.createElement('span');
  actionEl.className = 'hud-key-action';
  actionEl.textContent = action;
  hint.append(keyEl, actionEl);
  return hint;
}

export function renderHudControlsBar(documentRef = deps.documentRef || document) {
  const bar = documentRef?.getElementById?.('hud-controls-bar') || documentRef?.querySelector?.('.dash-center-help');
  if (!bar) return false;
  bar.replaceChildren();
  bar.classList.add('hud-controls-bar');

  if (isCoarsePointer) {
    HUD_TOUCH_HINTS.forEach(([icon, label]) => {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = 'hud-touch-control';
      button.dataset.hudAction = label.toLowerCase();
      button.setAttribute('aria-label', label);
      button.textContent = `${icon} ${label}`;
      bar.appendChild(button);
    });
    return true;
  }

  HUD_PRIMARY_HINTS.forEach(([key, action]) => bar.appendChild(createHint(documentRef, key, action)));
  HUD_SECONDARY_HINTS.forEach(([key, action]) => bar.appendChild(createHint(documentRef, key, action, true)));
  return true;
}

export function configureHud(options = {}) {
  deps = { ...deps, ...options };
  renderHudControlsBar(deps.documentRef || document);
}

function resolveLiveValue(value) {
  return typeof value === 'function' ? value() : value;
}

export function addKillFeedEntry(text, colorOrOptions = 'var(--cyber-cyan)') {
  if (!text) return combatState.killFeed;
  const options = typeof colorOrOptions === 'object' && colorOrOptions !== null ? colorOrOptions : {};
  const now = options.now ?? performance.now();
  const color = typeof colorOrOptions === 'string'
    ? colorOrOptions
    : (options.color || (options.type === 'warning' ? 'var(--cyber-yellow)' : (options.type === 'success' ? 'var(--cyber-green)' : 'var(--cyber-cyan)')));
  const latest = combatState.killFeed[combatState.killFeed.length - 1];
  if (latest?.text === text && now - latest.ts < 650) return combatState.killFeed;
  combatState.killFeed.push({ text, color, ts: now });
  if (combatState.killFeed.length > KILL_FEED_MAX_ENTRIES) {
    combatState.killFeed.splice(0, combatState.killFeed.length - KILL_FEED_MAX_ENTRIES);
  }
  combatState.killFeedDirty = true;
  const { flightState } = deps;
  if (flightState) {
    flightState.status = text;
    flightState.statusUntil = now + (options.type === 'warning' ? 3000 : 1800);
  }
  return combatState.killFeed;
}

export function updateKillFeed(time = performance.now(), documentRef = deps.documentRef || document, force = false) {
  if (!force && time - killFeedLastUpdate < KILL_FEED_RENDER_INTERVAL_MS) return false;
  killFeedLastUpdate = time;

  const beforeLength = combatState.killFeed.length;
  combatState.killFeed = combatState.killFeed.filter(entry => time - entry.ts <= KILL_FEED_MAX_AGE_MS);
  const pruned = combatState.killFeed.length !== beforeLength;
  if (!combatState.killFeedDirty && !pruned) return false;

  const feedEl = documentRef?.getElementById?.('kill-feed');
  if (!feedEl) return false;
  const rows = [...combatState.killFeed].reverse().map((entry, index) => {
    const row = documentRef.createElement('div');
    row.className = 'kill-feed-entry';
    row.textContent = entry.text;
    row.style.setProperty('--kill-feed-entry-color', entry.color);
    row.style.opacity = index === KILL_FEED_MAX_ENTRIES - 1 ? '0.4' : '1';
    return row;
  });
  feedEl.replaceChildren(...rows);
  combatState.killFeedDirty = false;
  return true;
}

export function mapRadarPoint(targetPos, radius) {
  const { activeUniverseScale, flightForward, flightRight, flightState, flightUp, radarRange, radarTempVec } = deps;
  if (!targetPos || !radarTempVec || !flightState?.pos) return { x: 0, y: 0, distance: 0, above: false, below: false, edge: false };
  radarTempVec.copy(targetPos).sub(flightState.pos);
  const right = radarTempVec.dot(flightRight);
  const forward = radarTempVec.dot(flightForward);
  const up = radarTempVec.dot(flightUp);
  const distance = Math.max(0.001, Math.sqrt(right * right + forward * forward + up * up));
  const activeRadarRange = radarRange * activeUniverseScale();
  const scale = Math.min(distance, activeRadarRange) / activeRadarRange;
  const angle = Math.atan2(right, forward);
  return {
    x: Math.sin(angle) * scale * radius,
    y: -Math.cos(angle) * scale * radius,
    distance,
    above: up > 8,
    below: up < -8,
    edge: distance > activeRadarRange
  };
}

export function worldToRadar(pos, center, scale) {
  return {
    x: ((pos?.x ?? 0) - (center?.x ?? 0)) * scale,
    y: -(((pos?.z ?? pos?.y ?? 0) - (center?.z ?? center?.y ?? 0)) * scale)
  };
}

export function capRadarTrajectory(dx, dy, maxLength = RADAR_TRAJECTORY_MAX_PX) {
  const length = Math.hypot(dx, dy);
  if (length <= maxLength || length <= 0) return { x: dx, y: dy, length };
  const scale = maxLength / length;
  return { x: dx * scale, y: dy * scale, length: maxLength };
}

export function getRadarTrajectoryDelta(velocity, flightRight, flightForward, radarScale) {
  if (!velocity?.dot || !flightRight || !flightForward) return { x: 0, y: 0, length: 0 };
  const localVelocity = {
    x: velocity.dot(flightRight) * RADAR_TRAJECTORY_SECONDS,
    z: velocity.dot(flightForward) * RADAR_TRAJECTORY_SECONDS
  };
  const radarVelocity = worldToRadar(localVelocity, { x: 0, z: 0 }, radarScale);
  return capRadarTrajectory(radarVelocity.x, radarVelocity.y);
}

export function shouldDrawEnemyRadarContact(enemy, now = performance.now()) {
  return Boolean(enemy?.userData?.active && enemy.visible && !(enemy.userData.stunUntil > now));
}

export function drawRadarContact(ctx, cx, cy, radius, targetPos, type, highlighted = false) {
  const point = mapRadarPoint(targetPos, radius);
  const x = cx + point.x;
  const y = cy + point.y;
  const alpha = point.edge ? 0.48 : 0.92;
  const color = type === 'enemy' ? `rgba(255, 51, 85, ${alpha})` : (highlighted ? `rgba(255, 204, 0, ${alpha})` : `rgba(0, 240, 255, ${alpha * 0.72})`);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = highlighted ? 2 : 1;
  if (type === 'enemy') {
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(-4, -4, 8, 8);
    if (highlighted) {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (point.above || point.below) {
    ctx.font = '10px monospace';
    ctx.fillText(point.above ? '+' : '-', 8, -7);
  }
  ctx.restore();
}

function drawEnemyRadarTrajectory(ctx, cx, cy, enemy, point, radarScale) {
  const velocity = enemy.userData.velocity;
  if (!velocity) return;
  const { flightForward, flightRight } = deps;
  const delta = getRadarTrajectoryDelta(velocity, flightRight, flightForward, radarScale);
  if (delta.length <= 0) return;
  const x = cx + point.x;
  const y = cy + point.y;
  const isDreadnought = enemy.userData.classId === 'dreadnought';
  ctx.save();
  ctx.globalAlpha = isDreadnought ? 0.65 : 0.45;
  ctx.strokeStyle = 'rgb(255, 51, 85)';
  ctx.lineWidth = isDreadnought ? 2 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + delta.x, y + delta.y);
  ctx.stroke();
  ctx.restore();
}

export function updateCockpitRadar(time = performance.now(), force = false) {
  const { cockpitRadar, enemies = [], flightState, isCoarsePointer, isFlightActive, missionState, projectNodes = [], radarCtx, radarRange, activeUniverseScale } = deps;
  if (!radarCtx || !cockpitRadar || !isFlightActive?.()) return;
  const interval = isCoarsePointer ? 160 : 150;
  if (!force && time - radarLastUpdate < interval) return;
  radarLastUpdate = time;

  const ctx = radarCtx;
  const width = cockpitRadar.width;
  const height = cockpitRadar.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;
  const activeRadarRange = radarRange * activeUniverseScale();
  const radarScale = radius / activeRadarRange;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = 'rgba(3, 6, 15, 0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.stroke();

  projectNodes.forEach(node => {
    if (!node.visible) return;
    const highlighted = node === flightState.nearestNode || node === flightState.navNode || node.userData.project.id === missionState.landingProjectId;
    drawRadarContact(ctx, cx, cy, radius, node.position, 'project', highlighted);
  });
  enemies.forEach(enemy => {
    if (!shouldDrawEnemyRadarContact(enemy)) return;
    const point = mapRadarPoint(enemy.position, radius);
    drawEnemyRadarTrajectory(ctx, cx, cy, enemy, point, radarScale);
    drawRadarContact(ctx, cx, cy, radius, enemy.position, 'enemy');
  });

  ctx.fillStyle = 'rgba(255, 204, 0, 0.95)';
  ctx.strokeStyle = 'rgba(255, 204, 0, 0.95)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 7, cy + 8);
  ctx.lineTo(cx, cy + 4);
  ctx.lineTo(cx - 7, cy + 8);
  ctx.closePath();
  ctx.fill();

  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(125, 252, 255, 0.78)';
  ctx.fillText(`RANGE ${activeRadarRange}`, 10, height - 12);
  ctx.restore();
}

export function updateBossHealthBar(state = combatState, time = performance.now(), force = false, documentRef = deps.documentRef || document) {
  if (!force && time - bossHudLastUpdate < 120) return false;
  bossHudLastUpdate = time;
  const panel = documentRef.getElementById('boss-health-hud');
  if (!panel) return false;
  const boss = state.bossEnemyRef;
  const active = Boolean(state.bossActive && boss?.userData?.active && boss.userData.isBoss);
  panel.classList.toggle('active', active);
  panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  if (!active) return true;
  const shield = Math.max(0, boss.userData.shieldHp || 0);
  const maxShield = Math.max(1, boss.userData.maxShieldHp || 1);
  const health = Math.max(0, boss.userData.health || 0);
  const maxHealth = Math.max(1, boss.userData.maxHealth || 1);
  const phase = boss.userData.bossPhase || 1;
  const text = (id, value) => { const node = documentRef.getElementById(id); if (node) node.textContent = value; };
  const width = (id, value) => { const node = documentRef.getElementById(id); if (node) node.style.width = value; };
  text('boss-health-label', `HERMES-DREADNOUGHT // PHASE ${phase}`);
  text('boss-health-value', `${health}/${maxHealth} HULL // ${shield}/${maxShield} SHD`);
  width('boss-health-bar', `${Math.min(100, (health / maxHealth) * 100).toFixed(1)}%`);
  width('boss-shield-bar', `${Math.min(100, (shield / maxShield) * 100).toFixed(1)}%`);
  return true;
}

export function updateNavHUD(flightState, combatStateArg, force = false, documentRef = deps.documentRef || document) {
  const now = performance.now();
  if (!force && now - navHudLastUpdate < 120) return false;
  navHudLastUpdate = now;
  if (!flightState) return false;
  const autopilot = ensureAutopilotState(flightState);
  const el = id => documentRef?.getElementById?.(id);
  const text = (id, value) => { const node = el(id); if (node && node.textContent !== value) node.textContent = value; };
  const active = isAutopilotActive(flightState);
  const targetName = autopilot.targetId || (flightState.navNode ? (deps.getProjectNodeName?.(flightState.navNode) || 'TARGET') : '-- NO TARGET --');
  const distance = Number.isFinite(flightState.navDistance) ? `${Math.round(flightState.navDistance)}u` : '--';
  const hops = Array.isArray(autopilot.route) && autopilot.route.length ? `${Math.max(0, autopilot.route.length - 1)} HOPS` : '--';
  const status = autopilot.blockedReason || (active ? `AUTOPILOT ${autopilot.state}` : 'AUTOPILOT OFFLINE');
  text('nav-target-name', targetName);
  text('nav-distance', distance);
  text('nav-eta', `ETA ${flightState.navEta || '--'}`);
  text('nav-route-hops', hops);
  text('nav-autopilot-status', status);
  text('nav-panel-state', autopilot.state);
  text('nav-panel-target', targetName);
  text('nav-panel-route', Array.isArray(autopilot.route) && autopilot.route.length ? autopilot.route.join(' > ') : '--');
  text('nav-panel-speed', `${(autopilot.hyperspeedMult ?? 1).toFixed(1)}x`);
  text('nav-panel-blocked', autopilot.blockedReason || (combatStateArg?.bossActive ? 'BOSS ACTIVE' : '--'));
  const panel = el('nav-panel');
  if (panel) panel.classList.toggle('autopilot-active', active);
  el('nav-engage-btn')?.classList.toggle('hidden', active);
  el('nav-abort-btn')?.classList.toggle('hidden', !active);
  return true;
}

export function updateBountyHUD(state = traderState, documentRef = deps.documentRef || document) {
  const panel = documentRef?.getElementById?.('bounty-indicator');
  const valueEl = documentRef?.getElementById?.('bounty-amount');
  if (!panel) return false;
  const bounty = Math.max(0, Math.round(state?.bountyLevel || state?.bounty || 0));
  const active = bounty > 0;
  panel.classList.toggle('active', active);
  panel.classList.toggle('bounty-critical', bounty > 1500);
  panel.setAttribute?.('aria-hidden', active ? 'false' : 'true');
  panel.hidden = !active;
  if (valueEl) valueEl.textContent = `${bounty}CR`;
  return true;
}

function asWorldVector(source) {
  if (!source) return null;
  if (source.isVector3 || typeof source.distanceTo === 'function') return source;
  const THREE = globalThis.THREE?.Vector3 ? globalThis.THREE : {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      distanceTo(other) {
        return Math.hypot(this.x - (other?.x ?? 0), this.y - (other?.y ?? 0), this.z - (other?.z ?? 0));
      }
    }
  };
  return worldToThree(source, THREE);
}

function getPlanetId(planet) {
  return planet?.userData?.planetId ?? planet?.id ?? null;
}

function getPlanetRadius(planet) {
  return planet?.radius ?? planet?.userData?.radius ?? 0;
}

function findSurfacePlanet(surface, planets = []) {
  if (!surface?.planetId) return null;
  return planets.find(planet => getPlanetId(planet) === surface.planetId) ?? null;
}

function formatSurfaceAltitude(flightState, planet) {
  if (!flightState?.pos || !planet) return '--';
  const playerPos = asWorldVector(flightState.pos);
  const planetPos = asWorldVector(planet.pos ?? planet.position);
  if (!playerPos || !planetPos) return '--';
  return `${Math.max(0, Math.round(playerPos.distanceTo(planetPos) - getPlanetRadius(planet)))}u`;
}

function setPanelActive(panel, active) {
  if (!panel) return;
  panel.classList.toggle('active', active);
  panel.setAttribute('aria-hidden', active ? 'false' : 'true');
}

export function updateSurfaceHUD(flightState, planets = [], documentRef = deps.documentRef || document) {
  const surface = flightState?.surface;
  const state = surface?.state ?? SURFACE_STATES.NONE;
  const planet = findSurfacePlanet(surface, planets) ?? (surface?.planetId ? { id: surface.planetId, name: surface.planetId, radius: 0 } : null);
  const name = String(planet?.userData?.name ?? planet?.name ?? planet?.id ?? surface?.planetId ?? '--');
  const altitude = formatSurfaceAltitude(flightState, planet);
  const services = getSurfaceServices(planet);
  const serviceText = services.length ? services.filter(service => service.available !== false).map(service => service.label).join(' // ') : 'NO SERVICES';
  const el = id => documentRef?.getElementById?.(id);
  const text = (id, value) => {
    const node = el(id);
    if (node && node.textContent !== value) node.textContent = value;
  };

  setPanelActive(el('approach-hint'), state === SURFACE_STATES.APPROACH);
  setPanelActive(el('orbital-panel'), state === SURFACE_STATES.ORBITAL || state === SURFACE_STATES.LANDING);
  setPanelActive(el('surface-panel'), state === SURFACE_STATES.SURFACE || state === SURFACE_STATES.DEPARTURE);

  text('approach-planet', name.toUpperCase());
  text('approach-altitude', altitude);
  text('orbital-planet', name.toUpperCase());
  text('orbital-altitude', altitude);
  text('orbital-services', serviceText);
  text('surface-planet', name.toUpperCase());
  text('surface-services', serviceText);
  return { state, planet, services };
}

export function updateFlightHud(force = false) {
  const {
    camera,
    documentRef = document,
    enemies = [],
    findNearestEnemy,
    flightState,
    getProjectNodeName,
    isFlightActive,
    playerShip: playerShipRef,
    skillTree,
    syncCombatCreditsFromTrader,
    ttsEngine
  } = deps;
  if (!flightState || !skillTree) return traderState.fuel;
  const playerShip = resolveLiveValue(playerShipRef);
  const now = performance.now();
  updateKillFeed(now, documentRef);
  updateBountyHUD(traderState, documentRef);
  if (!force && now - flightState.lastHudUpdate < 120) return traderState.fuel;
  flightState.lastHudUpdate = now;
  syncCombatCreditsFromTrader?.();
  const speed = flightState.vel.length();
  const maxShield = skillTree.getMaxShield();
  const maxEnergy = skillTree.getMaxEnergy();
  updateTtsStatusIndicator();
  updateBossHealthBar(combatState, now, force, documentRef);

  const el = id => documentRef.getElementById(id);
  const flightStatus = el('flight-status');
  if (flightStatus) flightStatus.textContent = isFlightActive?.() ? (flightState.paused ? 'PAUSED' : flightState.status) : 'TYPE USSY TO LAUNCH';
  const text = (id, value) => { const node = el(id); if (node) node.textContent = value; };
  const width = (id, value) => { const node = el(id); if (node) node.style.width = value; return node; };
  text('flight-score', String(flightState.score));
  const killStreakEl = el('hud-kill-streak');
  if (killStreakEl) {
    const active = combatState.killStreakMultiplier > 1;
    killStreakEl.textContent = active
      ? `${combatState.killStreakCount}x KILL STREAK - ${combatState.killStreakMultiplier}x CR/XP`
      : '';
    killStreakEl.classList.toggle('active', active);
    killStreakEl.classList.toggle('flash-off', active && Math.floor(now / 600) % 2 === 0);
  }
  text('flight-shield', String(Math.round(flightState.shield)));
  text('flight-target', flightState.nearestNode ? `${flightState.nearestNode.userData.project.name} ${flightState.nearestDistance.toFixed(1)}u` : 'NONE');
  text('flight-crosshair-target', flightState.crosshairNode ? `${getProjectNodeName(flightState.crosshairNode)} // PRESS V` : 'NO PROJECT');
  text('flight-nav-target', flightState.navNode ? `${getProjectNodeName(flightState.navNode)} ${Math.round(flightState.navDistance)}u` : 'NONE');
  text('flight-nav-eta', flightState.navEta);
  const autopilotActive = isAutopilotActive(flightState);
  const autopilot = ensureAutopilotState(flightState);
  const waypointLabel = autopilot.route?.length > 1 ? ` WP ${Math.min(autopilot.routeIndex ?? 1, autopilot.route.length - 1)} / ${autopilot.route.length - 1}` : '';
  text('flight-autopilot', autopilotActive ? `Y: ON ${autopilot.routeType || 'LOCAL'}${waypointLabel}` : 'Y: OFF');
  updateNavHUD(flightState, combatState, force, documentRef);
  text('flight-speed', `${speed.toFixed(1)}u/s`);
  width('flight-speed-bar', `${Math.min(100, (speed / 38) * 100).toFixed(1)}%`);
  const matchSpeedEl = el('hud-match-speed-active');
  if (matchSpeedEl) {
    const active = Boolean(flightState.matchSpeedActive);
    matchSpeedEl.textContent = active ? 'SPEED MATCH ACTIVE' : '';
    matchSpeedEl.classList.toggle('active', active);
  }
  text('flight-shields-detail', `${Math.round(flightState.shield)}/${maxShield}`);
  width('flight-shield-bar', `${Math.min(100, Math.max(0, (flightState.shield / maxShield) * 100)).toFixed(1)}%`);
  text('flight-energy', `${Math.round(flightState.energy)}/${maxEnergy}`);
  width('flight-energy-bar', `${Math.min(100, Math.max(0, (flightState.energy / maxEnergy) * 100)).toFixed(1)}%`);

  const fuelPercent = Math.max(0, Math.min(100, traderState.fuel));
  const fuelColor = fuelPercent < 25 ? 'rgba(255, 68, 85, 0.88)' : (fuelPercent <= 50 ? 'rgba(255, 204, 0, 0.9)' : 'rgba(0, 255, 102, 0.84)');
  flightState.fuel = fuelPercent;
  text('flight-fuel', `${Math.round(fuelPercent)}%`);
  const fuelBar = width('flight-fuel-bar', `${fuelPercent.toFixed(1)}%`);
  if (fuelBar) fuelBar.style.background = fuelColor;
  text('flight-armor', `${Math.round(flightState.armor)}%`);
  width('flight-armor-bar', `${Math.max(0, flightState.armor).toFixed(1)}%`);
  text('flight-ammo', String(flightState.ammo));
  width('flight-ammo-bar', `${((flightState.ammo / maxPlayerAmmo) * 100).toFixed(1)}%`);
  text('flight-missiles', String(flightState.missiles));
  width('flight-missile-bar', `${((flightState.missiles / maxPlayerMissilesStored) * 100).toFixed(1)}%`);
  text('flight-heat', `${Math.round(combatState.heat)}/${combatState.maxHeat}`);
  text('flight-heat-cockpit', `${Math.round(combatState.heat)}`);
  ['flight-heat-bar', 'flight-heat-bar-cockpit'].forEach(id => {
    const bar = el(id);
    if (!bar) return;
    const heatPercent = Math.min(100, (combatState.heat / combatState.maxHeat) * 100);
    bar.style.width = `${heatPercent.toFixed(1)}%`;
    bar.classList.toggle('heat-warm', heatPercent >= 50 && heatPercent < 75 && !combatState.overheated);
    bar.classList.toggle('heat-hot', heatPercent >= 75 && !combatState.overheated);
    bar.classList.toggle('heat-over', combatState.overheated);
  });
  if (combatState.overheated && flightStatus) flightStatus.textContent = 'WEAPONS OFFLINE - COOLING';
  text('flight-credits', `${traderState.credits}CR`);
  width('flight-xp-bar', `${Math.min(100, (combatState.xp / combatState.xpToNextPoint) * 100).toFixed(1)}%`);
  text('flight-xp-label', `XP ${combatState.xp}/${combatState.xpToNextPoint}`);
  text('flight-sp', `SP:${combatState.skillPoints}`);
  text('flight-weapon-primary', WEAPON_DEFS.find(weapon => weapon.id === combatState.primaryWeapon)?.name || '--');
  text('flight-weapon-secondary', WEAPON_DEFS.find(weapon => weapon.id === combatState.secondaryWeapon)?.name || '--');

  const reticleShieldArch = el('reticle-shield-arch');
  if (reticleShieldArch) reticleShieldArch.style.strokeDashoffset = String(Math.max(0, 220 - (220 * (flightState.shield / maxShield))));
  const reticleHeatArch = el('reticle-heat-arch');
  if (reticleHeatArch) reticleHeatArch.style.strokeDashoffset = String(Math.max(0, 220 - (220 * (combatState.heat / combatState.maxHeat))));

  const reticleThrottleArch = el('reticle-throttle-arch');
  const reticleThrottleLabel = el('reticle-throttle-label');
  if (reticleThrottleArch) {
    const throttleVisible = flightState.throttleEnabled ? '1' : '0';
    reticleThrottleArch.setAttribute('opacity', throttleVisible);
    if (reticleThrottleLabel) reticleThrottleLabel.setAttribute('opacity', throttleVisible);
    const offset = Math.max(0, 150 - (150 * (flightState.throttleLevel ?? 0)));
    reticleThrottleArch.style.strokeDashoffset = String(offset);
    if (reticleThrottleLabel) reticleThrottleLabel.textContent = `THR ${Math.round((flightState.throttleLevel ?? 0) * 100)}%`;
  }

  const leadPip = el('reticle-lead-pip');
  if (leadPip) {
    const nearestEnemy = typeof findNearestEnemy === 'function' ? findNearestEnemy() : null;
    if (nearestEnemy?.userData?.active && nearestEnemy.userData.velocity && camera) {
      const primaryDef = getWeaponDef(combatState.primaryWeapon);
      const bulletSpeed = primaryDef?.projectileSpeed > 0 ? primaryDef.projectileSpeed : 130;
      if (!ensureLeadPipVectors(nearestEnemy.position)) {
        leadPip.style.opacity = '0';
      } else {
        const toEnemy = copyVector3(leadPipToEnemyVec, nearestEnemy.position).sub(flightState.pos);
        const dist = toEnemy.length();
        const tof = dist / bulletSpeed;
        const predicted = copyVector3(leadPipPredictedVec, nearestEnemy.position);
        predicted.addScaledVector(nearestEnemy.userData.velocity, tof);
        const projected = copyVector3(leadPipProjectedVec, predicted).project(camera);
        const containerEl = leadPip.parentElement;
        if (containerEl) {
          const view = documentRef.defaultView || globalThis;
          const rect = containerEl.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const vpW = view.innerWidth || rect.width;
          const vpH = view.innerHeight || rect.height;
          const screenX = (projected.x * 0.5 + 0.5) * vpW;
          const screenY = (1 - (projected.y * 0.5 + 0.5)) * vpH;
          const containerCenterX = rect.left + cx;
          const containerCenterY = rect.top + cy;
          const offsetX = screenX - containerCenterX + cx;
          const offsetY = screenY - containerCenterY + cy;
          const clampedX = Math.max(8, Math.min(rect.width - 8, offsetX));
          const clampedY = Math.max(8, Math.min(rect.height - 8, offsetY));
          leadPip.style.left = `${clampedX}px`;
          leadPip.style.top = `${clampedY}px`;
          leadPip.style.opacity = dist < 60 ? '1' : '0';
        }
      }
    } else {
      leadPip.style.opacity = '0';
    }
  }

  const flightThreatEl = el('flight-threat-c');
  if (flightThreatEl) {
    const nearestEnemy = typeof findNearestEnemy === 'function' ? findNearestEnemy() : null;
    if (nearestEnemy?.userData?.active) {
      const playerPos = playerShip?.position ?? flightState.pos;
      const threatDistance = playerPos?.distanceTo ? Math.round(playerPos.distanceTo(nearestEnemy.position)) : 0;
      flightThreatEl.textContent = `${(nearestEnemy.userData.classId || 'scout').toUpperCase()} [${threatDistance}u]`;
      flightThreatEl.style.color = '#ff3355';
    } else {
      flightThreatEl.textContent = 'NO THREAT';
      flightThreatEl.style.color = 'var(--cyber-yellow)';
    }
  }

  const bogeyContainer = el('bogey-indicators');
  if (bogeyContainer) {
    const containerEl = bogeyContainer.parentElement;
    const activeEnemies = enemies
      .filter(enemy => enemy.userData.active && enemy.visible)
      .slice(0, 4);

    while (bogeyContainer.children.length < activeEnemies.length) {
      const arrow = documentRef.createElement('div');
      arrow.className = 'bogey-indicator';
      bogeyContainer.appendChild(arrow);
    }
    while (bogeyContainer.children.length > activeEnemies.length) {
      bogeyContainer.removeChild(bogeyContainer.lastChild);
    }

    const containerRect = containerEl?.getBoundingClientRect();
    const halfW = (containerRect?.width ?? 200) / 2;
    const halfH = (containerRect?.height ?? 200) / 2;
    const edgePad = 18;

    activeEnemies.forEach((enemy, i) => {
      const arrow = bogeyContainer.children[i];
      if (!arrow) return;
      const point = mapRadarPoint(enemy.position, 1);
      const angle = Math.atan2(point.x, -point.y) * (180 / Math.PI);
      const rad = Math.atan2(point.x, -point.y);
      const edgeX = halfW + Math.sin(rad) * (halfW - edgePad);
      const edgeY = halfH + (-Math.cos(rad)) * (halfH - edgePad);
      arrow.style.left = `${edgeX}px`;
      arrow.style.top = `${edgeY}px`;
      arrow.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      arrow.style.opacity = Math.abs(rad) < 0.35 ? '0' : '0.85';
    });
  }

  text('flight-nav-telemetry-c', `${autopilotActive ? `AP: ${autopilot.routeModeLabel || 'ON'}` : 'AP: OFF'}${waypointLabel} // ETA:${flightState.navEta}`);
  const cockpitOverlayEl = el('cockpit-overlay');
  if (cockpitOverlayEl) {
    const inCombat = enemies.some(e => e.userData.active) || combatState.adrenaline > 0;
    cockpitOverlayEl.classList.toggle('combat-active', inCombat);
    cockpitOverlayEl.classList.toggle('hud-docked', Boolean(flightState.landed));
  }

  const masterWarningEl = el('hud-master-warning');
  if (masterWarningEl) {
    let warningText = '';
    if (combatState.overheated) warningText = 'WARNING: WEAPONS OVERHEATED';
    else if (flightState.shield <= 0) warningText = 'WARNING: SHIELDS DEPLETED';
    else if (flightState.armor <= 25) warningText = 'WARNING: HULL INTEGRITY CRITICAL';
    if (warningText) {
      masterWarningEl.textContent = warningText;
      masterWarningEl.classList.add('active');
    } else {
      masterWarningEl.classList.remove('active');
    }
  }
  return traderState.fuel;
}

export function updateTtsStatusIndicator() {
  const { documentRef = document, ttsStatus, ttsEngine } = deps;
  const ttsStatusEl = ttsStatus || documentRef.getElementById('tts-status');
  if (ttsStatusEl) ttsStatusEl.textContent = ttsEngine?.enabled ? 'TTS●' : 'TTS○';
  if (ttsStatusEl) ttsStatusEl.classList.toggle('muted', !ttsEngine?.enabled);
}

export function updateFlightCamera() {
  const { camTarget, flightForward, flightQuat, flightState, flightUp, playerShip: playerShipRef, updateFlightBasis } = deps;
  const playerShip = resolveLiveValue(playerShipRef);
  updateFlightBasis?.();
  if (playerShip) {
    playerShip.position.copy(flightState.pos);
    playerShip.quaternion.copy(flightQuat);
    playerShip.visible = flightState.view === 'third';
  }
  if (flightState.view === 'third') {
    camTarget.pos.copy(flightState.pos).addScaledVector(flightForward, -7).addScaledVector(flightUp, 2.2);
    camTarget.lookAt.copy(flightState.pos).addScaledVector(flightForward, 8);
  } else {
    camTarget.pos.copy(flightState.pos).addScaledVector(flightUp, 0.08);
    camTarget.lookAt.copy(flightState.pos).addScaledVector(flightForward, 18);
  }
}

export function updateFlightNavMarker() {
  deps.updateFlightNavMarker?.();
}

export function showCreditGain(amount) {
  const documentRef = deps.documentRef || document;
  const el = documentRef.getElementById('flight-credit-gain');
  if (!el) return;
  el.textContent = `+${amount}CR`;
  el.classList.remove('credit-flash');
  void el.offsetWidth;
  el.classList.add('credit-flash');
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

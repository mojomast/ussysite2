import { COMBAT_ZONE_RADIUS, HYPERSPEED_MULTIPLIER_MAX } from './world.js';
import { findRoute, getNavNode } from './navgraph.js';

const THREE = globalThis.THREE;

export const AUTOPILOT_STATES = Object.freeze({
  IDLE: 'IDLE',
  PLOTTING: 'PLOTTING',
  ENGAGED: 'ENGAGED',
  DECELERATING: 'DECELERATING',
  ARRIVED: 'ARRIVED'
});

const ACTIVE_STATES = new Set([
  AUTOPILOT_STATES.PLOTTING,
  AUTOPILOT_STATES.ENGAGED,
  AUTOPILOT_STATES.DECELERATING
]);

const PLOT_DELAY_SECONDS = 0.8;

export function createAutopilotState() {
  return {
    state: AUTOPILOT_STATES.IDLE,
    targetId: null,
    targetPos: null,
    route: [],
    routeType: 'LOCAL',
    routeModeLabel: 'LOCAL ROUTE',
    waypointFlash: null,
    hyperspeedMult: 1,
    hyperspeedTarget: 1,
    arrivalThreshold: 200,
    blockedReason: null
  };
}

export function ensureAutopilotState(flightState) {
  if (!flightState || typeof flightState !== 'object') return createAutopilotState();
  const current = flightState.autopilot;
  if (current && typeof current === 'object') {
    const defaults = createAutopilotState();
    flightState.autopilot = { ...defaults, ...current };
    if (!Array.isArray(flightState.autopilot.route)) flightState.autopilot.route = [];
    if (!Object.values(AUTOPILOT_STATES).includes(flightState.autopilot.state)) {
      flightState.autopilot.state = AUTOPILOT_STATES.IDLE;
    }
    return flightState.autopilot;
  }
  flightState.autopilot = createAutopilotState();
  if (current === true) flightState.autopilot.state = AUTOPILOT_STATES.ENGAGED;
  return flightState.autopilot;
}

export function isAutopilotActive(flightState) {
  const autopilot = ensureAutopilotState(flightState);
  return ACTIVE_STATES.has(autopilot.state) && autopilot.state !== AUTOPILOT_STATES.IDLE;
}

function nowSeconds() {
  if (globalThis.performance?.now) return globalThis.performance.now() / 1000;
  return Date.now() / 1000;
}

function getNodePos(node) {
  return node?.pos || node?.position || null;
}

function clonePos(pos) {
  if (!pos) return null;
  if (typeof pos.clone === 'function') return pos.clone();
  if (THREE?.Vector3) return new THREE.Vector3(pos.x ?? 0, pos.y ?? 0, pos.z ?? 0);
  return { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 };
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  if (typeof a.distanceTo === 'function') return a.distanceTo(b);
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0), (a.z ?? 0) - (b.z ?? 0));
}

function nearestNodeId(navGraph, pos) {
  let bestId = null;
  let bestDist = Infinity;
  for (const node of navGraph?.values?.() ?? []) {
    const dist = distance(pos, getNodePos(node));
    if (dist < bestDist) {
      bestDist = dist;
      bestId = node.id;
    }
  }
  return bestId;
}

/**
 * Plots a route from the nearest nav node to the target.
 * Hyperspace-unlocked pilots get a direct two-point route; everyone else uses
 * the graph, where low-cost gate edges naturally prefer the jump-gate network.
 * @param {object} flightState Mutable flight state with position and unlock flags.
 * @param {Map<string, object>} navGraph Navigation graph.
 * @param {string} targetId Destination node id.
 * @returns {boolean} True when a route was stored on flightState.autopilot.
 */
export function plotCourse(flightState, navGraph, targetId) {
  const autopilot = ensureAutopilotState(flightState);
  const fromId = nearestNodeId(navGraph, flightState?.pos);
  const directRoute = fromId && targetId ? [fromId, targetId] : null;
  const route = flightState?.hyperspaceUnlocked ? directRoute : (fromId && targetId ? findRoute(navGraph, fromId, targetId) : null);
  if (!route) {
    autopilot.state = AUTOPILOT_STATES.IDLE;
    autopilot.blockedReason = 'NO ROUTE FOUND';
    autopilot.route = [];
    return false;
  }

  const targetNode = getNavNode(navGraph, targetId);
  autopilot.state = AUTOPILOT_STATES.PLOTTING;
  autopilot.route = route;
  const usesGate = route.some(id => getNavNode(navGraph, id)?.type === 'gate');
  autopilot.routeType = flightState?.hyperspaceUnlocked ? 'HYPERSPACE' : (usesGate ? 'GATE' : 'LOCAL');
  autopilot.routeModeLabel = autopilot.routeType === 'HYPERSPACE' ? 'HYPERSPACE DIRECT' : (usesGate ? 'VIA GATE NETWORK' : 'LOCAL ROUTE');
  autopilot.targetId = targetId;
  autopilot.targetPos = clonePos(getNodePos(targetNode));
  autopilot.blockedReason = null;
  autopilot.plotStartedAt = nowSeconds();
  autopilot.routeIndex = Math.min(1, route.length - 1);
  autopilot.waypointCount = Math.max(1, route.length - 1);
  return true;
}

function activeEnemyNear(flightState, combatState, radius = COMBAT_ZONE_RADIUS) {
  const enemies = combatState?.enemies || combatState?.activeEnemies || [];
  return enemies.some(enemy => {
    if (!(enemy?.userData?.active ?? enemy?.active ?? true)) return false;
    return distance(flightState?.pos, enemy.position || enemy.pos) <= radius;
  });
}

function lowHullOrArmor(flightState, combatState) {
  const armor = flightState?.armor ?? combatState?.hull ?? combatState?.armor ?? 100;
  const maxArmor = flightState?.maxArmor ?? combatState?.maxHull ?? combatState?.maxArmor ?? 100;
  const hullRatio = maxArmor > 0 ? armor / maxArmor : 1;
  const combatHull = combatState?.hull ?? combatState?.armor;
  const combatMax = combatState?.maxHull ?? combatState?.maxArmor ?? 100;
  const combatRatio = Number.isFinite(combatHull) && combatMax > 0 ? combatHull / combatMax : 1;
  return hullRatio < 0.15 || combatRatio < 0.15;
}

export function canEngageAutopilot(flightState, combatState) {
  if (flightState?.docked || flightState?.landed) return { ok: false, reason: 'DOCKED OR LANDED' };
  if (combatState?.bossActive) return { ok: false, reason: 'BOSS ACTIVE' };
  if (activeEnemyNear(flightState, combatState, COMBAT_ZONE_RADIUS)) return { ok: false, reason: 'HOSTILES NEARBY' };
  if (lowHullOrArmor(flightState, combatState)) return { ok: false, reason: 'HULL CRITICAL' };
  return { ok: true, reason: null };
}

export function disengage(flightState, reason = 'MANUAL') {
  const autopilot = ensureAutopilotState(flightState);
  autopilot.state = AUTOPILOT_STATES.IDLE;
  autopilot.hyperspeedMult = 1;
  autopilot.hyperspeedTarget = 1;
  autopilot.route = [];
  autopilot.blockedReason = reason;
  if (flightState && typeof flightState.addKillFeedEntry === 'function') {
    flightState.addKillFeedEntry(`AUTOPILOT DISENGAGED: ${reason}`, { type: 'warning' });
  }
  return autopilot;
}

function vectorToward(from, to) {
  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const dz = (to.z ?? 0) - (from.z ?? 0);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  if (THREE?.Vector3) return new THREE.Vector3(dx / len, dy / len, dz / len);
  return { x: dx / len, y: dy / len, z: dz / len };
}

function addScaled(pos, dir, scalar) {
  if (typeof pos.addScaledVector === 'function') return pos.addScaledVector(dir, scalar);
  pos.x = (pos.x ?? 0) + (dir.x ?? 0) * scalar;
  pos.y = (pos.y ?? 0) + (dir.y ?? 0) * scalar;
  pos.z = (pos.z ?? 0) + (dir.z ?? 0) * scalar;
  return pos;
}

function lerpNumber(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function updateAutopilot(flightState, combatState, dt, navGraph) {
  const autopilot = ensureAutopilotState(flightState);
  const gate = canEngageAutopilot(flightState, combatState);
  if (!gate.ok && autopilot.state !== AUTOPILOT_STATES.IDLE) return disengage(flightState, gate.reason);
  if (activeEnemyNear(flightState, combatState, COMBAT_ZONE_RADIUS * 0.5)) return disengage(flightState, 'HOSTILE INTERDICTION');

  if (autopilot.state === AUTOPILOT_STATES.PLOTTING) {
    if (nowSeconds() - (autopilot.plotStartedAt ?? nowSeconds()) >= PLOT_DELAY_SECONDS) {
      autopilot.state = AUTOPILOT_STATES.ENGAGED;
      autopilot.engagedAt = nowSeconds();
    }
    return autopilot;
  }
  if (autopilot.state !== AUTOPILOT_STATES.ENGAGED && autopilot.state !== AUTOPILOT_STATES.DECELERATING) return autopilot;

  const waypointId = autopilot.route?.[autopilot.routeIndex ?? 1] || autopilot.targetId;
  const waypoint = clonePos(getNodePos(getNavNode(navGraph, waypointId))) || autopilot.targetPos;
  if (!waypoint || !flightState?.pos) return disengage(flightState, 'TARGET LOST');

  const dist = distance(flightState.pos, waypoint);
  if (dist <= (autopilot.arrivalThreshold ?? 200)) {
    flightState.newNodeArrival = { id: waypointId, nodeId: waypointId, type: getNavNode(navGraph, waypointId)?.type, at: nowSeconds() };
    const node = getNavNode(navGraph, waypointId);
    const nextGateId = autopilot.route?.[(autopilot.routeIndex ?? 1) + 1];
    const nextGate = getNavNode(navGraph, nextGateId);
    if (node?.type === 'gate' && nextGate?.type === 'gate' && dist <= (node.activationRange ?? 12)) {
      flightState.pos.copy?.(nextGate.pos) ?? Object.assign(flightState.pos, nextGate.pos);
      flightState.vel?.set?.(0, 0, 0);
      flightState.status = 'WAYPOINT REACHED - JUMPING';
      flightState.statusUntil = (globalThis.performance?.now?.() ?? Date.now()) + 1500;
      flightState.newNodeArrival = { id: nextGate.id, nodeId: nextGate.id, type: nextGate.type, at: nowSeconds() };
      autopilot.routeIndex = Math.min((autopilot.routeIndex ?? 1) + 2, autopilot.route.length - 1);
      autopilot.waypointFlash = 'WAYPOINT REACHED - JUMPING';
      return autopilot;
    }
    if ((autopilot.routeIndex ?? 1) < autopilot.route.length - 1) {
      autopilot.routeIndex += 1;
      autopilot.waypointFlash = 'WAYPOINT REACHED';
    } else {
      autopilot.state = AUTOPILOT_STATES.ARRIVED;
      autopilot.hyperspeedTarget = 1;
      autopilot.hyperspeedMult = 1;
      return autopilot;
    }
  }

  const decelDistance = Math.max((autopilot.arrivalThreshold ?? 200) * 4, 800);
  autopilot.state = dist <= decelDistance && waypointId === autopilot.targetId
    ? AUTOPILOT_STATES.DECELERATING
    : AUTOPILOT_STATES.ENGAGED;
  autopilot.hyperspeedTarget = autopilot.state === AUTOPILOT_STATES.DECELERATING ? 1 : HYPERSPEED_MULTIPLIER_MAX;
  autopilot.hyperspeedMult = lerpNumber(
    autopilot.hyperspeedMult ?? 1,
    autopilot.hyperspeedTarget,
    dt / (autopilot.hyperspeedTarget > 1 ? 2 : 1.5)
  );

  const dir = vectorToward(flightState.pos, waypoint);
  const speed = (flightState.thrust ?? 14) * Math.max(1, autopilot.hyperspeedMult ?? 1);
  addScaled(flightState.pos, dir, Math.min(dist, speed * dt));
  if (flightState.vel?.lerp && THREE?.Vector3) {
    flightState.vel.lerp(dir.clone().multiplyScalar(speed), Math.min(1, dt * 2.5));
  }
  return autopilot;
}

export function updateStarfieldWarp(starfield, flightDir, hyperspeedMult = 1) {
  if (!starfield) return starfield;
  const mult = Math.max(1, hyperspeedMult || 1);
  const points = starfield.points ?? starfield;
  const material = starfield.material ?? points.material;
  const scale = starfield.scale ?? points.scale;
  if (material) material.size = 0.8 + (Math.min(mult, HYPERSPEED_MULTIPLIER_MAX) / HYPERSPEED_MULTIPLIER_MAX) * 4.0;
  if (scale) scale.z = 1 + (mult - 1) * 0.04;
  return starfield;
}

function drawMapTriangle(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.86, y + size * 0.72);
  ctx.lineTo(x - size * 0.86, y + size * 0.72);
  ctx.closePath();
  ctx.fill();
}

function drawCivilianContact(ctx, point, contact) {
  const size = contact.size || 2;
  const kind = String(contact.kind || contact.type || '').toLowerCase();
  ctx.fillStyle = contact.color === 0xffcc66 ? '#ffcc66' : (contact.color === 0x44bbff ? '#44bbff' : '#66ccff');
  if (kind === 'freighter') {
    ctx.fillRect(point.x - size, point.y - size, size * 2, size * 2);
  } else if (kind === 'courier') {
    drawMapTriangle(ctx, point.x, point.y, size + 1);
  } else {
    ctx.beginPath(); ctx.arc(point.x, point.y, size, 0, Math.PI * 2); ctx.fill();
  }
}

export function renderSystemMap(canvas, navGraph, flightState, planets = [], stations = [], civilianContacts = null, activeIntercept = null, now = globalThis.performance?.now?.() ?? Date.now()) {
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return false;
  const w = canvas.width || 600;
  const h = canvas.height || 600;
  const center = { x: w / 2, y: h / 2 };
  const nodes = [...(navGraph?.values?.() ?? [])];
  const max = Math.max(1, ...nodes.map(node => Math.max(Math.abs(getNodePos(node)?.x ?? 0), Math.abs(getNodePos(node)?.z ?? 0))));
  const scale = (Math.min(w, h) * 0.42) / max;
  const project = pos => ({ x: center.x + (pos?.x ?? 0) * scale, y: center.y + (pos?.z ?? 0) * scale });
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(3, 6, 15, 0.92)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,240,255,0.18)';
  for (const node of nodes) {
    const a = project(getNodePos(node));
    for (const edge of node.edges ?? []) {
      const bNode = getNavNode(navGraph, edge.targetId);
      if (!bNode) continue;
      const b = project(getNodePos(bNode));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  for (const node of nodes) {
    const p = project(getNodePos(node));
    ctx.fillStyle = node.type === 'station' ? '#ffcc00' : (node.type === 'jump' ? '#b026ff' : '#00f0ff');
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (flightState?.pos) {
    const p = project(flightState.pos);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const contact of civilianContacts || flightState?.civilianTraffic?.mapContacts || []) {
    const p = project(contact.pos);
    drawCivilianContact(ctx, p, contact);
  }
  const intercept = activeIntercept || flightState?.activeIntercept || flightState?.combatState?.activeIntercept;
  if (intercept?.hunters?.length) {
    const blinkAlpha = Math.floor(now / 350) % 2 === 0 ? 1 : 0.38;
    if (ctx.save) ctx.save();
    ctx.globalAlpha = blinkAlpha;
    ctx.fillStyle = '#ff2233';
    for (const hunter of intercept.hunters) {
      if (!(hunter?.userData?.active ?? hunter?.active ?? true)) continue;
      const pos = hunter.position || hunter.pos;
      if (!pos) continue;
      const p = project(pos);
      drawMapTriangle(ctx, p.x, p.y, hunter.userData?.tier === 'SQUADRON' ? 7 : 6);
    }
    if (ctx.restore) ctx.restore();
  }
  return true;
}

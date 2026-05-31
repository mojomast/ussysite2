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
const tempWaypoint = THREE?.Vector3 ? new THREE.Vector3() : { x: 0, y: 0, z: 0 };
const tempDirection = THREE?.Vector3 ? new THREE.Vector3() : { x: 0, y: 0, z: 0 };
const tempVelocityTarget = THREE?.Vector3 ? new THREE.Vector3() : { x: 0, y: 0, z: 0 };
const tempUp = THREE?.Vector3 ? new THREE.Vector3(0, 1, 0) : null;
const tempLookMatrix = THREE?.Matrix4 ? new THREE.Matrix4() : null;
const tempLookQuat = THREE?.Quaternion ? new THREE.Quaternion() : null;

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

function copyPos(pos, out) {
  if (!pos) return null;
  if (typeof out.copy === 'function') return out.copy(pos);
  out.x = pos.x ?? 0;
  out.y = pos.y ?? 0;
  out.z = pos.z ?? 0;
  return out;
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  if (typeof a.distanceTo === 'function') return a.distanceTo(b);
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0), (a.z ?? 0) - (b.z ?? 0));
}

function getWaypointArrivalThreshold(node, autopilot) {
  if (!node) return autopilot.arrivalThreshold ?? 200;
  if (node.type === 'gate') return Math.max(1, node.activationRange ?? 12);
  if (node.type === 'station') return Math.max(1, node.activationRange ?? 120);
  if (node.type === 'planet' && Number.isFinite(node.radius) && node.radius > 0) return Math.max(200, node.radius * 1.6);
  return autopilot.arrivalThreshold ?? 200;
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

export function appendCourse(flightState, navGraph, targetId) {
  const autopilot = ensureAutopilotState(flightState);
  const currentRoute = Array.isArray(autopilot.route) ? autopilot.route : [];
  if (!currentRoute.length || !autopilot.targetId) return plotCourse(flightState, navGraph, targetId);

  const fromId = currentRoute[currentRoute.length - 1];
  const segment = flightState?.hyperspaceUnlocked
    ? (fromId && targetId ? [fromId, targetId] : null)
    : (fromId && targetId ? findRoute(navGraph, fromId, targetId) : null);
  if (!segment) {
    autopilot.blockedReason = 'NO ROUTE FOUND';
    return false;
  }

  const targetNode = getNavNode(navGraph, targetId);
  const extension = segment[0] === fromId ? segment.slice(1) : segment;
  autopilot.route = [...currentRoute, ...extension];
  autopilot.state = AUTOPILOT_STATES.PLOTTING;
  const usesGate = autopilot.route.some(id => getNavNode(navGraph, id)?.type === 'gate');
  autopilot.routeType = flightState?.hyperspaceUnlocked ? 'HYPERSPACE' : (usesGate ? 'GATE' : 'LOCAL');
  autopilot.routeModeLabel = autopilot.routeType === 'HYPERSPACE' ? 'HYPERSPACE MULTI-STOP' : (usesGate ? 'MULTI-STOP VIA GATES' : 'MULTI-STOP ROUTE');
  autopilot.targetId = targetId;
  autopilot.targetPos = clonePos(getNodePos(targetNode));
  autopilot.blockedReason = null;
  autopilot.plotStartedAt = nowSeconds();
  autopilot.routeIndex = Math.min(Math.max(autopilot.routeIndex ?? 1, 1), autopilot.route.length - 1);
  autopilot.waypointCount = Math.max(1, autopilot.route.length - 1);
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

function vectorToward(from, to, out) {
  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const dz = (to.z ?? 0) - (from.z ?? 0);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  if (typeof out.set === 'function') return out.set(dx / len, dy / len, dz / len);
  out.x = dx / len;
  out.y = dy / len;
  out.z = dz / len;
  return out;
}

function setScaledVector(out, dir, scalar) {
  if (typeof out.copy === 'function' && typeof out.multiplyScalar === 'function') {
    return out.copy(dir).multiplyScalar(scalar);
  }
  out.x = (dir.x ?? 0) * scalar;
  out.y = (dir.y ?? 0) * scalar;
  out.z = (dir.z ?? 0) * scalar;
  return out;
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
  const node = getNavNode(navGraph, waypointId);
  const waypoint = copyPos(getNodePos(node), tempWaypoint) || autopilot.targetPos;
  if (!waypoint || !flightState?.pos) return disengage(flightState, 'TARGET LOST');

  const dist = distance(flightState.pos, waypoint);
  const arrivalThreshold = getWaypointArrivalThreshold(node, autopilot);
  if (dist <= arrivalThreshold) {
    flightState.newNodeArrival = { id: waypointId, nodeId: waypointId, type: getNavNode(navGraph, waypointId)?.type, at: nowSeconds() };
    const nextGateId = autopilot.route?.[(autopilot.routeIndex ?? 1) + 1];
    const nextGate = getNavNode(navGraph, nextGateId);
    if (node?.type === 'gate' && nextGate?.type === 'gate') {
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
      autopilot.arrivedAt = nowSeconds();
      autopilot.arrivalNodeId = waypointId;
      autopilot.waypointFlash = 'ARRIVED';
      flightState.vel?.set?.(0, 0, 0);
      flightState.status = `ARRIVED: ${node?.name || waypointId || 'TARGET'}`;
      flightState.statusUntil = (globalThis.performance?.now?.() ?? Date.now()) + 3500;
      return autopilot;
    }
  }

  const decelDistance = Math.max(arrivalThreshold * 4, 800);
  autopilot.state = dist <= decelDistance && waypointId === autopilot.targetId
    ? AUTOPILOT_STATES.DECELERATING
    : AUTOPILOT_STATES.ENGAGED;
  autopilot.hyperspeedTarget = autopilot.state === AUTOPILOT_STATES.DECELERATING ? 1 : HYPERSPEED_MULTIPLIER_MAX;
  autopilot.hyperspeedMult = lerpNumber(
    autopilot.hyperspeedMult ?? 1,
    autopilot.hyperspeedTarget,
    dt / (autopilot.hyperspeedTarget > 1 ? 2 : 1.5)
  );

  const dir = vectorToward(flightState.pos, waypoint, tempDirection);
  if (flightState.orientation?.slerp && tempLookMatrix && tempLookQuat && tempUp) {
    tempLookMatrix.lookAt(flightState.pos, waypoint, tempUp);
    tempLookQuat.setFromRotationMatrix(tempLookMatrix);
    flightState.orientation.slerp(tempLookQuat, Math.min(1, dt * 1.8));
  }
  const speed = (flightState.thrust ?? 14) * Math.max(1, autopilot.hyperspeedMult ?? 1);
  addScaled(flightState.pos, dir, Math.min(dist, speed * dt));
  if (flightState.vel?.lerp && THREE?.Vector3) {
    flightState.vel.lerp(setScaledVector(tempVelocityTarget, dir, speed), Math.min(1, dt * 2.5));
  }
  return autopilot;
}

export function updateStarfieldWarp(starfield, flightDir, hyperspeedMult = 1) {
  if (!starfield) return starfield;
  const mult = Math.max(1, hyperspeedMult || 1);
  const points = starfield.points ?? starfield;
  const material = starfield.material ?? points.material;
  const scale = starfield.scale ?? points.scale;
  const warp = Math.min(1, (mult - 1) / Math.max(1, HYPERSPEED_MULTIPLIER_MAX - 1));
  if (material?.uniforms?.uWarp) material.uniforms.uWarp.value = warp;
  if (material) material.size = 0.8 + warp * 4.0;
  if (scale) scale.z = 1 + (mult - 1) * 0.04;
  if (starfield.streaks?.material) {
    starfield.streaks.visible = warp > 0.025;
    starfield.streaks.material.opacity = Math.min(0.95, warp * 0.88 + (warp > 0 ? 0.06 : 0));
  }
  if (starfield.updateStreaks) starfield.updateStreaks(flightDir, mult);
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

function nodeColor(node) {
  if (node?.type === 'station') return '#ffcc00';
  if (node?.type === 'gate') return '#44ffee';
  if (node?.type === 'jump') return '#b026ff';
  return '#00f0ff';
}

function formatMapDistance(value) {
  if (!Number.isFinite(value)) return '--';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}kU` : `${Math.round(value)}u`;
}

function nearestMapNode(nodes, pos) {
  let best = null;
  let bestDist = Infinity;
  for (const node of nodes) {
    const dist = distance(pos, getNodePos(node));
    if (dist < bestDist) {
      best = node;
      bestDist = dist;
    }
  }
  return { node: best, dist: bestDist };
}

function drawMapLabel(ctx, text, x, y, color = 'rgba(226, 246, 255, 0.86)', align = 'left') {
  if (!ctx.fillText || !text) return;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function drawMapNode(ctx, node, point, isTarget = false, isNearest = false) {
  const color = nodeColor(node);
  const size = isTarget ? 7 : (node?.type === 'planet' ? 4 : 5);
  ctx.fillStyle = color;
  ctx.strokeStyle = isTarget ? '#ffffff' : color;
  ctx.lineWidth = isTarget || isNearest ? 2 : 1;
  if (node?.type === 'station') {
    ctx.fillRect(point.x - size, point.y - size, size * 2, size * 2);
  } else if (node?.type === 'gate' || node?.type === 'jump') {
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - size);
    ctx.lineTo(point.x + size, point.y);
    ctx.lineTo(point.x, point.y + size);
    ctx.lineTo(point.x - size, point.y);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(point.x, point.y, size, 0, Math.PI * 2); ctx.fill();
  }
  if (isTarget || isNearest) {
    ctx.beginPath(); ctx.arc(point.x, point.y, size + 5, 0, Math.PI * 2); ctx.stroke();
  }
}

function getMapAutopilotState(flightState) {
  const current = flightState?.autopilot;
  return current && typeof current === 'object'
    ? { ...createAutopilotState(), ...current, route: Array.isArray(current.route) ? current.route : [] }
    : createAutopilotState();
}

function clampMapViewport(viewport = {}) {
  return {
    zoom: Math.max(0.45, Math.min(4, Number.isFinite(viewport.zoom) ? viewport.zoom : 1)),
    offsetX: Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0,
    offsetY: Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0
  };
}

function getSystemMapProjection(canvas, navGraph, viewport = null) {
  const w = canvas?.width || 600;
  const h = canvas?.height || 600;
  const view = clampMapViewport(viewport || {});
  const center = { x: w / 2 + view.offsetX, y: h / 2 + view.offsetY };
  const nodes = [...(navGraph?.values?.() ?? [])];
  const max = Math.max(1, ...nodes.map(node => Math.max(Math.abs(getNodePos(node)?.x ?? 0), Math.abs(getNodePos(node)?.z ?? 0))));
  const scale = ((Math.min(w, h) * 0.38) / max) * view.zoom;
  const project = pos => ({ x: center.x + (pos?.x ?? 0) * scale, y: center.y + (pos?.z ?? 0) * scale });
  return { w, h, nodes, project, center, max, scale, viewport: view };
}

export function getSystemMapNodeHitTargets(canvas, navGraph, viewport = null) {
  const { nodes, project } = getSystemMapProjection(canvas, navGraph, viewport);
  return nodes
    .map(node => ({ node, x: project(getNodePos(node)).x, y: project(getNodePos(node)).y, radius: node?.type === 'planet' ? 12 : 14 }))
    .filter(target => target.node?.id);
}

export function hitTestSystemMapNode(canvas, navGraph, clientX, clientY, viewport = null) {
  if (!canvas?.getBoundingClientRect) return null;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 1;
  const height = rect.height || canvas.height || 1;
  const x = ((clientX - rect.left) / width) * (canvas.width || width);
  const y = ((clientY - rect.top) / height) * (canvas.height || height);
  let best = null;
  for (const target of getSystemMapNodeHitTargets(canvas, navGraph, viewport)) {
    const dist = Math.hypot(x - target.x, y - target.y);
    if (dist > target.radius) continue;
    if (!best || dist < best.dist) best = { ...target, dist };
  }
  return best?.node ?? null;
}

export function renderSystemMap(canvas, navGraph, flightState, planets = [], stations = [], civilianContacts = null, activeIntercept = null, now = globalThis.performance?.now?.() ?? Date.now(), hostiles = [], viewport = null) {
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return false;
  const { w, h, nodes, project, center, max, scale, viewport: view } = getSystemMapProjection(canvas, navGraph, viewport);
  const autopilot = getMapAutopilotState(flightState);
  const targetId = autopilot.targetId || flightState?.navNode?.userData?.project?.id || null;
  const targetNode = targetId ? getNavNode(navGraph, targetId) : null;
  const nearest = nearestMapNode(nodes, flightState?.pos);
  const intercept = activeIntercept || flightState?.activeIntercept || flightState?.combatState?.activeIntercept;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(3, 6, 15, 0.92)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,240,255,0.10)';
  ctx.setLineDash?.([4, 8]);
  for (let ring = 0.25; ring <= 1; ring += 0.25) {
    ctx.beginPath(); ctx.arc(center.x, center.y, max * scale * ring, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.setLineDash?.([]);
  const edgeSeen = new Set();
  for (const node of nodes) {
    const a = project(getNodePos(node));
    for (const edge of node.edges ?? []) {
      const bNode = getNavNode(navGraph, edge.targetId);
      if (!bNode) continue;
      const key = node.id < bNode.id ? `${node.id}:${bNode.id}` : `${bNode.id}:${node.id}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      const b = project(getNodePos(bNode));
      const gateEdge = node.type === 'gate' && bNode.type === 'gate';
      ctx.strokeStyle = gateEdge ? 'rgba(68, 255, 238, 0.42)' : 'rgba(0,240,255,0.12)';
      ctx.lineWidth = gateEdge ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (autopilot.route?.length > 1) {
    const routePoints = autopilot.route
      .map(id => getNavNode(navGraph, id))
      .filter(Boolean)
      .map(node => project(getNodePos(node)));
    ctx.strokeStyle = autopilot.routeType === 'HYPERSPACE' ? '#ffffff' : (autopilot.routeType === 'GATE' ? '#44ffee' : '#ffcc00');
    ctx.lineWidth = 3;
    if (routePoints.length > 1) {
      ctx.beginPath();
      routePoints.forEach((p, index) => {
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }
  for (const node of nodes) {
    const p = project(getNodePos(node));
    drawMapNode(ctx, node, p, node.id === targetId, node.id === nearest.node?.id);
    if (node.type === 'gate' || node.type === 'station' || node.id === targetId || node.id === nearest.node?.id) {
      drawMapLabel(ctx, node.name || node.id, p.x + 8, p.y - 7, node.id === targetId ? '#ffffff' : nodeColor(node));
    }
  }
  if (flightState?.pos) {
    const p = project(flightState.pos);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    if (flightState.vel?.lengthSq?.() > 0.01) {
      const heading = flightState.vel.clone().normalize();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + heading.x * 28, p.y + heading.z * 28); ctx.stroke();
    }
    drawMapLabel(ctx, 'YOU', p.x + 9, p.y + 4, '#ffffff');
  }
  for (const contact of civilianContacts || flightState?.civilianTraffic?.mapContacts || []) {
    const p = project(contact.pos);
    drawCivilianContact(ctx, p, contact);
  }
  const interceptHunters = new Set(intercept?.hunters ?? []);
  for (const enemy of hostiles || []) {
    if (interceptHunters.has(enemy)) continue;
    if (!(enemy?.userData?.active ?? enemy?.active ?? true) || enemy.visible === false) continue;
    const pos = enemy.position || enemy.pos;
    if (!pos) continue;
    const p = project(pos);
    ctx.fillStyle = '#ff3355';
    drawMapTriangle(ctx, p.x, p.y, enemy.userData?.isBoss ? 8 : 5);
  }
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
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(3, 6, 15, 0.68)';
  ctx.fillRect(12, 12, 214, 96);
  ctx.strokeStyle = 'rgba(0,240,255,0.22)';
  ctx.strokeRect?.(12, 12, 214, 96);
  drawMapLabel(ctx, 'SYSTEM MAP [M]', 22, 30, '#ffffff');
  drawMapLabel(ctx, 'white: you / route target', 22, 47, 'rgba(226, 246, 255, 0.82)');
  drawMapLabel(ctx, 'cyan: gates + planets', 22, 64, '#44ffee');
  drawMapLabel(ctx, 'yellow: stations / red: hostiles', 22, 81, '#ffcc00');
  drawMapLabel(ctx, `nearest: ${nearest.node?.name || '--'} ${formatMapDistance(nearest.dist)}`, 22, 98, 'rgba(226, 246, 255, 0.86)');
  drawMapLabel(ctx, `wheel zoom ${view.zoom.toFixed(1)}x / drag pan`, w - 16, 30, 'rgba(226, 246, 255, 0.70)', 'right');
  const routeText = targetNode ? `${autopilot.routeModeLabel || 'TARGET'} -> ${targetNode.name || targetNode.id}` : 'no nav target';
  drawMapLabel(ctx, routeText, 16, h - 18, targetNode ? '#ffcc00' : 'rgba(226, 246, 255, 0.58)');
  return true;
}

import { findRoute, getNavNode } from './navgraph.js';
import { LOD_FAR, SYSTEM_RADIUS } from './world.js';

const THREE = globalThis.THREE;

export const CIVILIAN_MAX = 6;
export const MAX_CIVILIAN_POOL = CIVILIAN_MAX * 3;

export const CIVILIAN_TYPES = Object.freeze({
  FREIGHTER: 'FREIGHTER',
  SHUTTLE: 'SHUTTLE',
  COURIER: 'COURIER'
});

const CIVILIAN_TYPE_CONFIG = Object.freeze({
  FREIGHTER: Object.freeze({ id: CIVILIAN_TYPES.FREIGHTER, key: 'freighter', label: 'FRG', speed: 80, radius: 1.8, color: 0x66ccff, mapSize: 3 }),
  SHUTTLE: Object.freeze({ id: CIVILIAN_TYPES.SHUTTLE, key: 'shuttle', label: 'SHT', speed: 140, radius: 1.1, color: 0x88e6ff, mapSize: 2.5 }),
  COURIER: Object.freeze({ id: CIVILIAN_TYPES.COURIER, key: 'courier', label: 'COU', speed: 200, radius: 0.8, color: 0x44bbff, mapSize: 2 })
});

const CIVILIAN_STATES = Object.freeze({
  DOCKED: 'DOCKED',
  DEPARTING: 'DEPARTING',
  TRANSIT: 'TRANSIT',
  FLEE: 'FLEE',
  DESTROYED: 'DESTROYED'
});

const TYPE_LIST = Object.values(CIVILIAN_TYPE_CONFIG);
const FLEE_RADIUS = 55;
const FLEE_DURATION_SECONDS = 7;
const DOCKED_SECONDS = 4;
const ARRIVAL_DISTANCE = 120;
const CULL_DISTANCE = LOD_FAR;

let nextCivilianId = 1;
let cachedMaterials = null;
let cachedGeometries = null;

function requireThree(ThreeRef = THREE) {
  if (!ThreeRef?.Group || !ThreeRef?.Vector3) throw new Error('civilians.js requires THREE primitives');
  return ThreeRef;
}

function getType(type = 'freighter') {
  const id = typeof type === 'string' ? type.toUpperCase() : String(type?.id ?? type?.key ?? '').toUpperCase();
  return TYPE_LIST.find(item => item.id === id || item.key.toUpperCase() === id) || CIVILIAN_TYPE_CONFIG.FREIGHTER;
}

function initCaches(ThreeRef) {
  if (!cachedMaterials) {
    cachedMaterials = {
      hull: new ThreeRef.MeshBasicMaterial({ color: 0x66ccff, wireframe: true, transparent: true, opacity: 0.74 }),
      cargo: new ThreeRef.MeshBasicMaterial({ color: 0x2f8cff, wireframe: true, transparent: true, opacity: 0.58 }),
      wing: new ThreeRef.MeshBasicMaterial({ color: 0xa7f3ff, wireframe: true, transparent: true, opacity: 0.68 }),
      glass: new ThreeRef.MeshBasicMaterial({ color: 0xd8ffff, wireframe: true, transparent: true, opacity: 0.78 }),
      accent: new ThreeRef.MeshBasicMaterial({ color: 0xffcc66, wireframe: true, transparent: true, opacity: 0.68 })
    };
  }
  if (!cachedGeometries) {
    cachedGeometries = {
      freighterHull: new ThreeRef.BoxGeometry(1.8, 0.7, 3.2),
      freighterPod: new ThreeRef.BoxGeometry(0.72, 0.56, 0.9),
      engine: new ThreeRef.CylinderGeometry(0.16, 0.2, 0.55, 8),
      shuttleBody: new ThreeRef.CylinderGeometry(0.36, 0.42, 1.7, 10),
      shuttleWing: new ThreeRef.BoxGeometry(1.15, 0.05, 0.36),
      shuttleNose: new ThreeRef.ConeGeometry(0.28, 0.55, 8),
      courierBody: new ThreeRef.ConeGeometry(0.28, 1.45, 8),
      courierFin: new ThreeRef.BoxGeometry(0.06, 0.45, 0.5),
      courierTail: new ThreeRef.OctahedronGeometry(0.18)
    };
  }
}

function clearChildren(group) {
  while (group.children?.length) group.remove(group.children[0]);
}

function cloneVector(ThreeRef, pos) {
  if (pos?.clone) return pos.clone();
  return new ThreeRef.Vector3(pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0);
}

function nodePosition(ThreeRef, node) {
  return cloneVector(ThreeRef, node?.pos || node?.position);
}

function ensureTrafficState(flightState) {
  if (!flightState) return null;
  flightState.civilianTraffic ??= {
    enabled: true,
    ships: [],
    maxActive: CIVILIAN_MAX,
    lastSpawnAt: 0,
    nextSpawnAt: 0,
    lastMapSnapshotAt: 0,
    mapContacts: []
  };
  flightState.civilianTraffic.ships ??= [];
  flightState.civilianTraffic.mapContacts ??= [];
  return flightState.civilianTraffic;
}

function activeCivilianCount(ships = []) {
  return ships.filter(ship => ship?.active && ship.state !== CIVILIAN_STATES.DESTROYED).length;
}

function buildFreighter(group, ThreeRef) {
  group.add(new ThreeRef.Mesh(cachedGeometries.freighterHull, cachedMaterials.hull));
  [-0.52, 0.52].forEach(x => [-0.7, 0.25, 1.2].forEach(z => {
    const pod = new ThreeRef.Mesh(cachedGeometries.freighterPod, cachedMaterials.cargo);
    pod.position.set(x, 0.05, z);
    group.add(pod);
  }));
  [-0.55, 0.55].forEach(x => {
    const engine = new ThreeRef.Mesh(cachedGeometries.engine, cachedMaterials.accent);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, 0, 1.9);
    group.add(engine);
  });
}

function buildShuttle(group, ThreeRef) {
  const body = new ThreeRef.Mesh(cachedGeometries.shuttleBody, cachedMaterials.hull);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  [-0.18, 0.22].forEach(z => {
    const wing = new ThreeRef.Mesh(cachedGeometries.shuttleWing, cachedMaterials.wing);
    wing.position.z = z;
    group.add(wing);
  });
  const nose = new ThreeRef.Mesh(cachedGeometries.shuttleNose, cachedMaterials.glass);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.9;
  group.add(nose);
}

function buildCourier(group, ThreeRef) {
  const body = new ThreeRef.Mesh(cachedGeometries.courierBody, cachedMaterials.hull);
  body.rotation.x = -Math.PI / 2;
  group.add(body);
  [-1, 1].forEach(side => {
    const fin = new ThreeRef.Mesh(cachedGeometries.courierFin, cachedMaterials.wing);
    fin.position.set(side * 0.36, 0, 0.22);
    fin.rotation.z = side * 0.35;
    group.add(fin);
  });
  const tail = new ThreeRef.Mesh(cachedGeometries.courierTail, cachedMaterials.accent);
  tail.position.z = 0.82;
  group.add(tail);
}

export function buildCivilianMesh(type = 'freighter', options = {}) {
  const ThreeRef = requireThree(options.THREE);
  initCaches(ThreeRef);
  const group = new ThreeRef.Group();
  const resolved = getType(type);
  if (resolved.id === CIVILIAN_TYPES.FREIGHTER) buildFreighter(group, ThreeRef);
  else if (resolved.id === CIVILIAN_TYPES.SHUTTLE) buildShuttle(group, ThreeRef);
  else buildCourier(group, ThreeRef);
  group.userData = { ...(group.userData ?? {}), isCivilian: true, civilianType: resolved.id, type: resolved.id, fleet: true };
  return group;
}

function routeDistance(ThreeRef, navGraph, routeIds) {
  let total = 0;
  for (let index = 0; index < routeIds.length - 1; index += 1) {
    const a = getNavNode(navGraph, routeIds[index]);
    const b = getNavNode(navGraph, routeIds[index + 1]);
    if (!a || !b) return Infinity;
    total += nodePosition(ThreeRef, a).distanceTo(nodePosition(ThreeRef, b));
  }
  return total;
}

function chooseRoute(ThreeRef, navGraph, random = Math.random) {
  const nodes = [...(navGraph?.values?.() ?? [])].filter(node => node.edges?.length);
  if (nodes.length < 2) return null;
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const from = nodes[Math.floor(random() * nodes.length) % nodes.length];
    const edge = from.edges[Math.floor(random() * from.edges.length) % from.edges.length];
    const toId = edge?.targetId;
    const routeIds = findRoute(navGraph, from.id, toId) || (toId ? [from.id, toId] : null);
    if (routeIds?.length >= 2 && Number.isFinite(routeDistance(ThreeRef, navGraph, routeIds))) return routeIds;
  }
  return null;
}

function getRoutePoint(ThreeRef, navGraph, routeIds, segmentIndex, progress) {
  const from = getNavNode(navGraph, routeIds[segmentIndex]);
  const to = getNavNode(navGraph, routeIds[segmentIndex + 1]);
  if (!from || !to) return null;
  const start = nodePosition(ThreeRef, from);
  const end = nodePosition(ThreeRef, to);
  return start.lerp(end, Math.max(0, Math.min(1, progress)));
}

function createRouteState(ThreeRef, navGraph, routeIds, random = Math.random) {
  const progress = Math.max(0.05, Math.min(0.85, random()));
  return {
    fromId: routeIds[0],
    toId: routeIds[routeIds.length - 1],
    nodeIds: routeIds,
    segmentIndex: 0,
    progress,
    distance: routeDistance(ThreeRef, navGraph, routeIds)
  };
}

function initialRouteForHome(navGraph, homeNodeId) {
  const home = getNavNode(navGraph, homeNodeId);
  const targetId = home?.edges?.[0]?.targetId;
  if (!home || !targetId) return [];
  return findRoute(navGraph, homeNodeId, targetId) || [homeNodeId, targetId];
}

export function createCivilianShip(type = CIVILIAN_TYPES.FREIGHTER, optionsOrHomeNodeId = {}, navGraphArg = null, THREEArg = null) {
  const options = typeof optionsOrHomeNodeId === 'string'
    ? { homeNodeId: optionsOrHomeNodeId, navGraph: navGraphArg, THREE: THREEArg }
    : optionsOrHomeNodeId;
  const ThreeRef = requireThree(options.THREE);
  const resolved = getType(type);
  const object = options.object || new ThreeRef.Group();
  clearChildren(object);
  const modelRoot = buildCivilianMesh(resolved.id, { THREE: ThreeRef });
  object.add(modelRoot);
  const engineGlow = new ThreeRef.PointLight(resolved.color, 0.45, 10, 2);
  engineGlow.position.set(0, 0, 1.2);
  object.add(engineGlow);
  object.visible = true;
  object.userData = { ...(object.userData ?? {}), isCivilian: true, civilian: true, type: resolved.id, fleet: true };
  const routeIds = options.route ?? initialRouteForHome(options.navGraph, options.homeNodeId);
  const ship = {
    id: options.id || `civ_${String(nextCivilianId++).padStart(4, '0')}`,
    kind: resolved.key,
    type: resolved.id,
    state: options.state || CIVILIAN_STATES.DOCKED,
    role: 'transit',
    mesh: object,
    object,
    modelRoot,
    active: true,
    visible: true,
    pos: object.position,
    position: object.position,
    vel: null,
    velocity: new ThreeRef.Vector3(),
    route: Array.isArray(routeIds) ? routeIds : [],
    _route: Array.isArray(routeIds) && routeIds.length > 1 ? createRouteState(ThreeRef, options.navGraph, routeIds, options.random) : null,
    currentLeg: 0,
    targetPos: null,
    speed: resolved.speed,
    cruiseSpeed: resolved.speed,
    fleeSpeed: Math.min(240, resolved.speed * 1.8),
    radius: resolved.radius,
    health: 1,
    maxHealth: 1,
    faction: 'civilian',
    combatant: false,
    homeNodeId: options.homeNodeId ?? null,
    destNodeId: Array.isArray(routeIds) ? routeIds[routeIds.length - 1] ?? null : null,
    dockTargetId: null,
    dockedUntil: options.dockedUntil ?? DOCKED_SECONDS,
    fleeUntil: 0,
    spawnTime: options.now ?? 0,
    lastSeenTime: options.now ?? 0,
    engineGlow,
    mapContact: { label: resolved.label, color: resolved.color, size: resolved.mapSize }
  };
  ship.vel = ship.velocity;
  object.userData.civilianShip = ship;
  if (options.navGraph && options.homeNodeId) {
    const home = getNavNode(options.navGraph, options.homeNodeId);
    if (home?.pos) ship.position.copy(nodePosition(ThreeRef, home));
  }
  return ship;
}

function activateShipOnRoute(ship, ThreeRef, navGraph, routeIds, random = Math.random) {
  ship._route = createRouteState(ThreeRef, navGraph, routeIds, random);
  ship.route = [...routeIds];
  ship.currentLeg = ship._route.segmentIndex;
  ship.homeNodeId = routeIds[0] ?? null;
  ship.destNodeId = routeIds[routeIds.length - 1] ?? null;
  const pos = getRoutePoint(ThreeRef, navGraph, ship._route.nodeIds, ship._route.segmentIndex, ship._route.progress);
  if (pos) ship.position.copy(pos);
  ship.state = ship.dockedUntil > 0 ? CIVILIAN_STATES.DOCKED : CIVILIAN_STATES.TRANSIT;
  ship.active = true;
  ship.visible = true;
  ship.object.visible = true;
  ship.velocity.set(0, 0, 0);
  return ship;
}

function allocateCivilianShip(traffic, type, ThreeRef, options = {}) {
  const reusableIndex = traffic.ships.findIndex(ship => !ship?.active || ship.state === CIVILIAN_STATES.DESTROYED);
  if (reusableIndex >= 0) {
    const reusable = traffic.ships[reusableIndex];
    const ship = createCivilianShip(type.id, {
      THREE: ThreeRef,
      object: reusable.object,
      now: options.now ?? 0,
      dockedUntil: options.dockedUntil ?? 0
    });
    traffic.ships[reusableIndex] = ship;
    return ship;
  }
  if (traffic.ships.length >= MAX_CIVILIAN_POOL) return null;
  const ship = createCivilianShip(type.id, {
    THREE: ThreeRef,
    now: options.now ?? 0,
    dockedUntil: options.dockedUntil ?? 0
  });
  traffic.ships.push(ship);
  return ship;
}

export function spawnCivilianFleet(options = {}) {
  const ThreeRef = requireThree(options.THREE);
  const { gameRoot, navGraph, flightState, random = Math.random } = options;
  const traffic = ensureTrafficState(flightState) || { ships: [], enabled: true, maxActive: CIVILIAN_MAX, mapContacts: [] };
  if (!traffic.enabled || flightState?.landed) return traffic.ships;
  const hyperspeed = flightState?.autopilot?.hyperspeedMult ?? 1;
  const combatActive = Boolean(options.combatActive || options.enemies?.some?.(enemy => enemy?.userData?.active && !enemy.userData.isFriendly));
  const cap = Math.min(CIVILIAN_MAX, traffic.maxActive ?? CIVILIAN_MAX, (combatActive || hyperspeed > 5) ? 3 : CIVILIAN_MAX);
  while (activeCivilianCount(traffic.ships) < cap) {
    const routeIds = chooseRoute(ThreeRef, navGraph, random);
    if (!routeIds) break;
    const type = TYPE_LIST[Math.floor(random() * TYPE_LIST.length) % TYPE_LIST.length];
    const ship = allocateCivilianShip(traffic, type, ThreeRef, { now: options.now ?? 0, dockedUntil: random() < 0.35 ? DOCKED_SECONDS : 0 });
    if (!ship) break;
    activateShipOnRoute(ship, ThreeRef, navGraph, routeIds, random);
    gameRoot?.add?.(ship.object);
  }
  return traffic.ships;
}

function nearestHostile(ship, enemies = []) {
  let nearest = null;
  let nearestDistSq = FLEE_RADIUS * FLEE_RADIUS;
  enemies.forEach(enemy => {
    if (!enemy?.userData?.active || enemy.userData.isFriendly) return;
    const enemyPos = enemy.position || enemy.pos;
    if (!enemyPos) return;
    const distSq = ship.position.distanceToSquared(enemyPos);
    if (distSq < nearestDistSq) {
      nearest = enemy;
      nearestDistSq = distSq;
    }
  });
  return nearest;
}

function projectileNear(ship, projectiles = []) {
  return projectiles.some(projectile => projectile?.userData?.active && projectile.position && ship.position.distanceToSquared(projectile.position) <= 100);
}

function setDestroyed(ship, options, events) {
  if (!ship.active || ship.state === CIVILIAN_STATES.DESTROYED) return;
  ship.state = CIVILIAN_STATES.DESTROYED;
  ship.active = false;
  ship.visible = false;
  ship.object.visible = false;
  ship.engineGlow.intensity = 0;
  options.gameRoot?.remove?.(ship.object);
  const event = { type: 'CIVILIAN_DESTROYED', id: ship.id, kind: ship.kind, text: 'CIVILIAN TRANSPORT DESTROYED' };
  events.push(event);
  options.addKillFeedEntry?.(event.text, '#ffcc66');
}

function cullShip(ship, options) {
  ship.active = false;
  ship.visible = false;
  ship.object.visible = false;
  ship.engineGlow.intensity = 0;
  options.gameRoot?.remove?.(ship.object);
}

function advanceRoute(ship, ThreeRef, navGraph, dt) {
  const route = ship._route ?? (!Array.isArray(ship.route) ? ship.route : null);
  if (!route?.nodeIds || route.nodeIds.length < 2) return false;
  const from = getNavNode(navGraph, route.nodeIds[route.segmentIndex]);
  const to = getNavNode(navGraph, route.nodeIds[route.segmentIndex + 1]);
  if (!from || !to) return false;
  const start = nodePosition(ThreeRef, from);
  const end = nodePosition(ThreeRef, to);
  const segmentDistance = Math.max(1, start.distanceTo(end));
  const previous = ship.position.clone();
  route.progress += (ship.speed * dt) / segmentDistance;
  while (route.progress >= 1) {
    route.segmentIndex += 1;
    ship.currentLeg = route.segmentIndex;
    route.progress -= 1;
    if (route.segmentIndex >= route.nodeIds.length - 1) return false;
  }
  const next = getRoutePoint(ThreeRef, navGraph, route.nodeIds, route.segmentIndex, route.progress);
  if (!next) return false;
  ship.position.copy(next);
  ship.velocity.copy(ship.position).sub(previous).divideScalar(dt > 0 ? dt : 0.016);
  ship.targetPos = nodePosition(ThreeRef, getNavNode(navGraph, route.nodeIds[route.segmentIndex + 1]));
  return true;
}

function updateFlee(ship, ThreeRef, flightState, hostile, dt) {
  const away = ship.position.clone().sub(hostile?.position || flightState?.pos || new ThreeRef.Vector3(0, 0, 0));
  if (away.lengthSq() <= 0.000001) away.set(1, 0, 0);
  away.normalize();
  const previous = ship.position.clone();
  ship.position.addScaledVector(away, ship.fleeSpeed * dt);
  ship.velocity.copy(ship.position).sub(previous).divideScalar(dt > 0 ? dt : 0.016);
}

export function updateCivilians(dt, options = {}) {
  const ThreeRef = requireThree(options.THREE);
  const { flightState, navGraph, enemies = [], playerBullets = [], playerMissiles = [], now = 0 } = options;
  const traffic = ensureTrafficState(flightState);
  const ships = options.ships || traffic?.ships || [];
  const events = [];
  if (!traffic?.enabled || flightState?.landed) {
    ships.forEach(ship => { if (ship.active) cullShip(ship, options); });
    if (traffic) traffic.mapContacts = [];
    return events;
  }
  const playerPos = flightState?.pos || new ThreeRef.Vector3();
  const heavyCombat = Boolean(options.heavyCombat || enemies.filter(enemy => enemy?.userData?.active && !enemy.userData.isFriendly).length >= 3);
  ships.forEach(ship => {
    if (!ship.active || ship.state === CIVILIAN_STATES.DESTROYED) return;
    const distToPlayer = ship.position.distanceTo(playerPos);
    if (distToPlayer > CULL_DISTANCE || ship.position.length() > SYSTEM_RADIUS) {
      cullShip(ship, options);
      return;
    }
    ship.lastSeenTime = now;
    const hostile = nearestHostile(ship, enemies);
    if (heavyCombat && hostile && ship.position.distanceToSquared(hostile.position) < 35 * 35) {
      setDestroyed(ship, options, events);
      return;
    }
    if (hostile || projectileNear(ship, playerBullets) || projectileNear(ship, playerMissiles)) {
      ship.state = CIVILIAN_STATES.FLEE;
      ship.fleeUntil = Math.max(ship.fleeUntil || 0, now + FLEE_DURATION_SECONDS * 1000);
    }
    if (ship.state === CIVILIAN_STATES.DOCKED) {
      ship.dockedUntil -= dt;
      ship.object.visible = false;
      if (ship.dockedUntil <= 0) {
        ship.state = CIVILIAN_STATES.DEPARTING;
        ship.object.visible = true;
      }
    } else if (ship.state === CIVILIAN_STATES.FLEE) {
      updateFlee(ship, ThreeRef, flightState, hostile, dt);
      if (now >= ship.fleeUntil) ship.state = CIVILIAN_STATES.TRANSIT;
    } else {
      if (ship.state === CIVILIAN_STATES.DEPARTING && ship.targetPos && ship.position.distanceTo(ship.targetPos) > ARRIVAL_DISTANCE) {
        ship.state = CIVILIAN_STATES.TRANSIT;
      }
      if (!advanceRoute(ship, ThreeRef, navGraph, dt)) {
        ship.state = CIVILIAN_STATES.DOCKED;
        ship.dockedUntil = DOCKED_SECONDS;
      }
      if (ship.velocity.lengthSq() > 0.0001) ship.object.lookAt?.(ship.position.clone().add(ship.velocity));
    }
    ship.engineGlow.intensity = ship.object.visible ? (ship.state === CIVILIAN_STATES.FLEE ? 0.9 : 0.45) : 0;
  });
  if (traffic) traffic.mapContacts = getCivilianMapData(ships);
  return events;
}

export function disposeCivilians(shipsOrState, options = {}) {
  const ships = Array.isArray(shipsOrState) ? shipsOrState : shipsOrState?.civilianTraffic?.ships;
  ships?.forEach(ship => cullShip(ship, options));
  if (!Array.isArray(shipsOrState) && shipsOrState?.civilianTraffic) {
    shipsOrState.civilianTraffic.ships = [];
    shipsOrState.civilianTraffic.mapContacts = [];
  }
}

export function getCivilianMapData(ships = []) {
  return ships
    .filter(ship => ship?.active && ship.visible && ship.state !== CIVILIAN_STATES.DESTROYED && ship.state !== CIVILIAN_STATES.DOCKED)
    .map(ship => ({
      id: ship.id,
      kind: ship.kind,
      state: ship.state,
      label: ship.mapContact?.label || 'CIV',
      color: ship.state === CIVILIAN_STATES.FLEE ? 0xffcc66 : (ship.mapContact?.color ?? 0x66ccff),
      size: ship.mapContact?.size ?? 2,
      pos: ship.position.clone ? ship.position.clone() : { x: ship.position.x, y: ship.position.y, z: ship.position.z }
    }));
}

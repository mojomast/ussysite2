export const SURFACE_STATES = Object.freeze({
  NONE: 'NONE',
  APPROACH: 'APPROACH',
  ORBITAL: 'ORBITAL',
  LANDING: 'LANDING',
  SURFACE: 'SURFACE',
  DEPARTURE: 'DEPARTURE'
});

const LANDING_SECONDS = 3;
const APPROACH_RADIUS_MULT = 1.6;

function ensureSurface(flightState) {
  if (!flightState.surface || typeof flightState.surface !== 'object') {
    flightState.surface = {
      state: SURFACE_STATES.NONE,
      planetId: null,
      approachDist: 0,
      orbitAltitude: 0,
      landingProgress: 0,
      surfaceY: 0,
      exitQueued: false
    };
  }
  return flightState.surface;
}

function getCoord(source, axis, index) {
  if (!source) return 0;
  if (Array.isArray(source)) return source[index] ?? 0;
  if (Array.isArray(source.pos)) return source.pos[index] ?? 0;
  if (Array.isArray(source.position)) return source.position[index] ?? 0;
  if (source.position && typeof source.position === 'object') return source.position[axis] ?? 0;
  return source[axis] ?? 0;
}

function distance(a, b) {
  const dx = getCoord(a, 'x', 0) - getCoord(b, 'x', 0);
  const dy = getCoord(a, 'y', 1) - getCoord(b, 'y', 1);
  const dz = getCoord(a, 'z', 2) - getCoord(b, 'z', 2);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function planetId(planet) {
  return planet?.userData?.planetId ?? planet?.id ?? null;
}

function planetRadius(planet) {
  return planet?.radius ?? planet?.userData?.radius ?? 0;
}

function planetType(planet) {
  return planet?.type ?? planet?.userData?.type ?? 'unknown';
}

function setVelocity(flightState, scalar = 0) {
  if (typeof flightState?.vel?.set === 'function') flightState.vel.set(scalar, scalar, scalar);
  else if (flightState?.vel) {
    flightState.vel.x = scalar;
    flightState.vel.y = scalar;
    flightState.vel.z = scalar;
  }
}

function dampVelocity(flightState, factor) {
  if (typeof flightState?.vel?.multiplyScalar === 'function') flightState.vel.multiplyScalar(factor);
  else if (flightState?.vel) {
    flightState.vel.x = (flightState.vel.x ?? 0) * factor;
    flightState.vel.y = (flightState.vel.y ?? 0) * factor;
    flightState.vel.z = (flightState.vel.z ?? 0) * factor;
  }
}

function disengageRouteAutopilot(flightState, reason) {
  if (!flightState?.autopilot) return;
  flightState.autopilot.state = 'IDLE';
  flightState.autopilot.route = [];
  flightState.autopilot.hyperspeedMult = 1;
  flightState.autopilot.hyperspeedTarget = 1;
  flightState.autopilot.blockedReason = reason;
}

export function checkPlanetProximity(flightState, planets = []) {
  const surface = ensureSurface(flightState);
  if (surface.state !== SURFACE_STATES.NONE && surface.state !== SURFACE_STATES.APPROACH) return surface;

  let nearest = null;
  for (const planet of planets ?? []) {
    const radius = planetRadius(planet);
    const dist = distance(flightState?.pos, planet?.pos ?? planet?.position);
    if (!nearest || dist < nearest.dist) nearest = { planet, dist, radius };
  }
  if (!nearest?.planet) return surface;

  const approachDist = nearest.radius * APPROACH_RADIUS_MULT;
  if (nearest.dist <= approachDist && surface.state === SURFACE_STATES.NONE) {
    enterApproach(flightState, nearest.planet, nearest.dist);
  }
  return surface;
}

export function enterApproach(flightState, planet, distanceToPlanet = null) {
  const surface = ensureSurface(flightState);
  const radius = planetRadius(planet);
  surface.state = SURFACE_STATES.APPROACH;
  surface.planetId = planetId(planet);
  surface.approachDist = radius * APPROACH_RADIUS_MULT;
  surface.orbitAltitude = radius * 1.2;
  surface.landingProgress = 0;
  surface.surfaceY = getCoord(planet?.pos ?? planet?.position, 'y', 1) + radius;
  surface.exitQueued = false;
  disengageRouteAutopilot(flightState, 'PLANET APPROACH');
  if ((distanceToPlanet ?? distance(flightState?.pos, planet?.pos ?? planet?.position)) <= radius * 1.2) {
    enterOrbital(flightState, planet);
  }
  return surface;
}

export function enterOrbital(flightState, planet) {
  const surface = ensureSurface(flightState);
  const radius = planetRadius(planet);
  surface.state = SURFACE_STATES.ORBITAL;
  surface.planetId = planetId(planet);
  surface.orbitAltitude = radius * 1.2;
  surface.approachDist = radius * APPROACH_RADIUS_MULT;
  surface.surfaceY = getCoord(planet?.pos ?? planet?.position, 'y', 1) + radius;
  dampVelocity(flightState, 0.4);
  return surface;
}

export function beginLanding(flightState, planet) {
  const surface = ensureSurface(flightState);
  surface.state = SURFACE_STATES.LANDING;
  surface.planetId = planetId(planet) ?? surface.planetId;
  surface.landingProgress = 0;
  surface.startY = flightState.pos.y ?? 0;
  surface.preLandingThrust = flightState.thrust ?? 14;
  surface.surfaceY = getCoord(planet?.pos ?? planet?.position, 'y', 1) + planetRadius(planet);
  surface.exitQueued = planetType(planet) === 'hostile';
  flightState.landed = false;
  flightState.throttleEnabled = false;
  flightState.throttleLevel = 0;
  flightState.matchSpeedActive = false;
  flightState.matchSpeedTarget = null;
  disengageRouteAutopilot(flightState, 'LANDING SEQUENCE');
  return surface;
}

export function updateLanding(flightState, planet, dt) {
  const surface = ensureSurface(flightState);
  if (surface.state !== SURFACE_STATES.LANDING) return surface;
  surface.landingProgress = Math.min(1, surface.landingProgress + Math.max(0, dt) / LANDING_SECONDS);
  if (flightState?.pos && Number.isFinite(surface.surfaceY)) {
    flightState.pos.y = surface.startY + (surface.surfaceY - surface.startY) * surface.landingProgress;
  }
  if (surface.landingProgress >= 1) onSurface(flightState, planet);
  return surface;
}

export function onSurface(flightState, planet) {
  const surface = ensureSurface(flightState);
  surface.state = SURFACE_STATES.SURFACE;
  surface.planetId = planetId(planet) ?? surface.planetId;
  surface.landingProgress = 1;
  surface.surfaceY = getCoord(planet?.pos ?? planet?.position, 'y', 1) + planetRadius(planet);
  surface.exitQueued = surface.exitQueued || planetType(planet) === 'hostile';
  flightState.landed = true;
  setVelocity(flightState, 0);
  flightState.throttleEnabled = false;
  flightState.throttleLevel = 0;
  flightState.matchSpeedActive = false;
  flightState.matchSpeedTarget = null;
  return surface;
}

export function beginDeparture(flightState) {
  const surface = ensureSurface(flightState);
  surface.state = SURFACE_STATES.DEPARTURE;
  surface.landingProgress = 1;
  surface.exitQueued = false;
  flightState.landed = false;
  flightState.currentDockedProject = null;
  flightState.thrust = Number.isFinite(surface.preLandingThrust) ? surface.preLandingThrust : 14;
  if (typeof flightState.keys?.clear === 'function') flightState.keys.clear();
  return surface;
}

export function cancelSurfaceApproach(flightState) {
  const surface = ensureSurface(flightState);
  surface.state = SURFACE_STATES.NONE;
  surface.planetId = null;
  surface.approachDist = 0;
  surface.orbitAltitude = 0;
  surface.landingProgress = 0;
  surface.surfaceY = 0;
  surface.exitQueued = false;
  flightState.landed = false;
  return surface;
}

export function updateSurface(flightState, planets = [], dt = 0) {
  const surface = ensureSurface(flightState);
  const planet = planets.find(item => planetId(item) === surface.planetId) ?? null;
  if (surface.state === SURFACE_STATES.NONE || surface.state === SURFACE_STATES.APPROACH) checkPlanetProximity(flightState, planets);
  if (surface.state === SURFACE_STATES.APPROACH && planet) {
    if (distance(flightState?.pos, planet?.pos ?? planet?.position) <= planetRadius(planet) * 1.2) enterOrbital(flightState, planet);
  } else if (surface.state === SURFACE_STATES.LANDING) {
    updateLanding(flightState, planet, dt);
  } else if (surface.state === SURFACE_STATES.SURFACE && surface.exitQueued) {
    beginDeparture(flightState);
  } else if (surface.state === SURFACE_STATES.DEPARTURE) {
    surface.landingProgress = Math.max(0, surface.landingProgress - Math.max(0, dt) / LANDING_SECONDS);
    if (surface.landingProgress <= 0) {
      surface.state = SURFACE_STATES.NONE;
      surface.planetId = null;
      surface.approachDist = 0;
      surface.orbitAltitude = 0;
      surface.surfaceY = 0;
      surface.exitQueued = false;
      flightState.landed = false;
    }
  }
  return surface;
}

export function getSurfaceServices(planet) {
  const type = planetType(planet);
  if (type === 'homeworld') {
    return [
      { id: 'repair', label: 'Repair', available: true },
      { id: 'refuel', label: 'Refuel', available: true },
      { id: 'missions', label: 'Missions', available: true },
      { id: 'trade', label: 'Trade', available: true },
      { id: 'save', label: 'Save', available: true }
    ];
  }
  if (type === 'hostile') return [{ id: 'combat_encounter', label: 'Combat Encounter', available: true }];
  if (type === 'trading') {
    return [
      { id: 'trade', label: 'Trade', available: true },
      { id: 'missions', label: 'Missions', available: true },
      { id: 'refuel', label: 'Refuel', available: true }
    ];
  }
  if (type === 'anomaly') return [{ id: 'special_event', label: 'Special Event', available: true }];
  return [];
}

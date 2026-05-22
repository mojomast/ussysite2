import { LOD_FAR, LOD_MID, PLANETS } from './world.js';

export const PLANET_ATMOSPHERE_TAG = 'flight-planet-atmosphere';

function setObjectPosition(object, pos = [0, 0, 0]) {
  const [x = 0, y = 0, z = 0] = pos;
  if (typeof object.position?.set === 'function') {
    object.position.set(x, y, z);
  } else {
    object.position = { x, y, z };
  }
}

function getCoord(source, axis, index) {
  if (!source) return 0;
  if (Array.isArray(source)) return source[index] ?? 0;
  if (Array.isArray(source.pos)) return source.pos[index] ?? 0;
  if (Array.isArray(source.position)) return source.position[index] ?? 0;
  if (source.position && typeof source.position === 'object') return source.position[axis] ?? 0;
  return source[axis] ?? 0;
}

function createPlanetMesh(planetDef, THREE, widthSegments, heightSegments) {
  const geometry = new THREE.SphereGeometry(planetDef.radius, widthSegments, heightSegments);
  const material = new THREE.MeshBasicMaterial({
    color: planetDef.color,
    wireframe: false
  });
  return new THREE.Mesh(geometry, material);
}

export function createPlanet(planetDef, THREE) {
  if (!planetDef) throw new Error('createPlanet requires a planet definition');
  if (!THREE) throw new Error('createPlanet requires THREE');

  const lod = new THREE.LOD();
  lod.addLevel(createPlanetMesh(planetDef, THREE, 48, 32), 0);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 16, 12), LOD_MID);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 6, 4), LOD_FAR);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(planetDef.radius * 1.04, 48, 32),
    new THREE.MeshBasicMaterial({
      color: planetDef.atmosphereColor,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.18
    })
  );
  atmosphere.name = PLANET_ATMOSPHERE_TAG;
  atmosphere.userData = {
    ...(atmosphere.userData ?? {}),
    isPlanetAtmosphere: true,
    planetId: planetDef.id
  };
  lod.add(atmosphere);

  setObjectPosition(lod, planetDef.pos);
  lod.userData = {
    ...(lod.userData ?? {}),
    planetId: planetDef.id,
    type: planetDef.type,
    radius: planetDef.radius,
    isPlanet: true
  };

  return lod;
}

export function createAllPlanets(scene, THREE) {
  if (!scene) throw new Error('createAllPlanets requires a scene');
  const planets = PLANETS.map(planetDef => createPlanet(planetDef, THREE));
  for (const planet of planets) scene.add(planet);
  return planets;
}

export function updatePlanetLOD(planets, camera) {
  for (const planet of planets ?? []) {
    planet?.update?.(camera);
  }
}

export function getNearestBody(playerPos, bodies, maxDist = Infinity) {
  let nearest = null;
  const px = getCoord(playerPos, 'x', 0);
  const py = getCoord(playerPos, 'y', 1);
  const pz = getCoord(playerPos, 'z', 2);

  for (const body of bodies ?? []) {
    const dx = getCoord(body, 'x', 0) - px;
    const dy = getCoord(body, 'y', 1) - py;
    const dz = getCoord(body, 'z', 2) - pz;
    const dist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    if (dist <= maxDist && (!nearest || dist < nearest.dist)) {
      nearest = { body, dist };
    }
  }

  return nearest;
}

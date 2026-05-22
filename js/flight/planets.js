import { LOD_FAR, LOD_MID, PLANETS, worldToThree } from './world.js';

export const PLANET_ATMOSPHERE_TAG = 'flight-planet-atmosphere';

function getThree() {
  if (globalThis.THREE?.Vector3) return globalThis.THREE;
  return {
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

  const worldPos = worldToThree(planetDef.pos, THREE);
  if (typeof lod.position?.copy === 'function') lod.position.copy(worldPos);
  else if (typeof lod.position?.set === 'function') lod.position.set(worldPos.x, worldPos.y, worldPos.z);
  else lod.position = worldPos;
  lod.userData = {
    ...(lod.userData ?? {}),
    id: planetDef.id,
    name: planetDef.name,
    pos: planetDef.pos,
    planetId: planetDef.id,
    type: planetDef.type,
    radius: planetDef.radius,
    hasStation: planetDef.hasStation,
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
  const THREE = getThree();
  const playerVector = (playerPos?.isVector3 || typeof playerPos?.distanceTo === 'function')
    ? playerPos
    : worldToThree(playerPos, THREE);

  for (const body of bodies ?? []) {
    const bodyPos = body?.pos ?? body?.position;
    if (!bodyPos) continue;
    const bodyVector = (bodyPos?.isVector3 || typeof bodyPos?.distanceTo === 'function')
      ? bodyPos
      : worldToThree(bodyPos, THREE);
    const dist = playerVector.distanceTo(bodyVector);
    if (dist <= maxDist && (!nearest || dist < nearest.dist)) {
      nearest = { body, dist };
    }
  }

  return nearest;
}

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

function createPlanetSurfaceTexture(planetDef, THREE) {
  if (typeof document === 'undefined' || typeof THREE.CanvasTexture !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const base = `#${planetDef.color.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const band = Math.sin((y / 256) * Math.PI * 8 + planetDef.id.length) * 18;
      const noise = Math.sin((x * 12.9898 + y * 78.233 + planetDef.radius) * 43758.5453) * 28;
      const shade = Math.max(-44, Math.min(52, band + noise));
      ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${Math.abs(shade) / 255})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createPlanetMesh(planetDef, THREE, widthSegments, heightSegments) {
  const geometry = new THREE.SphereGeometry(planetDef.radius, widthSegments, heightSegments);
  const surfaceTexture = createPlanetSurfaceTexture(planetDef, THREE);
  const Material = THREE.MeshStandardMaterial || THREE.MeshLambertMaterial || THREE.MeshBasicMaterial;
  const material = new Material({
    color: planetDef.color,
    map: surfaceTexture || undefined,
    roughness: 0.92,
    metalness: 0,
    wireframe: false
  });
  return new THREE.Mesh(geometry, material);
}

function createAtmosphereMaterial(planetDef, THREE) {
  if (typeof THREE.ShaderMaterial !== 'function') {
    return new THREE.MeshBasicMaterial({
      color: planetDef.atmosphereColor,
      side: THREE.FrontSide ?? THREE.BackSide,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }
  // Fresnel rim shader: keeps atmosphere visible only around the silhouette,
  // preventing the old full-sphere glow dome from hiding the planet surface.
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(planetDef.atmosphereColor) },
      uOpacity: { value: 0.16 },
      uPower: { value: 3.2 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uPower);
        gl_FragColor = vec4(uColor, rim * uOpacity);
      }
    `,
    side: THREE.FrontSide ?? THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

export function createPlanet(planetDef, THREE, positionScale = 1) {
  if (!planetDef) throw new Error('createPlanet requires a planet definition');
  if (!THREE) throw new Error('createPlanet requires THREE');

  const lod = new THREE.LOD();
  lod.addLevel(createPlanetMesh(planetDef, THREE, 48, 32), 0);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 16, 12), LOD_MID);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 6, 4), LOD_FAR);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(planetDef.radius * 1.025, 48, 32),
    createAtmosphereMaterial(planetDef, THREE)
  );
  atmosphere.name = PLANET_ATMOSPHERE_TAG;
  atmosphere.userData = {
    ...(atmosphere.userData ?? {}),
    isPlanetAtmosphere: true,
    planetId: planetDef.id
  };
  lod.add(atmosphere);

  const worldPos = worldToThree(planetDef.pos, THREE, positionScale);
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

export function createAllPlanets(scene, THREE, positionScale = 1) {
  if (!scene) throw new Error('createAllPlanets requires a scene');
  const planets = PLANETS.map(planetDef => createPlanet(planetDef, THREE, positionScale));
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

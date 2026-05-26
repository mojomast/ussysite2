import { LOD_FAR, LOD_MID, PLANETS, worldToThree } from './world.js';

export const PLANET_ATMOSPHERE_TAG = 'flight-planet-atmosphere';
export const PLANET_CLOUDS_TAG = 'flight-planet-clouds';

const PLANET_TEXTURE_SIZE = 512;

function hashNoise(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = smoothstep(x - x0);
  const yf = smoothstep(y - y0);
  const a = hashNoise(x0, y0, seed);
  const b = hashNoise(x0 + 1, y0, seed);
  const c = hashNoise(x0, y0 + 1, seed);
  const d = hashNoise(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * xf;
  const bottom = c + (d - c) * xf;
  return top + (bottom - top) * yf;
}

function fractalNoise(x, y, seed, octaves = 5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + i * 19.19) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }
  return value / Math.max(0.0001, normalizer);
}

function planetSeed(planetDef) {
  const id = String(planetDef.id ?? planetDef.name ?? 'planet');
  let seed = planetDef.radius || 1;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) % 100000;
  return seed / 997;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function colorTriplet(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function blendColor(a, b, t) {
  return [Math.round(mix(a[0], b[0], t)), Math.round(mix(a[1], b[1], t)), Math.round(mix(a[2], b[2], t))];
}

function chooseSurfaceColor(planetDef, elevation, moisture, latitude, detail) {
  const base = colorTriplet(planetDef.color ?? 0x6688aa);
  const ocean = blendColor([10, 36, 82], base, 0.18);
  const shelf = blendColor([18, 82, 122], base, 0.24);
  const lowland = blendColor([42, 116, 58], base, 0.22);
  const dryland = blendColor([132, 105, 58], base, 0.26);
  const highland = blendColor([112, 96, 78], base, 0.3);
  const mountain = blendColor([188, 182, 166], base, 0.18);
  const ice = [225, 239, 246];

  const polarIce = Math.max(0, (latitude - 0.66) / 0.34);
  const altitudeIce = Math.max(0, (elevation - 0.72) / 0.28);
  const iceT = Math.max(polarIce, altitudeIce) * (0.74 + moisture * 0.26);
  let color;
  if (elevation < 0.42) color = elevation < 0.36 ? ocean : shelf;
  else if (elevation < 0.58) color = moisture > 0.46 ? lowland : dryland;
  else if (elevation < 0.76) color = highland;
  else color = mountain;

  color = blendColor(color, ice, Math.min(0.92, iceT));
  const shade = 0.82 + detail * 0.28 + Math.max(0, elevation - 0.55) * 0.18;
  return color.map(channel => Math.max(0, Math.min(255, Math.round(channel * shade))));
}

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
  canvas.width = PLANET_TEXTURE_SIZE;
  canvas.height = PLANET_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(canvas.width, canvas.height);
  const seed = planetSeed(planetDef);
  for (let y = 0; y < canvas.height; y += 1) {
    const v = y / canvas.height;
    const latitude = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      const wrapX = Math.sin(u * Math.PI * 2) * 1.7;
      const wrapY = Math.cos(u * Math.PI * 2) * 1.7;
      const continents = fractalNoise(wrapX + 10.5, v * 3.2 + wrapY, seed, 6);
      const ridges = Math.abs(fractalNoise(wrapX * 2.5 - 3, v * 7.5 + wrapY, seed + 44.4, 4) - 0.5) * 2;
      const moisture = fractalNoise(wrapX * 1.6 + 30, v * 4.8 - wrapY, seed + 92.2, 4);
      const bands = Math.sin((v * 12 + continents * 2.2 + seed) * Math.PI) * 0.035;
      const elevation = Math.max(0, Math.min(1, continents * 0.82 + ridges * 0.22 - latitude * 0.06 + bands));
      const detail = fractalNoise(x * 0.08, y * 0.08, seed + 7.7, 3);
      const [r, g, b] = chooseSurfaceColor(planetDef, elevation, moisture, latitude, detail);
      const index = (y * canvas.width + x) * 4;
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createCloudTexture(planetDef, THREE) {
  if (typeof document === 'undefined' || typeof THREE.CanvasTexture !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(canvas.width, canvas.height);
  const seed = planetSeed(planetDef) + 181.8;
  for (let y = 0; y < canvas.height; y += 1) {
    const v = y / canvas.height;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      const wrapX = Math.sin(u * Math.PI * 2) * 1.4;
      const wrapY = Math.cos(u * Math.PI * 2) * 1.4;
      const wisps = fractalNoise(wrapX * 2 + 6, v * 5 + wrapY, seed, 5);
      const streaks = fractalNoise(wrapX * 5 + v * 2, v * 18, seed + 55, 3);
      const alpha = Math.max(0, Math.min(1, (wisps * 0.78 + streaks * 0.22 - 0.54) * 2.4));
      const index = (y * canvas.width + x) * 4;
      image.data[index] = 255;
      image.data[index + 1] = 255;
      image.data[index + 2] = 255;
      image.data[index + 3] = Math.round(alpha * 155);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createPlanetMesh(planetDef, THREE, widthSegments, heightSegments, surfaceTexture = null) {
  const geometry = new THREE.SphereGeometry(planetDef.radius, widthSegments, heightSegments);
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
      uPower: { value: 3.2 },
      uGlowStrength: { value: 1.15 },
      uHorizonBoost: { value: 0.28 },
      uTime: { value: 0 }
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
      uniform float uGlowStrength;
      uniform float uHorizonBoost;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uPower);
        float pulse = 1.0 + sin(uTime * 0.35) * 0.035;
        float glow = rim * uGlowStrength * pulse + rim * rim * uHorizonBoost;
        gl_FragColor = vec4(uColor, glow * uOpacity);
      }
    `,
    side: THREE.FrontSide ?? THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function createCloudShell(planetDef, THREE) {
  const cloudTexture = createCloudTexture(planetDef, THREE);
  const Material = THREE.MeshStandardMaterial || THREE.MeshLambertMaterial || THREE.MeshBasicMaterial;
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(planetDef.radius * 1.012, 48, 32),
    new Material({
      color: 0xffffff,
      map: cloudTexture || undefined,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      roughness: 1,
      metalness: 0
    })
  );
  clouds.name = PLANET_CLOUDS_TAG;
  clouds.userData = {
    ...(clouds.userData ?? {}),
    isPlanetClouds: true,
    planetId: planetDef.id,
    baseOpacity: 0.18,
    approachOpacity: 0.34,
    baseScale: 1,
    approachScale: 1.018
  };
  return clouds;
}

export function createPlanet(planetDef, THREE, positionScale = 1) {
  if (!planetDef) throw new Error('createPlanet requires a planet definition');
  if (!THREE) throw new Error('createPlanet requires THREE');

  const lod = new THREE.LOD();
  const surfaceTexture = createPlanetSurfaceTexture(planetDef, THREE);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 48, 32, surfaceTexture), 0);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 16, 12, surfaceTexture), LOD_MID);
  lod.addLevel(createPlanetMesh(planetDef, THREE, 6, 4, surfaceTexture), LOD_FAR);

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
  lod.add(createCloudShell(planetDef, THREE));

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
    isPlanet: true,
    rotationSpeed: 0.018 + (planetSeed(planetDef) % 0.014),
    cloudRotationSpeed: 0.034 + (planetSeed(planetDef) % 0.018)
  };

  return lod;
}

export function createAllPlanets(scene, THREE, positionScale = 1) {
  if (!scene) throw new Error('createAllPlanets requires a scene');
  const planets = PLANETS.map(planetDef => createPlanet(planetDef, THREE, positionScale));
  for (const planet of planets) scene.add(planet);
  return planets;
}

function rotateObjectY(object, amount) {
  if (!object || !Number.isFinite(amount)) return;
  if (!object.rotation) object.rotation = { x: 0, y: 0, z: 0 };
  object.rotation.y = (object.rotation.y || 0) + amount;
}

export function updatePlanetLOD(planets, camera, dt = 0) {
  const frameDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.2)) : 0;
  for (const planet of planets ?? []) {
    planet?.update?.(camera);
    if (frameDt <= 0) continue;
    rotateObjectY(planet, (planet.userData?.rotationSpeed ?? 0.02) * frameDt);
    const clouds = planet.children?.find(child => child.userData?.isPlanetClouds);
    rotateObjectY(clouds, (planet.userData?.cloudRotationSpeed ?? 0.04) * frameDt);
    const atmosphere = planet.children?.find(child => child.userData?.isPlanetAtmosphere);
    if (atmosphere?.material?.uniforms?.uTime) atmosphere.material.uniforms.uTime.value += frameDt;
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

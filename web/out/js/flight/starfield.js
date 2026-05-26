import { PLANETS, SYSTEM_RADIUS, worldToThree } from './world.js';

export const STARFIELD_COUNT = 8000;
export const STARFIELD_RADIUS = SYSTEM_RADIUS * 1.8;
export const STARFIELD_TAG = 'flight-system-starfield';
const WARP_STREAK_COUNT = 900;

const STAR_SIZE_TIERS = [
  { threshold: 0.70, size: 0.8 },
  { threshold: 0.95, size: 1.4 },
  { threshold: 1.00, size: 2.2 }
];

const STAR_COLORS = [
  { threshold: 0.82, color: 0xffffff },
  { threshold: 0.97, color: 0xaaccff },
  { threshold: 1.00, color: 0xffddaa }
];

export function pickStarSize(randomValue) {
  return STAR_SIZE_TIERS.find(tier => randomValue < tier.threshold)?.size ?? STAR_SIZE_TIERS.at(-1).size;
}

export function pickStarColor(randomValue) {
  return STAR_COLORS.find(entry => randomValue < entry.threshold)?.color ?? STAR_COLORS.at(-1).color;
}

function getThree(Three) {
  if (Three?.Vector3) return Three;
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

export function isPositionExcludedFromPlanets(x, y, z, planets = PLANETS, Three = globalThis.THREE) {
  const ThreeRef = getThree(Three);
  const point = worldToThree([x, y, z], ThreeRef);
  for (const planet of planets) {
    const minDistance = planet.radius * 2;
    if (point.distanceTo(worldToThree(planet.pos, ThreeRef)) < minDistance) return true;
  }
  return false;
}

export function randomPointInSphere(radius, random = Math.random) {
  const distance = Math.cbrt(random()) * radius;
  const theta = random() * Math.PI * 2;
  const zUnit = (random() * 2) - 1;
  const xy = Math.sqrt(Math.max(0, 1 - zUnit * zUnit));
  return [
    distance * xy * Math.cos(theta),
    distance * zUnit,
    distance * xy * Math.sin(theta)
  ];
}

export function generateStarfieldData({
  count = STARFIELD_COUNT,
  radius = STARFIELD_RADIUS,
  planets = PLANETS,
  random = Math.random,
  Three
} = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color = Three ? new Three.Color() : null;

  for (let i = 0; i < count; i += 1) {
    let point = randomPointInSphere(radius, random);
    let attempts = 0;
    while (isPositionExcludedFromPlanets(point[0], point[1], point[2], planets, Three) && attempts < 100) {
      point = randomPointInSphere(radius, random);
      attempts += 1;
    }

    const offset = i * 3;
    positions[offset] = point[0];
    positions[offset + 1] = point[1];
    positions[offset + 2] = point[2];
    sizes[i] = pickStarSize(random());

    const colorValue = pickStarColor(random());
    if (color) {
      color.set(colorValue);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    } else {
      colors[offset] = ((colorValue >> 16) & 255) / 255;
      colors[offset + 1] = ((colorValue >> 8) & 255) / 255;
      colors[offset + 2] = (colorValue & 255) / 255;
    }
  }

  return { positions, colors, sizes, count, radius };
}

export function createStarfield(scene, Three) {
  if (!scene) throw new Error('createStarfield requires a scene');
  if (!Three) throw new Error('createStarfield requires THREE');

  const data = generateStarfieldData({ Three });
  const geometry = new Three.BufferGeometry();
  geometry.setAttribute('position', new Three.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new Three.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new Three.BufferAttribute(data.sizes, 1));

  const material = new Three.ShaderMaterial({
    uniforms: {
      uWarp: { value: 0 }
    },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `
      attribute float size;
      uniform float uWarp;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (1.0 + uWarp * 2.8);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uWarp;
      varying vec3 vColor;
      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        if (dot(centered, centered) > 0.25) discard;
        float core = 1.0 - smoothstep(0.0, 0.25, dot(centered, centered));
        vec3 warpGlow = vec3(0.62, 0.82, 1.0) * uWarp * (0.35 + core * 0.9);
        gl_FragColor = vec4(vColor * (1.0 + uWarp * 1.4) + warpGlow, 1.0);
      }
    `
  });

  const points = new Three.Points(geometry, material);
  points.name = STARFIELD_TAG;
  points.userData.starfieldTag = STARFIELD_TAG;
  points.frustumCulled = false;
  scene.add(points);

  const streakGeometry = new Three.BufferGeometry();
  const streakPositions = new Float32Array(WARP_STREAK_COUNT * 6);
  streakGeometry.setAttribute('position', new Three.BufferAttribute(streakPositions, 3));
  const streakMaterial = new Three.LineBasicMaterial({
    color: 0xdce7ff,
    transparent: true,
    opacity: 0,
    blending: Three.AdditiveBlending,
    depthWrite: false
  });
  const streaks = new Three.LineSegments(streakGeometry, streakMaterial);
  streaks.name = `${STARFIELD_TAG}-warp-streaks`;
  streaks.userData.starfieldTag = STARFIELD_TAG;
  streaks.frustumCulled = false;
  streaks.visible = false;
  scene.add(streaks);

  function updateStreaks(flightDir, hyperspeedMult = 1) {
    if (!flightDir) return;
    const warp = Math.min(1, Math.max(0, (hyperspeedMult - 1) / 79));
    const length = 18 + warp * 220;
    const stride = Math.max(1, Math.floor(data.count / WARP_STREAK_COUNT));
    for (let i = 0; i < WARP_STREAK_COUNT; i += 1) {
      const starIndex = (i * stride) % data.count;
      const source = starIndex * 3;
      const target = i * 6;
      const x = data.positions[source];
      const y = data.positions[source + 1];
      const z = data.positions[source + 2];
      streakPositions[target] = x;
      streakPositions[target + 1] = y;
      streakPositions[target + 2] = z;
      streakPositions[target + 3] = x - flightDir.x * length;
      streakPositions[target + 4] = y - flightDir.y * length;
      streakPositions[target + 5] = z - flightDir.z * length;
    }
    streakGeometry.attributes.position.needsUpdate = true;
  }

  let disposed = false;
  return {
    points,
    geometry,
    material,
    positions: data.positions,
    colors: data.colors,
    sizes: data.sizes,
    streaks,
    updateStreaks,
    count: data.count,
    radius: data.radius,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(points);
      scene.remove(streaks);
      geometry.dispose?.();
      material.dispose?.();
      streakGeometry.dispose?.();
      streakMaterial.dispose?.();
    }
  };
}

export function disposeStarfield(scene) {
  if (!scene?.children) return 0;
  const starfields = scene.children.filter(child => child?.userData?.starfieldTag === STARFIELD_TAG);
  for (const starfield of starfields) {
    scene.remove(starfield);
    starfield.geometry?.dispose?.();
    starfield.material?.dispose?.();
  }
  return starfields.length;
}

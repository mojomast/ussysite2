import { PLANETS, SYSTEM_RADIUS } from './world.js';

export const STARFIELD_COUNT = 8000;
export const STARFIELD_RADIUS = SYSTEM_RADIUS * 1.8;
export const STARFIELD_TAG = 'flight-system-starfield';

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

export function isPositionExcludedFromPlanets(x, y, z, planets = PLANETS) {
  for (const planet of planets) {
    const [px, py, pz] = planet.pos;
    const minDistance = planet.radius * 2;
    const dx = x - px;
    const dy = y - py;
    const dz = z - pz;
    if ((dx * dx + dy * dy + dz * dz) < minDistance * minDistance) return true;
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
    while (isPositionExcludedFromPlanets(point[0], point[1], point[2], planets) && attempts < 100) {
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
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        if (dot(centered, centered) > 0.25) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `
  });

  const points = new Three.Points(geometry, material);
  points.name = STARFIELD_TAG;
  points.userData.starfieldTag = STARFIELD_TAG;
  points.frustumCulled = false;
  scene.add(points);

  let disposed = false;
  return {
    points,
    geometry,
    material,
    positions: data.positions,
    colors: data.colors,
    sizes: data.sizes,
    count: data.count,
    radius: data.radius,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(points);
      geometry.dispose?.();
      material.dispose?.();
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

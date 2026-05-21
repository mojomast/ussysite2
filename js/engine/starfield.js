export function createRadialGlowTexture({
  THREE: Three = THREE,
  documentRef = document,
  inner = 'rgba(255,255,255,0.95)',
  mid = 'rgba(0,240,255,0.35)',
  outer = 'rgba(0,0,0,0)',
  size = 256
} = {}) {
  const canvas = documentRef.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.38, mid);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new Three.CanvasTexture(canvas);
}

export function createNebulaSprite({ THREE: Three = THREE, scene, texture, color, opacity, position, scale } = {}) {
  const sprite = new Three.Sprite(new Three.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: Three.AdditiveBlending,
    depthWrite: false,
    fog: false
  }));
  sprite.position.copy(position);
  sprite.scale.setScalar(scale);
  scene.add(sprite);
  return sprite;
}

export function createDeepSpaceEffects({
  THREE: Three = THREE,
  documentRef = document,
  scene,
  prefersReducedMotion = false,
  isCoarsePointer = false,
  flightTempVec,
  createDebrisField = null,
  createDustField = null
} = {}) {
  const starCount = prefersReducedMotion ? 900 : (isCoarsePointer ? 1100 : 2400);
  const starGeo = new Three.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const starCanvas = documentRef.createElement('canvas');
  starCanvas.width = 32;
  starCanvas.height = 32;
  const starCtx = starCanvas.getContext('2d');
  const starGrad = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  starGrad.addColorStop(0, 'rgba(255,255,255,1)');
  starGrad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  starGrad.addColorStop(1, 'rgba(255,255,255,0)');
  starCtx.fillStyle = starGrad;
  starCtx.fillRect(0, 0, 32, 32);
  const starTexture = new Three.CanvasTexture(starCanvas);
  const colorPalette = [
    new Three.Color(0xdce7ff),
    new Three.Color(0xf4f0df),
    new Three.Color(0xb8caff),
    new Three.Color(0xffdfb0)
  ];

  for (let i = 0; i < starCount; i += 1) {
    const radius = 28 + Math.pow(Math.random(), 0.45) * 92;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const intensity = 0.45 + Math.pow(Math.random(), 3) * 0.55;
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }

  starGeo.setAttribute('position', new Three.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new Three.BufferAttribute(colors, 3));
  const starField = new Three.Points(
    starGeo,
    new Three.PointsMaterial({
      size: isCoarsePointer ? 0.55 : 0.42,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.95,
      blending: Three.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  starField.userData.parallax = 0.12;
  scene.add(starField);

  const bandCount = prefersReducedMotion ? 360 : (isCoarsePointer ? 520 : 1200);
  const bandGeo = new Three.BufferGeometry();
  const bandPositions = new Float32Array(bandCount * 3);
  const bandColors = new Float32Array(bandCount * 3);
  const bandColorA = new Three.Color(0x9fb2df);
  const bandColorB = new Three.Color(0xf0d4aa);

  for (let i = 0; i < bandCount; i += 1) {
    const spread = (Math.random() - 0.5) * 86;
    const thickness = (Math.random() - 0.5) * (5 + Math.random() * 9);
    const depth = -58 - Math.random() * 36;
    bandPositions[i * 3] = spread;
    bandPositions[i * 3 + 1] = thickness + Math.sin(spread * 0.08) * 3.5;
    bandPositions[i * 3 + 2] = depth + (Math.random() - 0.5) * 18;

    const color = Math.random() > 0.72 ? bandColorB : bandColorA;
    const intensity = 0.18 + Math.pow(Math.random(), 2) * 0.34;
    bandColors[i * 3] = color.r * intensity;
    bandColors[i * 3 + 1] = color.g * intensity;
    bandColors[i * 3 + 2] = color.b * intensity;
  }

  bandGeo.setAttribute('position', new Three.BufferAttribute(bandPositions, 3));
  bandGeo.setAttribute('color', new Three.BufferAttribute(bandColors, 3));
  const milkyWayField = new Three.Points(
    bandGeo,
    new Three.PointsMaterial({
      size: isCoarsePointer ? 0.85 : 0.7,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.42,
      blending: Three.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  milkyWayField.rotation.z = -0.38;
  milkyWayField.rotation.y = 0.18;
  milkyWayField.userData.parallax = 0.4;
  scene.add(milkyWayField);

  const brightCount = prefersReducedMotion ? 10 : (isCoarsePointer ? 14 : 30);
  const brightGeo = new Three.BufferGeometry();
  const brightPositions = new Float32Array(brightCount * 3);
  const brightColors = new Float32Array(brightCount * 3);

  for (let i = 0; i < brightCount; i += 1) {
    const radius = 42 + Math.random() * 76;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    brightPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    brightPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    brightPositions[i * 3 + 2] = radius * Math.cos(phi);

    const color = Math.random() > 0.5 ? new Three.Color(0xfff2cf) : new Three.Color(0xd9e7ff);
    brightColors[i * 3] = color.r;
    brightColors[i * 3 + 1] = color.g;
    brightColors[i * 3 + 2] = color.b;
  }

  brightGeo.setAttribute('position', new Three.BufferAttribute(brightPositions, 3));
  brightGeo.setAttribute('color', new Three.BufferAttribute(brightColors, 3));
  const brightStarField = new Three.Points(
    brightGeo,
    new Three.PointsMaterial({
      size: isCoarsePointer ? 1.65 : 1.25,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.86,
      blending: Three.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  brightStarField.userData.parallax = 1.0;
  scene.add(brightStarField);

  const nebulaTextureA = createRadialGlowTexture({
    THREE: Three,
    documentRef,
    inner: 'rgba(255,255,255,0.6)',
    mid: 'rgba(138,80,255,0.28)',
    outer: 'rgba(0,0,0,0)',
    size: 512
  });
  const nebulaTextureB = createRadialGlowTexture({
    THREE: Three,
    documentRef,
    inner: 'rgba(255,255,255,0.5)',
    mid: 'rgba(0,240,255,0.22)',
    outer: 'rgba(0,0,0,0)',
    size: 512
  });
  createNebulaSprite({ THREE: Three, scene, texture: nebulaTextureA, color: 0xb026ff, opacity: 0.12, position: flightTempVec.set(-54, 24, -78), scale: 96 });
  createNebulaSprite({ THREE: Three, scene, texture: nebulaTextureB, color: 0x00f0ff, opacity: 0.09, position: flightTempVec.set(68, -18, -92), scale: 124 });

  if (typeof createDebrisField === 'function') createDebrisField();
  if (typeof createDustField === 'function') createDustField();

  const dataRibbonGroup = new Three.Group();
  const ribbonCount = prefersReducedMotion || isCoarsePointer ? 0 : 1;
  for (let i = 0; i < ribbonCount; i += 1) {
    const points = [];
    const radius = 4.5 + i * 2.2;
    for (let step = 0; step <= 180; step += 1) {
      const angle = step * 0.08 + i;
      points.push(new Three.Vector3(
        Math.cos(angle) * radius,
        Math.sin(step * 0.12 + i) * 0.7,
        Math.sin(angle) * radius
      ));
    }
    const ribbonGeo = new Three.BufferGeometry().setFromPoints(points);
    const ribbonMat = new Three.LineBasicMaterial({
      color: i % 2 ? 0xff0055 : 0x00f0ff,
      transparent: true,
      opacity: 0.025
    });
    dataRibbonGroup.add(new Three.Line(ribbonGeo, ribbonMat));
  }
  scene.add(dataRibbonGroup);

  return { starField, milkyWayField, brightStarField, dataRibbonGroup };
}

export function animateDeepSpaceEffects({ starField, milkyWayField, brightStarField, dataRibbonGroup, prefersReducedMotion = false } = {}) {
  if (prefersReducedMotion) return;
  if (starField) {
    starField.rotation.y += 0.00008;
    starField.rotation.x += 0.00003;
  }
  if (milkyWayField) milkyWayField.rotation.y += 0.000025;
  if (brightStarField) brightStarField.rotation.y -= 0.000045;
  if (dataRibbonGroup) dataRibbonGroup.rotation.y -= 0.00018;
}

export function updateDeepSpaceAnchor({ starField, milkyWayField, brightStarField, camera, flightState, isFlightActive = false, flightUniverseScale = 1 } = {}) {
  const scale = isFlightActive ? flightUniverseScale : 1;
  const followCamera = isFlightActive;
  [starField, milkyWayField, brightStarField].forEach(field => {
    if (!field) return;
    if (field.userData.baseSize === undefined) field.userData.baseSize = field.material.size;
    if (followCamera) {
      const parallax = field.userData.parallax ?? 1;
      field.position.copy(camera.position).addScaledVector(flightState.pos, -(1 - parallax));
    } else {
      field.position.set(0, 0, 0);
    }
    field.scale.setScalar(scale);
    field.material.size = field.userData.baseSize * scale;
  });
}

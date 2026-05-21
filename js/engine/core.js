export let selectionRing = null;

export function createHolographicCore({
  THREE: Three = THREE,
  documentRef = document,
  scene,
  coreGroup,
  prefersReducedMotion = false,
  isCoarsePointer = false
} = {}) {
  const innerGeo = new Three.IcosahedronGeometry(2, 2);
  const innerMat = new Three.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const coreMesh = new Three.Mesh(innerGeo, innerMat);
  coreGroup.add(coreMesh);

  const particleGeo = new Three.BufferGeometry();
  const particleCount = prefersReducedMotion || isCoarsePointer ? 260 : 380;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 2.2 + Math.random() * 0.5;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  particleGeo.setAttribute('position', new Three.BufferAttribute(positions, 3));

  const pCanvas = documentRef.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');
  const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 16, 16);
  const pTexture = new Three.CanvasTexture(pCanvas);

  const particleMat = new Three.PointsMaterial({
    color: 0x00f0ff,
    size: 0.15,
    transparent: true,
    opacity: 0.55,
    map: pTexture,
    blending: Three.AdditiveBlending,
    depthWrite: false
  });

  const coreOuterParticles = new Three.Points(particleGeo, particleMat);
  coreGroup.add(coreOuterParticles);

  const ringGeo = new Three.TorusGeometry(1.05, 0.018, 8, 96);
  const ringMat = new Three.MeshBasicMaterial({
    color: 0xff0055,
    transparent: true,
    opacity: 0,
    blending: Three.AdditiveBlending,
    depthWrite: false
  });
  selectionRing = new Three.Mesh(ringGeo, ringMat);
  selectionRing.visible = false;
  scene.add(selectionRing);

  return { coreMesh, coreOuterParticles, selectionRing };
}

export function animateHolographicCore({ coreMesh, coreOuterParticles, time = 0, prefersReducedMotion = false } = {}) {
  if (!coreMesh || !coreOuterParticles) return;
  if (!prefersReducedMotion) {
    coreMesh.rotation.y += 0.002;
    coreMesh.rotation.x += 0.0008;
    coreOuterParticles.rotation.y -= 0.0006;
    coreOuterParticles.rotation.x -= 0.0003;
  }
  const pulseScale = prefersReducedMotion ? 1 : 1 + Math.sin(time * 0.0015) * 0.04;
  coreMesh.scale.setScalar(pulseScale);
}

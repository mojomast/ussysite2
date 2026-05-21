export let scene = null;
export let camera = null;
export let renderer = null;
export let pointLight1 = null;
export let pointLight2 = null;

export function getRenderPixelRatio(isCoarsePointer = false, devicePixelRatio = window.devicePixelRatio || 1) {
  return Math.min(devicePixelRatio, isCoarsePointer ? 1 : 1.25);
}

export function createAmbientLighting(targetScene = scene, { THREE: Three = THREE } = {}) {
  const ambientLight = new Three.AmbientLight(0x0e172e, 1.5);
  targetScene.add(ambientLight);
  pointLight1 = new Three.PointLight(0x00f0ff, 2.5, 30);
  pointLight1.position.set(0, 0, 0);
  targetScene.add(pointLight1);
  pointLight2 = new Three.PointLight(0xff0055, 1.5, 40);
  pointLight2.position.set(10, 10, 10);
  targetScene.add(pointLight2);
  return { ambientLight, pointLight1, pointLight2 };
}

export function initScene(canvasContainer, { THREE: Three = THREE, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
  scene = new Three.Scene();
  scene.fog = new Three.FogExp2(0x03060f, 0.02);
  camera = new Three.PerspectiveCamera(60, width / height, 0.1, 1000);
  renderer = new Three.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  renderer.setSize(width, height);
  if (Three.sRGBEncoding) renderer.outputEncoding = Three.sRGBEncoding;
  canvasContainer.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-viewport';
  return { scene, camera, renderer };
}

export function resizeScene({ camera: targetCamera = camera, renderer: targetRenderer = renderer, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
  if (!targetCamera || !targetRenderer) return;
  targetCamera.aspect = width / height;
  targetCamera.updateProjectionMatrix();
  targetRenderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  targetRenderer.setSize(width, height);
}

export function onWindowResize(isCoarsePointer = false) {
  resizeScene({ isCoarsePointer });
}

export let scene = null;
export let camera = null;
export let renderer = null;

export function getRenderPixelRatio(isCoarsePointer = false, devicePixelRatio = window.devicePixelRatio || 1) {
  return Math.min(devicePixelRatio, isCoarsePointer ? 1 : 1.25);
}

export function initRendererScene(canvasContainer, { THREE: Three = THREE, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
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

export function resizeRenderer({ camera: targetCamera = camera, renderer: targetRenderer = renderer, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
  if (!targetCamera || !targetRenderer) return;
  targetCamera.aspect = width / height;
  targetCamera.updateProjectionMatrix();
  targetRenderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  targetRenderer.setSize(width, height);
}

export function onWindowResize(isCoarsePointer = false) {
  resizeRenderer({ isCoarsePointer });
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

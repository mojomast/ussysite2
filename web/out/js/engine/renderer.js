export let scene = null;
export let camera = null;
export let renderer = null;
let renderPixelRatioSetting = 'auto';

export function getRenderPixelRatio(isCoarsePointer = false, devicePixelRatio = window.devicePixelRatio || 1) {
  if (renderPixelRatioSetting !== 'auto') return Number(renderPixelRatioSetting) || 1;
  return Math.min(devicePixelRatio, isCoarsePointer ? 1 : 1.25);
}

export function setRenderPixelRatio(value = 'auto') {
  const setting = String(value);
  renderPixelRatioSetting = ['auto', '1', '1.5', '2'].includes(setting) ? setting : 'auto';
  return renderPixelRatioSetting;
}

export function initRendererScene(canvasContainer, { THREE: Three = THREE, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
  scene = new Three.Scene();
  scene.fog = new Three.FogExp2(0x03060f, 0.008);
  camera = new Three.PerspectiveCamera(72, width / height, 0.1, 1000);
  renderer = new Three.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  renderer.setSize(width, height);
  renderer.toneMapping = Three.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  if (Three.SRGBColorSpace) renderer.outputColorSpace = Three.SRGBColorSpace;
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

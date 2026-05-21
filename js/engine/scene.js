export let scene = null;
export let camera = null;
export let renderer = null;
export let pointLight1 = null;
export let pointLight2 = null;

export function getRenderPixelRatio(isCoarsePointer = false) {
  return Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1 : 1.25);
}

export function createAmbientLighting(targetScene = scene) {
  const ambientLight = new THREE.AmbientLight(0x0e172e, 1.5);
  targetScene.add(ambientLight);
  pointLight1 = new THREE.PointLight(0x00f0ff, 2.5, 30);
  pointLight1.position.set(0, 0, 0);
  targetScene.add(pointLight1);
  pointLight2 = new THREE.PointLight(0xff0055, 1.5, 40);
  pointLight2.position.set(10, 10, 10);
  targetScene.add(pointLight2);
}

export function initScene(canvasContainer, { isCoarsePointer = false } = {}) {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060f, 0.02);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  canvasContainer.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-viewport';
  return { scene, camera, renderer };
}

export function onWindowResize(isCoarsePointer = false) {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getRenderPixelRatio(isCoarsePointer));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

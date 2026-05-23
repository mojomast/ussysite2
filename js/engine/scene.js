import {
  camera as rendererCamera,
  getRenderPixelRatio,
  initRendererScene,
  renderer as webglRenderer,
  resizeRenderer,
  setRenderPixelRatio,
  scene as rendererScene
} from './renderer.js';

export { getRenderPixelRatio, setRenderPixelRatio } from './renderer.js';

export let scene = null;
export let camera = null;
export let renderer = null;
export let pointLight1 = null;
export let pointLight2 = null;

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
  ({ scene, camera, renderer } = initRendererScene(canvasContainer, { THREE: Three, isCoarsePointer, width, height }));
  return { scene, camera, renderer };
}

export function resizeScene({ camera: targetCamera = camera, renderer: targetRenderer = renderer, isCoarsePointer = false, width = window.innerWidth, height = window.innerHeight } = {}) {
  resizeRenderer({ camera: targetCamera, renderer: targetRenderer, isCoarsePointer, width, height });
}

export function onWindowResize(isCoarsePointer = false) {
  resizeScene({ isCoarsePointer });
}

export function createSceneGroups(targetScene = scene, { THREE: Three = THREE } = {}) {
  const coreGroup = new Three.Group();
  const nodesGroup = new Three.Group();
  const connectionsGroup = new Three.Group();
  targetScene.add(coreGroup);
  targetScene.add(nodesGroup);
  targetScene.add(connectionsGroup);
  return { coreGroup, nodesGroup, connectionsGroup };
}

export function createCameraAnimationState({ THREE: Three = THREE } = {}) {
  // Locked portfolio mode uses a tightly scaled star map that fits every project
  // on screen; unlocked flight mode switches to the separate system-scale world.
  const camTarget = {
    pos: new Three.Vector3(0, 20, 118),
    lookAt: new Three.Vector3(0, 0, 0)
  };
  const camCurrent = {
    pos: new Three.Vector3(0, 24, 126),
    lookAt: new Three.Vector3(0, 0, 0)
  };
  const sectionCamPositions = [
    new Three.Vector3(0, 20, 118),
    new Three.Vector3(16, 18, 108),
    new Three.Vector3(-18, 24, 112),
    new Three.Vector3(22, 18, 110),
    new Three.Vector3(-14, 16, 104),
    new Three.Vector3(0, 16, 108)
  ];
  const sectionColors = [
    { light1: new Three.Color(0x00f0ff), light2: new Three.Color(0xff0055) },
    { light1: new Three.Color(0x00ff66), light2: new Three.Color(0x00f0ff) },
    { light1: new Three.Color(0xb026ff), light2: new Three.Color(0xff0055) },
    { light1: new Three.Color(0xffcc00), light2: new Three.Color(0x00ff66) },
    { light1: new Three.Color(0x00f0ff), light2: new Three.Color(0xb026ff) },
    { light1: new Three.Color(0xff0055), light2: new Three.Color(0x00f0ff) }
  ];
  return { camTarget, camCurrent, sectionCamPositions, sectionColors };
}

export function getScene() {
  return scene || rendererScene;
}

export function getCamera() {
  return camera || rendererCamera;
}

export function getRenderer() {
  return renderer || webglRenderer;
}

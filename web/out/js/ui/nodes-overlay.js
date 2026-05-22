const THREE = globalThis.THREE;

const labelTempVec = THREE ? new THREE.Vector3() : null;
const planetLabelOffset = THREE ? new THREE.Vector3() : null;

let deps = null;
let hoveredNode = null;

export function configureNodesOverlay(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Nodes overlay module not configured');
  return deps;
}

export function clearHoveredNode() {
  const { selectedNode = () => null, setCursorHovering, setProjectNodeOpacity } = requireDeps();
  if (hoveredNode && hoveredNode !== selectedNode()) {
    hoveredNode.scale.setScalar(hoveredNode.userData.baseScale);
    setProjectNodeOpacity(hoveredNode, 0.85);
  }
  hoveredNode = null;
  setCursorHovering(false);
}

export function getHoveredNode() {
  return hoveredNode;
}

export function updateNodeHoverSelection() {
  const {
    getInteractiveHits,
    inputState,
    isConsoleActive,
    isFlightActive,
    selectedNode,
    setCursorHovering,
    setProjectNodeOpacity
  } = requireDeps();

  if (!isConsoleActive() || isFlightActive() || !inputState.pointerDirty) return;
  const intersects = getInteractiveHits();
  inputState.pointerDirty = false;

  if (intersects.length > 0) {
    const node = intersects[0].object.userData.node || intersects[0].object;
    if (hoveredNode !== node) {
      if (hoveredNode && hoveredNode !== selectedNode()) {
        hoveredNode.scale.setScalar(hoveredNode.userData.baseScale);
        setProjectNodeOpacity(hoveredNode, 0.85);
      }

      hoveredNode = node;
      setCursorHovering(true);

      if (node !== selectedNode()) {
        node.scale.setScalar(node.userData.baseScale * 1.25);
        setProjectNodeOpacity(node, 1.0);
      }
    }
    return;
  }

  clearHoveredNode();
}

export function renderProjectLabels() {
  const {
    camera,
    isConsoleActive,
    planetLabelRadius,
    projectLabels,
    selectedNode,
    windowRef = window
  } = requireDeps();

  projectLabels.forEach(label => {
    if (!isConsoleActive() || !label.object3d.visible) {
      label.element.style.opacity = 0;
      return;
    }

    label.object3d.getWorldPosition(labelTempVec);
    planetLabelOffset.copy(camera.position)
      .sub(labelTempVec)
      .normalize()
      .multiplyScalar(label.object3d.userData.visualRadius ? label.object3d.userData.visualRadius * label.object3d.scale.x * 0.18 : 0);
    labelTempVec.y += (label.object3d.userData.visualRadius || planetLabelRadius) * label.object3d.scale.x * 1.18;
    labelTempVec.add(planetLabelOffset);
    labelTempVec.project(camera);

    if (labelTempVec.z > 1 || labelTempVec.z < -1) {
      label.element.style.opacity = 0;
      return;
    }

    const x = (labelTempVec.x * 0.5 + 0.5) * windowRef.innerWidth;
    const y = (labelTempVec.y * -0.5 + 0.5) * windowRef.innerHeight;
    label.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -130%)`;

    const activeNode = selectedNode();
    const dist = camera.position.distanceTo(label.object3d.position);
    if (dist < 2.0 && label.object3d !== activeNode) {
      label.element.style.opacity = Math.max(0, (dist - 1.2) * 1.2);
    } else {
      label.element.style.opacity = label.object3d === activeNode ? 1 : 0.8;
    }
  });
}

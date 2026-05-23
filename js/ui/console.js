const THREE = globalThis.THREE;

let deps = null;
let inspectHowLabel = null;
let inspectHowBody = null;

export function configureConsoleUI(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Console UI module not configured');
  return deps;
}

function ensureProjectHowSection() {
  const { documentRef = document, inspectDesc } = requireDeps();
  if (inspectHowBody || !inspectDesc) return;
  inspectHowLabel = documentRef.createElement('div');
  inspectHowLabel.className = 'inspector-section-lbl';
  inspectHowLabel.innerText = '[HOW_IT_WORKS]';
  inspectHowBody = documentRef.createElement('div');
  inspectHowBody.className = 'inspector-how-body';
  inspectDesc.insertAdjacentElement('afterend', inspectHowBody);
  inspectDesc.insertAdjacentElement('afterend', inspectHowLabel);
}

function getProjectHowCopy(proj) {
  const { PROJECT_HOW_COPY, USSY_CATEGORIES } = requireDeps();
  if (PROJECT_HOW_COPY[proj.id]) return PROJECT_HOW_COPY[proj.id];
  const specs = proj.specs ? Object.entries(proj.specs).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join('; ') : 'project-specific runtime details';
  const features = proj.features ? proj.features.slice(0, 2).join(', ') : 'the core workflow';
  return `${proj.name} combines ${specs} with ${features}. The project is mapped here as a ${USSY_CATEGORIES[proj.category]?.title || 'Ussyverse'} node so its implementation details, related systems, and source links can be inspected together.`;
}

function setLegacyConnectionLineVisible(node, visible) {
  if (node?.userData?.connectionLine) node.userData.connectionLine.visible = visible;
}

function setLegacyConnectionLineOpacity(node, opacity) {
  const material = node?.userData?.connectionLine?.material;
  if (material) material.opacity = opacity;
}

export function populateProjectsUI() {
  const { USSY_CATEGORIES, USSY_PROJECTS, activeCategory, isFlightActive, projectsScrollList, selectProject = selectProjectModule, documentRef = document } = requireDeps();
  projectsScrollList.innerHTML = '';
  USSY_PROJECTS.forEach(proj => {
    if (activeCategory() !== 'all' && proj.category !== activeCategory()) return;
    const item = documentRef.createElement('div');
    item.className = 'project-item';
    item.dataset.id = proj.id;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Inspect ${proj.name}`);
    const statusClass = proj.status === 'Stable' ? 'stable' : 'active-state';
    const cat = USSY_CATEGORIES[proj.category];
    item.innerHTML = `
        <div class="project-item-main">
          <span class="project-name">${proj.name}</span>
          <span class="project-meta">${cat ? cat.title : 'Ussyverse'} // ${proj.status}</span>
        </div>
        <div class="status-dot ${statusClass}"></div>
      `;
    item.addEventListener('click', () => {
      if (isFlightActive()) return;
      selectProject(proj.id, true);
    });
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!isFlightActive()) selectProject(proj.id, true);
      }
    });
    projectsScrollList.appendChild(item);
  });
}

export function setupUIEventListeners() {
  const {
    backToHeroBtn,
    documentRef = document,
    enterConsoleBtn,
    heroSetupNavDots,
    hudHeaderTitle,
    isFlightActive,
    projectLabels,
    projectNodes,
    setActiveCategory,
    updateRelationshipEdges
  } = requireDeps();

  const cards = documentRef.querySelectorAll('.category-card');
  cards.forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', card.classList.contains('active') ? 'true' : 'false');
    card.addEventListener('click', () => {
      if (isFlightActive()) return;
      cards.forEach(c => c.classList.remove('active'));
      cards.forEach(c => c.setAttribute('aria-pressed', 'false'));
      card.classList.add('active');
      card.setAttribute('aria-pressed', 'true');
      setActiveCategory(card.dataset.category);
      populateProjectsUI();
      projectNodes.forEach(node => {
        const matches = card.dataset.category === 'all' || node.userData.project.category === card.dataset.category;
        node.visible = matches;
        setLegacyConnectionLineVisible(node, matches);
      });
      updateRelationshipEdges();
      projectLabels.forEach(label => {
        const matches = card.dataset.category === 'all' || label.object3d.userData.project.category === card.dataset.category;
        label.element.style.display = matches ? 'block' : 'none';
      });
    });
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });

  if (enterConsoleBtn) enterConsoleBtn.addEventListener('click', activateConsoleMode);
  if (backToHeroBtn) backToHeroBtn.addEventListener('click', deactivateConsoleMode);
  if (hudHeaderTitle) hudHeaderTitle.addEventListener('click', deactivateConsoleMode);
  if (heroSetupNavDots) heroSetupNavDots();
}

export function selectProjectModule(projId, triggerFly = true) {
  const {
    USSY_CATEGORIES,
    USSY_PROJECTS,
    btnDemo,
    btnGithub,
    camCurrent,
    camTarget,
    documentRef = document,
    getRelatedEdgesForProject,
    inspectCategory,
    inspectDesc,
    inspectFeatures,
    inspectSpecs,
    inspectTags,
    inspectTelemetry,
    inspectTitle,
    projectLabels,
    projectNodes,
    setProjectNodeOpacity,
    setSelectedNode,
    syncOrbitFromCamera,
    updateSelectedRelationEdges
  } = requireDeps();

  const proj = USSY_PROJECTS.find(p => p.id === projId);
  if (!proj) return null;
  const selectedNode = projectNodes.find(n => n.userData.project.id === projId);
  setSelectedNode(selectedNode);

  documentRef.querySelectorAll('.project-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === projId);
    item.setAttribute('aria-current', item.dataset.id === projId ? 'true' : 'false');
  });
  projectLabels.forEach(label => label.element.classList.toggle('active', label.element.dataset.id === projId));

  projectNodes.forEach(node => {
    const isSelected = node.userData.project.id === projId;
    const isRelated = getRelatedEdgesForProject(projId).some(edge => edge.fromNode === node || edge.toNode === node);
    node.scale.setScalar(node.userData.baseScale * (isSelected ? 1.5 : 1));
    setProjectNodeOpacity(node, isSelected ? 1.0 : (isRelated ? 0.82 : 0.5));
    setLegacyConnectionLineOpacity(node, isSelected ? 0.6 : 0.15);
  });
  updateSelectedRelationEdges();

  inspectTitle.innerText = proj.name.toUpperCase();
  const cat = USSY_CATEGORIES[proj.category];
  inspectCategory.innerText = cat ? cat.title.toUpperCase() : 'USSYVERSE CORE';
  inspectCategory.style.borderColor = 'rgba(148, 163, 184, 0.24)';
  inspectCategory.style.color = 'rgba(203, 213, 225, 0.78)';
  inspectDesc.innerText = proj.description;
  ensureProjectHowSection();
  inspectHowBody.innerText = getProjectHowCopy(proj);

  inspectTags.innerHTML = '';
  proj.tags.forEach(tag => {
    const badge = documentRef.createElement('span');
    badge.className = `tag-badge ${tag === 'Featured' || tag.includes('Stable') || tag.includes('Active') ? 'special' : ''}`;
    badge.innerText = tag;
    inspectTags.appendChild(badge);
  });
  getRelatedEdgesForProject(proj.id).slice(0, 4).forEach(edge => {
    const relatedProj = edge.from === proj.id ? edge.toNode.userData.project : edge.fromNode.userData.project;
    const badge = documentRef.createElement('span');
    badge.className = 'tag-badge orbit-link-badge';
    badge.innerText = `ORBIT: ${relatedProj.name}`;
    inspectTags.appendChild(badge);
  });

  inspectSpecs.innerHTML = '';
  if (proj.specs) {
    for (const [key, value] of Object.entries(proj.specs)) {
      const keyDiv = documentRef.createElement('div');
      keyDiv.innerText = key;
      const valDiv = documentRef.createElement('div');
      valDiv.innerText = value;
      inspectSpecs.appendChild(keyDiv);
      inspectSpecs.appendChild(valDiv);
    }
  }

  inspectFeatures.innerHTML = '';
  if (proj.features) {
    proj.features.forEach(feat => {
      const li = documentRef.createElement('li');
      li.innerText = feat;
      inspectFeatures.appendChild(li);
    });
  }

  if (inspectTelemetry) {
    inspectTelemetry.innerText = proj.telemetry || '';
    inspectTelemetry.style.whiteSpace = 'pre-wrap';
  }

  if (proj.github) {
    btnGithub.style.display = 'flex';
    btnGithub.href = proj.github;
  } else {
    btnGithub.style.display = 'none';
  }

  if (proj.demo) {
    btnDemo.style.display = 'flex';
    btnDemo.href = proj.demo;
  } else {
    btnDemo.style.display = 'none';
  }

  if (triggerFly && selectedNode) {
    const pos = selectedNode.position;
    const dir = new THREE.Vector3().copy(pos).normalize();
    camTarget.pos.copy(pos).add(dir.multiplyScalar(18)).add(new THREE.Vector3(0, 5.5, 0));
    camTarget.lookAt.copy(pos);
    if (camCurrent) {
      camCurrent.pos.lerp(camTarget.pos, 0.55);
      camCurrent.lookAt.lerp(camTarget.lookAt, 0.55);
    }
    syncOrbitFromCamera();
  }
  return selectedNode;
}

export const selectProject = selectProjectModule;

export function activateConsoleMode() {
  const { camTarget, documentRef = document, getSelectedNode, selectProject = selectProjectModule, setConsoleActive, syncOrbitFromCamera } = requireDeps();
  setConsoleActive(true);
  documentRef.body.classList.add('console-active');
  camTarget.pos.set(0, 8, 38);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  const selectedNode = getSelectedNode();
  if (selectedNode) selectProject(selectedNode.userData.project.id, true);
}

export function deactivateConsoleMode() {
  const {
    documentRef = document,
    exitFlightMode,
    heroContainer,
    isFlightActive,
    projectNodes,
    setConsoleActive,
    setProjectNodeOpacity,
    setSelectedNode,
    updateSelectedRelationEdges
  } = requireDeps();
  if (isFlightActive()) exitFlightMode(false);
  setConsoleActive(false);
  documentRef.body.classList.remove('console-active');
  setSelectedNode(null);
  projectNodes.forEach(node => {
    node.scale.setScalar(node.userData.baseScale);
    setProjectNodeOpacity(node, 0.85);
    setLegacyConnectionLineOpacity(node, 0.15);
  });
  updateSelectedRelationEdges();
  documentRef.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  documentRef.querySelectorAll('.floating-node-label').forEach(label => label.classList.remove('active'));
  if (heroContainer) heroContainer.scrollTop = 0;
}

export function resetCategoryFilterForFlight() {
  const { documentRef = document, projectLabels, projectNodes, setActiveCategory, updateRelationshipEdges } = requireDeps();
  setActiveCategory('all');
  documentRef.querySelectorAll('.category-card').forEach(card => {
    const isAll = card.dataset.category === 'all';
    card.classList.toggle('active', isAll);
    card.setAttribute('aria-pressed', isAll ? 'true' : 'false');
  });
  projectNodes.forEach(node => {
    node.visible = true;
    setLegacyConnectionLineVisible(node, true);
  });
  projectLabels.forEach(label => {
    label.element.style.display = 'block';
  });
  populateProjectsUI();
  updateRelationshipEdges();
}
export function isTypingTarget(target) { return Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]')); }

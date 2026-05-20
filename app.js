// --- USSYVERSE 3D CYBERNETIC ENGINE --- //

let scene, camera, renderer;
let coreGroup, nodesGroup, connectionsGroup;
let coreMesh, coreOuterParticles;
let raycaster, mouse;
let hoveredNode = null;
let selectedNode = null;
let activeCategory = 'all';
let isConsoleActive = false; // Hero state by default
let pointLight1, pointLight2; // Global lights for scroll snap neon shifts

// Animation state
const camTarget = {
  pos: new THREE.Vector3(0, 6, 22), // Hero drift start
  lookAt: new THREE.Vector3(0, 0, 0)
};
const camCurrent = {
  pos: new THREE.Vector3(0, 15, 30),
  lookAt: new THREE.Vector3(0, 0, 0)
};

// Section Constants for Scroll Snap Camera Positions & Neon Shifts
const sectionCamPositions = [
  new THREE.Vector3(0, 6, 22),   // Welcome
  new THREE.Vector3(5, 4, 15),   // Philosophy
  new THREE.Vector3(-6, 8, 18),  // Sectors
  new THREE.Vector3(0, 3, 14)    // Portal
];

const sectionColors = [
  { light1: new THREE.Color(0x00f0ff), light2: new THREE.Color(0xff0055) }, // Welcome: Cyan / Pink
  { light1: new THREE.Color(0x00ff66), light2: new THREE.Color(0x00f0ff) }, // Philosophy: Green / Cyan
  { light1: new THREE.Color(0xb026ff), light2: new THREE.Color(0xff0055) }, // Sectors: Purple / Pink
  { light1: new THREE.Color(0xff0055), light2: new THREE.Color(0x00f0ff) }  // Portal: Pink / Cyan
];

// Node object maps
const projectNodes = [];
const projectLabels = [];

// DOM Elements
const canvasContainer = document.getElementById('canvas-container');
const projectsScrollList = document.getElementById('projects-scroll-list');
const labelsContainer = document.getElementById('labels-container');
const customCursor = document.getElementById('custom-cursor');
const telemetryTimer = document.getElementById('telemetry-timer');
const telemetryCoord = document.getElementById('telemetry-coord');

// Hero elements
const heroContainer = document.getElementById('hero-container');
const enterConsoleBtn = document.getElementById('enter-console-btn');
const backToHeroBtn = document.getElementById('back-to-hero-btn');
const hudHeaderTitle = document.getElementById('hud-header-title');

// Inspect Elements
const inspectTitle = document.getElementById('inspect-title');
const inspectCategory = document.getElementById('inspect-category');
const inspectDesc = document.getElementById('inspect-desc');
const inspectTags = document.getElementById('inspect-tags');
const btnGithub = document.getElementById('btn-github');
const btnDemo = document.getElementById('btn-demo');
const inspectSpecs = document.getElementById('inspect-specs');
const inspectFeatures = document.getElementById('inspect-features');
const inspectTelemetry = document.getElementById('inspect-telemetry');

// Init application
function init() {
  // Initialize Three.js Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060f, 0.02);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasContainer.appendChild(renderer.domElement);

  // Groups
  coreGroup = new THREE.Group();
  nodesGroup = new THREE.Group();
  connectionsGroup = new THREE.Group();
  scene.add(coreGroup);
  scene.add(nodesGroup);
  scene.add(connectionsGroup);

  // Interactive Raycaster Setup
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Create Scene Elements
  createHolographicCore();
  buildProjectNodes();
  createAmbientLighting();
  
  // Populate UI Lists
  populateProjectsUI();
  setupUIEventListeners();
  
  // Select initial project (Devussy)
  selectProject('devussy', false);

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onSceneClick);
  document.addEventListener('touchstart', onTouchStart, { passive: true });

  // Scroll Parallax Listener for Hero
  if (heroContainer) {
    heroContainer.addEventListener('scroll', onHeroScroll, { passive: true });
  }

  // Start Engine Loop
  animate(0);
}

// 1. Holographic Core
function createHolographicCore() {
  // Inner Core: Wireframe Icosahedron
  const innerGeo = new THREE.IcosahedronGeometry(2, 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  coreMesh = new THREE.Mesh(innerGeo, innerMat);
  coreGroup.add(coreMesh);

  // Outer Core: Glowing Particle Field
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 600;
  const positions = new Float32Array(particleCount * 3);
  
  for(let i = 0; i < particleCount; i++) {
    // Generate spherical coordinates
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 2.2 + Math.random() * 0.5; // Radius
    
    positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
  }
  
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Create a canvas texture for glowing particles
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');
  const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 16, 16);
  const pTexture = new THREE.CanvasTexture(pCanvas);

  const particleMat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    map: pTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  coreOuterParticles = new THREE.Points(particleGeo, particleMat);
  coreGroup.add(coreOuterParticles);
}

// 2. Procedural Nodes Graph
function buildProjectNodes() {
  const count = USSY_PROJECTS.length;
  
  USSY_PROJECTS.forEach((proj, idx) => {
    // Position nodes in an expanding spiral
    const angle = (idx / count) * Math.PI * 2 * 2.5; 
    const radius = 5.5 + (idx / count) * 8.5; 
    const yHeight = (Math.sin(angle * 2) * 1.5) + (Math.random() * 0.5); 
    
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;
    
    // Unique 3D avatar shape per project
    let nodeGeo;
    const cat = USSY_CATEGORIES[proj.category];
    const catColor = cat ? cat.color : '#00f0ff';
    
    switch (proj.id) {
      case 'devussy':       nodeGeo = new THREE.DodecahedronGeometry(0.38); break;       // Complex multi-faceted planning hub
      case 'openclawssy':   nodeGeo = new THREE.OctahedronGeometry(0.38); break;         // Sharp operator diamond
      case 'swarmussy':     nodeGeo = new THREE.TorusKnotGeometry(0.22, 0.08, 48, 8); break; // Intertwined swarm loops
      case 'tchaikovskussy':nodeGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16); break; // Translation ring
      case 'ussycode':      nodeGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25); break;     // Tall server rack
      case 'hermes-dashboard': nodeGeo = new THREE.IcosahedronGeometry(0.35); break;     // Many-sided monitor
      case 'imacomputerussy': nodeGeo = new THREE.BoxGeometry(0.4, 0.3, 0.08); break;   // Flat retro monitor
      case 'stallionussy':  nodeGeo = new THREE.ConeGeometry(0.25, 0.5, 4); break;      // Horse trophy cone
      case 'templeossy':    nodeGeo = new THREE.TetrahedronGeometry(0.4); break;         // Temple pyramid
      case 'fruityboofs':   nodeGeo = new THREE.SphereGeometry(0.3, 16, 16); break;     // Audio orb
      case 'mediageckussy':  nodeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16); break; // Film disc
      case 'strudelussy':   nodeGeo = new THREE.TorusKnotGeometry(0.2, 0.06, 32, 6, 2, 3); break; // Musical frequency spiral
      case 'scoreboardussy': nodeGeo = new THREE.BoxGeometry(0.5, 0.3, 0.06); break;    // Scoreboard panel
      case 'geoffrussy':    nodeGeo = new THREE.OctahedronGeometry(0.42); break;         // Command crystal
      case 'battlebussy':   nodeGeo = new THREE.TetrahedronGeometry(0.42, 1); break;     // Spiked attack prism
      case 'ussyring':      nodeGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 24); break; // Thin webring circle
      case 'ghstatsussy':   nodeGeo = new THREE.DodecahedronGeometry(0.28); break;      // Data facets gem
      case 'stenographussy': nodeGeo = new THREE.TetrahedronGeometry(0.35, 0); break;   // Scanning pyramid
      case 'fireslice':     nodeGeo = new THREE.ConeGeometry(0.2, 0.5, 6); break;       // Flame rocket nozzle (inverted via rotation)
      case 'ralphussy':     nodeGeo = new THREE.SphereGeometry(0.28, 4, 4); break;      // Low-poly early prototype orb
      case 'ragussy':       nodeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.45, 8); break; // Document silo
      case 'nexussy':       nodeGeo = new THREE.DodecahedronGeometry(0.42, 1); break;   // Complex pipeline polytope
      case 'rpg-dm-bot':    nodeGeo = new THREE.IcosahedronGeometry(0.38, 0); break;    // d20 die
      default:              nodeGeo = new THREE.SphereGeometry(0.28, 6, 6); break;
    }
    
    // Custom material with category color
    const hexColor = parseInt(catColor.replace('#', '0x'));
    const nodeMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    nodeMesh.position.set(posX, yHeight, posZ);
    nodeMesh.userData = { project: proj };
    
    nodesGroup.add(nodeMesh);
    projectNodes.push(nodeMesh);
    
    // Add dynamic connection lines to core
    const lineMat = new THREE.LineBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.15
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      nodeMesh.position
    ]);
    const connectionLine = new THREE.Line(lineGeo, lineMat);
    connectionsGroup.add(connectionLine);
    nodeMesh.userData.connectionLine = connectionLine;

    // Create 2D Overlay Label
    const label = document.createElement('div');
    label.className = 'floating-node-label';
    label.innerText = `[${proj.name.toUpperCase()}]`;
    label.dataset.id = proj.id;
    labelsContainer.appendChild(label);
    projectLabels.push({ element: label, object3d: nodeMesh });
  });
}

// Lighting Setup
function createAmbientLighting() {
  const ambientLight = new THREE.AmbientLight(0x0e172e, 1.5);
  scene.add(ambientLight);
  
  pointLight1 = new THREE.PointLight(0x00f0ff, 2.5, 30);
  pointLight1.position.set(0, 0, 0);
  scene.add(pointLight1);
  
  pointLight2 = new THREE.PointLight(0xff0055, 1.5, 40);
  pointLight2.position.set(10, 10, 10);
  scene.add(pointLight2);
}

// 3. UI Syncing
function populateProjectsUI() {
  projectsScrollList.innerHTML = '';
  
  USSY_PROJECTS.forEach(proj => {
    if (activeCategory !== 'all' && proj.category !== activeCategory) return;
    
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.id = proj.id;
    
    const isStable = proj.status === 'Stable';
    const statusClass = isStable ? 'stable' : 'active-state';
    
    item.innerHTML = `
      <span>${proj.name}</span>
      <div class="status-dot ${statusClass}"></div>
    `;
    
    item.addEventListener('click', () => {
      selectProject(proj.id, true);
    });
    
    projectsScrollList.appendChild(item);
  });
}

function setupUIEventListeners() {
  // Category Filtering
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeCategory = card.dataset.category;
      
      populateProjectsUI();
      
      projectNodes.forEach(node => {
        const proj = node.userData.project;
        const matches = activeCategory === 'all' || proj.category === activeCategory;
        
        node.visible = matches;
        node.userData.connectionLine.visible = matches;
      });
      
      projectLabels.forEach(label => {
        const matches = activeCategory === 'all' || label.object3d.userData.project.category === activeCategory;
        label.element.style.display = matches ? 'block' : 'none';
      });
    });
  });

  // Hero Mode Triggers
  if (enterConsoleBtn) {
    enterConsoleBtn.addEventListener('click', activateConsoleMode);
  }
  if (backToHeroBtn) {
    backToHeroBtn.addEventListener('click', deactivateConsoleMode);
  }
  if (hudHeaderTitle) {
    hudHeaderTitle.addEventListener('click', deactivateConsoleMode);
  }

  // Scroll Snap Nav Dot Clicks
  const navDots = document.querySelectorAll('.nav-dot');
  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index);
      if (heroContainer) {
        const clientHeight = heroContainer.clientHeight || window.innerHeight;
        heroContainer.scrollTo({
          top: idx * clientHeight,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Select project by ID
function selectProject(projId, triggerFly = true) {
  const proj = USSY_PROJECTS.find(p => p.id === projId);
  if (!proj) return;
  
  selectedNode = projectNodes.find(n => n.userData.project.id === projId);
  
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === projId);
  });
  
  projectLabels.forEach(l => {
    l.element.classList.toggle('active', l.element.dataset.id === projId);
  });

  projectNodes.forEach(node => {
    const isSelected = node.userData.project.id === projId;
    node.scale.setScalar(isSelected ? 1.5 : 1);
    node.material.opacity = isSelected ? 1.0 : 0.6;
    node.userData.connectionLine.material.opacity = isSelected ? 0.6 : 0.15;
  });

  inspectTitle.innerText = proj.name.toUpperCase();
  
  const cat = USSY_CATEGORIES[proj.category];
  inspectCategory.innerText = cat ? cat.title.toUpperCase() : "USSYVERSE CORE";
  inspectCategory.style.borderColor = cat ? cat.color : "var(--cyber-cyan)";
  inspectCategory.style.color = cat ? cat.color : "var(--cyber-cyan)";
  
  inspectDesc.innerText = proj.description;
  
  inspectTags.innerHTML = '';
  proj.tags.forEach(t => {
    const isSpecial = t === 'Featured' || t.includes('Stable') || t.includes('Active');
    const badge = document.createElement('span');
    badge.className = `tag-badge ${isSpecial ? 'special' : ''}`;
    badge.innerText = t;
    inspectTags.appendChild(badge);
  });

  // Populate Technical Specifications Grid
  inspectSpecs.innerHTML = '';
  if (proj.specs) {
    for (const [key, value] of Object.entries(proj.specs)) {
      const keyDiv = document.createElement('div');
      keyDiv.innerText = key;
      const valDiv = document.createElement('div');
      valDiv.innerText = value;
      inspectSpecs.appendChild(keyDiv);
      inspectSpecs.appendChild(valDiv);
    }
  }

  // Populate Core Capabilities bullet list
  inspectFeatures.innerHTML = '';
  if (proj.features) {
    proj.features.forEach(feat => {
      const li = document.createElement('li');
      li.innerText = feat;
      inspectFeatures.appendChild(li);
    });
  }

  // Populate Diagnostics Telemetry monospace readouts
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

  // Camera Fly-To Coords
  if (triggerFly && selectedNode) {
    const pos = selectedNode.position;
    const dir = new THREE.Vector3().copy(pos).normalize();
    camTarget.pos.copy(pos).add(dir.multiplyScalar(3.2)).add(new THREE.Vector3(0, 1.2, 0));
    camTarget.lookAt.copy(pos);
  }
}

// Mode Transitions
function activateConsoleMode() {
  isConsoleActive = true;
  document.body.classList.add('console-active');
  
  // Set camera to initial focus view
  camTarget.pos.set(0, 4, 18);
  camTarget.lookAt.set(0, 0, 0);
  
  if (selectedNode) {
    selectProject(selectedNode.userData.project.id, true);
  }
}

function deactivateConsoleMode() {
  isConsoleActive = false;
  document.body.classList.remove('console-active');
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(1);
    node.material.opacity = 0.85;
    node.userData.connectionLine.material.opacity = 0.15;
  });
  
  document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.floating-node-label').forEach(lbl => lbl.classList.remove('active'));
  
  // Reset scroll container position
  if (heroContainer) {
    heroContainer.scrollTop = 0;
  }
}

// Scroll Parallax Effect
function onHeroScroll() {
  if (isConsoleActive) return;
  
  const scrollTop = heroContainer.scrollTop;
  const clientHeight = heroContainer.clientHeight || window.innerHeight;
  const maxScroll = heroContainer.scrollHeight - clientHeight;
  const scrollRatio = Math.min(scrollTop / maxScroll, 1);
  
  // Compute active section index
  const sectionIdx = Math.round(scrollTop / clientHeight);
  
  // Update nav dot active class
  const navDots = document.querySelectorAll('.nav-dot');
  navDots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === sectionIdx);
  });
  
  // Increase particle speed on rapid scrolls
  coreOuterParticles.rotation.y -= scrollRatio * 0.005;
  
  // Auto-activate console if user scrolls all the way down
  if (scrollRatio > 0.98 && !isConsoleActive) {
    activateConsoleMode();
  }
}

function resetCameraView() {
  if (!isConsoleActive) return;
  camTarget.pos.set(0, 4, 18);
  camTarget.lookAt.set(0, 0, 0);
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(1);
    node.material.opacity = 0.85;
    node.userData.connectionLine.material.opacity = 0.15;
  });
  
  document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.floating-node-label').forEach(lbl => lbl.classList.remove('active'));
}

canvasContainer.addEventListener('dblclick', resetCameraView);

// 4. Input Events
function onMouseMove(event) {
  customCursor.style.left = event.clientX + 'px';
  customCursor.style.top = event.clientY + 'px';
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  telemetryCoord.innerText = `X: ${mouse.x.toFixed(2)} Y: ${mouse.y.toFixed(2)} Z: 0.00`;
}

function onTouchStart(event) {
  if (event.touches.length > 0) {
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

function onSceneClick(event) {
  // Disable clicks while simply reading/scrolling hero overlay
  if (!isConsoleActive) return;
  if (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive')) return;
  
  raycaster.setFromCamera(mouse, camera);
  const visibleNodes = projectNodes.filter(n => n.visible);
  const intersects = raycaster.intersectObjects(visibleNodes);
  
  if (intersects.length > 0) {
    const hitNode = intersects[0].object;
    selectProject(hitNode.userData.project.id, true);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 5. Engine Animation Loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const startTime = performance.now();
  
  // Slow background rotation for holographic core
  coreMesh.rotation.y += 0.002;
  coreMesh.rotation.x += 0.0008;
  
  coreOuterParticles.rotation.y -= 0.0006;
  coreOuterParticles.rotation.x -= 0.0003;
  
  const pulseScale = 1 + Math.sin(time * 0.0015) * 0.04;
  coreMesh.scale.setScalar(pulseScale);

  // Floating nodes orbits (slow drift)
  const orbitSpeed = 0.0003;
  projectNodes.forEach(node => {
    if (selectedNode !== node) {
      const pos = node.position;
      const x = pos.x * Math.cos(orbitSpeed) - pos.z * Math.sin(orbitSpeed);
      const z = pos.x * Math.sin(orbitSpeed) + pos.z * Math.cos(orbitSpeed);
      pos.x = x;
      pos.z = z;
      
      const positions = node.userData.connectionLine.geometry.attributes.position.array;
      positions[3] = x;
      positions[5] = z;
      node.userData.connectionLine.geometry.attributes.position.needsUpdate = true;
    }
  });

  // Slow ambient drift of camera coordinates during passive Hero screensaver state
  if (!isConsoleActive && heroContainer) {
    const scrollTop = heroContainer.scrollTop;
    const clientHeight = heroContainer.clientHeight || window.innerHeight;
    const sectionFloat = scrollTop / clientHeight;
    const sectionIdx = Math.min(Math.floor(sectionFloat), 2);
    const nextSectionIdx = Math.min(sectionIdx + 1, 3);
    const t = sectionFloat - sectionIdx;
    
    const posA = sectionCamPositions[sectionIdx];
    const posB = sectionCamPositions[nextSectionIdx];
    
    // Interpolated base camera position
    const baseCamPos = new THREE.Vector3().lerpVectors(posA, posB, t);
    
    // Add subtle ambient floating/screensaver drift
    const floatDrift = new THREE.Vector3(
      Math.sin(time * 0.0005) * 1.5,
      Math.cos(time * 0.0003) * 0.8,
      Math.sin(time * 0.0004) * 1.2
    );
    
    // Set camTarget.pos to base + drift
    camTarget.pos.copy(baseCamPos).add(floatDrift);
    camTarget.lookAt.set(0, 0, 0);

    // Smoothly LERP point light colors matching each sector
    const color1A = sectionColors[sectionIdx].light1;
    const color1B = sectionColors[nextSectionIdx].light1;
    const color2A = sectionColors[sectionIdx].light2;
    const color2B = sectionColors[nextSectionIdx].light2;
    
    const targetColor1 = new THREE.Color().copy(color1A).lerp(color1B, t);
    const targetColor2 = new THREE.Color().copy(color2A).lerp(color2B, t);

    pointLight1.color.lerp(targetColor1, 0.05);
    pointLight2.color.lerp(targetColor2, 0.05);
  } else if (isConsoleActive) {
    // Dynamic color shifts when selecting different projects based on their category
    if (selectedNode) {
      const proj = selectedNode.userData.project;
      const cat = USSY_CATEGORIES[proj.category];
      const catColorHex = parseInt(cat.color.replace('#', '0x'));
      const targetColor1 = new THREE.Color(catColorHex);
      const targetColor2 = new THREE.Color(0xff0055); // Neon Pink contrast

      pointLight1.color.lerp(targetColor1, 0.05);
      pointLight2.color.lerp(targetColor2, 0.05);
    } else {
      // Default Console mode colors (Cyan and Pink)
      pointLight1.color.lerp(new THREE.Color(0x00f0ff), 0.05);
      pointLight2.color.lerp(new THREE.Color(0xff0055), 0.05);
    }
  }

  // Raycasting hover highlight (only active in Console mode)
  if (isConsoleActive) {
    raycaster.setFromCamera(mouse, camera);
    const visibleNodes = projectNodes.filter(n => n.visible);
    const intersects = raycaster.intersectObjects(visibleNodes);
    
    if (intersects.length > 0) {
      const node = intersects[0].object;
      if (hoveredNode !== node) {
        if (hoveredNode && hoveredNode !== selectedNode) {
          hoveredNode.scale.setScalar(1);
          hoveredNode.material.opacity = 0.85;
        }
        
        hoveredNode = node;
        customCursor.classList.add('hovering');
        
        if (node !== selectedNode) {
          node.scale.setScalar(1.25);
          node.material.opacity = 1.0;
        }
      }
    } else {
      if (hoveredNode) {
        if (hoveredNode !== selectedNode) {
          hoveredNode.scale.setScalar(1);
          hoveredNode.material.opacity = 0.85;
        }
        hoveredNode = null;
        customCursor.classList.remove('hovering');
      }
    }
  }

  // Smooth LERP camera movement
  const lerpFactor = isConsoleActive ? 0.06 : 0.02; // Slower, more cinematic drift in Hero mode
  camCurrent.pos.lerp(camTarget.pos, lerpFactor);
  camCurrent.lookAt.lerp(camTarget.lookAt, lerpFactor);
  
  camera.position.copy(camCurrent.pos);
  camera.lookAt(camCurrent.lookAt);

  // Render WebGL
  renderer.render(scene, camera);

  // Project 3D positions to 2D HTML Labels
  projectLabels.forEach(label => {
    // Only show labels when Console Mode is active and nodes are visible
    if (!isConsoleActive || !label.object3d.visible) {
      label.element.style.opacity = 0;
      return;
    }
    
    const tempV = new THREE.Vector3();
    label.object3d.getWorldPosition(tempV);
    tempV.project(camera);
    
    if (tempV.z > 1) {
      label.element.style.opacity = 0;
      return;
    }
    
    const x = (tempV.x *  .5 + .5) * window.innerWidth;
    const y = (tempV.y * -.5 + .5) * window.innerHeight;
    
    label.element.style.left = `${x}px`;
    label.element.style.top = `${y}px`;
    
    const dist = camera.position.distanceTo(label.object3d.position);
    if (dist < 2.0 && label.object3d !== selectedNode) {
      label.element.style.opacity = Math.max(0, (dist - 1.2) * 1.2);
    } else {
      label.element.style.opacity = label.object3d === selectedNode ? 1 : 0.8;
    }
  });

  // Telemetry framerate diagnostics
  const endTime = performance.now();
  telemetryTimer.innerText = `TELEMETRY_LOAD: ${(endTime - startTime).toFixed(2)}ms`;
}

// Start Application
window.onload = init;

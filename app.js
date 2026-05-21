// --- USSYVERSE 3D CYBERNETIC ENGINE --- //

let scene, camera, renderer;
let coreGroup, nodesGroup, connectionsGroup;
let coreMesh, coreOuterParticles;
let raycaster, mouse;
let hoveredNode = null;
let selectedNode = null;
let activeCategory = 'all';
let isConsoleActive = false; // Hero state by default
let heroTouchStartY = 0;
let pointLight1, pointLight2; // Global lights for scroll snap neon shifts
let starField, dataRibbonGroup, selectionRing, relationshipEdgesMesh, selectedEdgesMesh;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const projectHitTargets = [];
const projectNodeById = new Map();
const relationshipEdges = [];
const selectedEdgeLimit = 8;
const labelTempVec = new THREE.Vector3();
const ignoredRelationTags = new Set(['Featured', 'Active', 'Stable', 'Historical', 'Ecosystem']);
const manualRelationHints = [
  ['devussy', 'swarmussy'],
  ['devussy', 'nexussy'],
  ['devussy', 'geoffrussy'],
  ['openclawssy', 'hermes-dashboard'],
  ['openclawssy', 'battlebussy'],
  ['swarmussy', 'nexussy'],
  ['swarmussy', 'ralphussy'],
  ['ussycode', 'fireslice'],
  ['ussycode', 'templeossy'],
  ['fruityboofs', 'strudelussy'],
  ['fruityboofs', 'mediageckussy'],
  ['imacomputerussy', 'templeossy'],
  ['stallionussy', 'scoreboardussy'],
  ['rpg-dm-bot', 'tchaikovskussy'],
  ['ragussy', 'tchaikovskussy'],
  ['stenographussy', 'battlebussy'],
  ['ghstatsussy', 'hermes-dashboard'],
  ['ussyring', 'mediageckussy']
];
const orbitState = {
  dragging: false,
  moved: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  captureTarget: null,
  theta: 0,
  phi: Math.PI * 0.35,
  distance: 18,
  minDistance: 7,
  maxDistance: 30,
  rotateSpeed: 0.005,
  zoomSpeed: 0.0015
};

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
  new THREE.Vector3(8, 5, 16),   // Method
  new THREE.Vector3(-4, 3, 12),  // Graph
  new THREE.Vector3(0, 3, 14)    // Portal
];

const sectionColors = [
  { light1: new THREE.Color(0x00f0ff), light2: new THREE.Color(0xff0055) }, // Welcome: Cyan / Pink
  { light1: new THREE.Color(0x00ff66), light2: new THREE.Color(0x00f0ff) }, // Philosophy: Green / Cyan
  { light1: new THREE.Color(0xb026ff), light2: new THREE.Color(0xff0055) }, // Sectors: Purple / Pink
  { light1: new THREE.Color(0xffcc00), light2: new THREE.Color(0x00ff66) }, // Method: Yellow / Green
  { light1: new THREE.Color(0x00f0ff), light2: new THREE.Color(0xb026ff) }, // Graph: Cyan / Purple
  { light1: new THREE.Color(0xff0055), light2: new THREE.Color(0x00f0ff) }  // Portal: Pink / Cyan
];

const PROJECT_HOW_COPY = {
  devussy: 'Devussy works by converting a request into structured DevPlan files that describe intent, tasks, implementation notes, and verification expectations. The useful part is the artifact trail: another human or agent can pick up the work without relying on hidden conversation state.',
  openclawssy: 'Openclawssy wraps agent execution in an operator shell. Commands pass through policy gates, sessions can be inspected, and external control surfaces such as Discord become supervised entry points rather than unrestricted remote control.',
  swarmussy: 'Swarmussy decomposes repository work into coordinated agent roles inside a terminal UI. The swarm can search, edit, and review in parallel, but the workflow is built around live supervision and local verification rather than blind parallel mutation.',
  tchaikovskussy: 'Tchaikovskussy keeps a shared WebSocket room while translating messages per participant. Instead of one translated transcript, the server brokers live conversation state and delivers language-specific views back to connected clients.',
  ussycode: 'Ussycode provisions Firecracker-backed development spaces with SSH access, persistent storage, and routing from browser-friendly URLs to active workspace ports. It is a small operator-managed alternative to heavyweight hosted dev environments.',
  'hermes-dashboard': 'Hermes Dashboard reads local runtime state, logs, context, and configuration into a standalone web console. It exists so agent systems have an observable cockpit: what context is loaded, what memory exists, and what the process is doing now.',
  imacomputerussy: 'iMaCoMpUtERussy builds a fictional desktop in plain browser technology. The custom assembly layer, drawing tools, windows, and steganography features share the same toy-computer metaphor so experiments feel like programs inside one tiny machine.',
  stallionussy: 'StallionUSSY models horses as persistent game assets with genetics, races, trades, and event ticks. The humor sits on top of normal multiplayer backend concerns: state, economy, scheduled simulations, and interfaces that make the absurd system playable.',
  templeossy: 'TempleOSsy runs a WebAssembly QEMU build in the browser, mounts local persistence through browser storage, and exposes the emulated machine through a web UI. The project is about making a full OS boot feel immediate without hiding the emulator underneath.',
  fruityboofs: 'Fruity Boofs wires browser UI state into WebAudio and WASM DSP components so vocal synthesis and sequencing happen directly in the page. Collaboration and export features turn short experiments into shareable audio artifacts.',
  mediageckussy: 'Mediageckussy acts like a compact media lab: import media, apply nostalgic transformations, transcode with browser/server tooling, then export a static package that can be shared without depending on the editor staying online.',
  strudelussy: 'Strudelussy builds on the live-coding music pattern: code is the score, the browser is the instrument, and helper tools can suggest rhythmic or melodic mutations while the audio engine keeps feedback immediate.',
  scoreboardussy: 'Scoreboardussy keeps host controls, audience voting, and live score displays synchronized through a small realtime backend. It is designed for stage pressure, where the operator needs clear state and fast updates more than decorative complexity.',
  geoffrussy: 'Geoffrussy starts by interviewing the operator, stores the answers, and turns them into a project plan that can drive later work. It is a command-line planning engine, useful historically because it shaped the later DevPlan-style systems.',
  battlebussy: 'Battlebussy launches isolated challenge environments and records what autonomous agents do inside them. Containers provide boundaries, telemetry captures behavior, and the arena turns security experiments into observable matches.',
  ussyring: 'Ussyring uses static participant data and portable client-side widgets to link independent sites together. The system is intentionally simple so the webring remains inspectable, forkable, and usable without a central application server.',
  ghstatsussy: 'ghstatsussy scans repository activity and renders the results as designed SVG/HTML output. It turns contribution data into a visual artifact that can be regenerated, customized, and shared like a badge with more personality.',
  stenographussy: 'Stenographussy scans source text for Unicode tricks that can slip past normal review. By focusing on homoglyphs and invisible characters, it gives reviewers a narrow tool for a narrow but real class of supply-chain and code-review attacks.',
  fireslice: 'Fireslice exposes Firecracker VM management through a small API layer. Users, SSH keys, VM profiles, network devices, and launch operations stay close to the metal so an operator can understand exactly what will start and why.',
  ralphussy: 'Ralphussy is an early CLI agent experiment with terminal UI, simple planning, and rough swarm concepts. Its value now is historical: it shows the experiments that led to stricter handoffs, better supervision, and more explicit artifacts.',
  ragussy: 'RAGussy ingests markdown/documentation folders, embeds chunks locally, and serves a configurable web chat over the indexed material. The management UI makes ingestion and retrieval settings visible so answers can be debugged instead of merely trusted.',
  nexussy: 'Nexussy stages software delivery as a pipeline: interview, design, validate, plan, review, then develop with worker isolation. Each stage produces traces and handoff documents so the result can be audited after multiple workers touch it.',
  'rpg-dm-bot': 'RPG DM Bot treats a Discord campaign like a persistent application. Characters, inventory, combat, NPCs, quests, and generated narration are backed by database state and dashboard endpoints so the bot can remember a campaign between sessions.'
};

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
let inspectHowLabel, inspectHowBody;

// Init application
function init() {
  // Initialize Three.js Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060f, 0.02);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.35 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  canvasContainer.appendChild(renderer.domElement);
  renderer.domElement.className = 'webgl-viewport';

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
  buildRelatedProjectEdges();
  createDeepSpaceEffects();
  createAmbientLighting();
  syncOrbitFromCamera();
  
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
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  document.addEventListener('wheel', onSceneWheel, { passive: false });

  // Scroll Parallax Listener for Hero
  if (heroContainer) {
    heroContainer.addEventListener('scroll', onHeroScroll, { passive: true });
    heroContainer.addEventListener('wheel', onHeroWheel, { passive: false });
    heroContainer.addEventListener('touchstart', onHeroTouchStart, { passive: true });
    heroContainer.addEventListener('touchend', onHeroTouchEnd, { passive: true });
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

  const ringGeo = new THREE.TorusGeometry(1.05, 0.018, 8, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.visible = false;
  scene.add(selectionRing);
}

function createDeepSpaceEffects() {
  const starCount = prefersReducedMotion || isCoarsePointer ? 220 : 520;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const radius = 24 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starField = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0x7dfcff,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(starField);

  dataRibbonGroup = new THREE.Group();
  const ribbonCount = prefersReducedMotion || isCoarsePointer ? 2 : 5;
  for (let i = 0; i < ribbonCount; i++) {
    const points = [];
    const radius = 4.5 + i * 2.2;
    for (let step = 0; step <= 180; step++) {
      const angle = step * 0.08 + i;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(step * 0.12 + i) * 0.7,
        Math.sin(angle) * radius
      ));
    }
    const ribbonGeo = new THREE.BufferGeometry().setFromPoints(points);
    const ribbonMat = new THREE.LineBasicMaterial({
      color: i % 2 ? 0xff0055 : 0x00f0ff,
      transparent: true,
      opacity: 0.08
    });
    dataRibbonGroup.add(new THREE.Line(ribbonGeo, ribbonMat));
  }
  scene.add(dataRibbonGroup);
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

    const hitGeo = new THREE.SphereGeometry(isCoarsePointer ? 0.95 : 0.7, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { project: proj, node: nodeMesh };
    nodeMesh.add(hitMesh);
    projectHitTargets.push(hitMesh);
    
    nodesGroup.add(nodeMesh);
    projectNodes.push(nodeMesh);
    projectNodeById.set(proj.id, nodeMesh);
    
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

function buildRelatedProjectEdges() {
  const scoredPairs = new Map();
  const degree = new Map();
  const maxEdgesPerNode = isCoarsePointer ? 2 : 3;
  const maxEdges = isCoarsePointer ? 24 : 36;

  manualRelationHints.forEach(([from, to]) => {
    scoredPairs.set(getEdgeKey(from, to), { from, to, score: 10 });
  });

  for (let i = 0; i < USSY_PROJECTS.length; i++) {
    for (let j = i + 1; j < USSY_PROJECTS.length; j++) {
      const a = USSY_PROJECTS[i];
      const b = USSY_PROJECTS[j];
      const sharedTags = a.tags.filter(tag => b.tags.includes(tag) && !ignoredRelationTags.has(tag));
      let score = sharedTags.length * 2;
      if (a.category === b.category) score += 1.5;
      if (a.status === b.status) score += 0.4;
      if (score < 3) continue;

      const key = getEdgeKey(a.id, b.id);
      const existing = scoredPairs.get(key);
      if (!existing || existing.score < score) {
        scoredPairs.set(key, { from: a.id, to: b.id, score });
      }
    }
  }

  Array.from(scoredPairs.values())
    .sort((a, b) => b.score - a.score)
    .forEach(edge => {
      if (relationshipEdges.length >= maxEdges) return;
      if ((degree.get(edge.from) || 0) >= maxEdgesPerNode) return;
      if ((degree.get(edge.to) || 0) >= maxEdgesPerNode) return;

      const fromNode = projectNodeById.get(edge.from);
      const toNode = projectNodeById.get(edge.to);
      if (!fromNode || !toNode) return;

      relationshipEdges.push({ ...edge, fromNode, toNode });
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    });

  const positions = new Float32Array(relationshipEdges.length * 6);
  const colors = new Float32Array(relationshipEdges.length * 6);
  relationshipEdges.forEach((edge, idx) => {
    const colorA = getCategoryColor(edge.fromNode.userData.project.category);
    const colorB = getCategoryColor(edge.toNode.userData.project.category);
    colorA.toArray(colors, idx * 6);
    colorB.toArray(colors, idx * 6 + 3);
  });

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  edgeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  relationshipEdgesMesh = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  connectionsGroup.add(relationshipEdgesMesh);

  const selectedGeo = new THREE.BufferGeometry();
  selectedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(selectedEdgeLimit * 6), 3));
  selectedEdgesMesh = new THREE.LineSegments(
    selectedGeo,
    new THREE.LineBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  selectedEdgesMesh.geometry.setDrawRange(0, 0);
  connectionsGroup.add(selectedEdgesMesh);
}

function getEdgeKey(from, to) {
  return from < to ? `${from}:${to}` : `${to}:${from}`;
}

function getCategoryColor(categoryId) {
  const category = USSY_CATEGORIES[categoryId];
  return new THREE.Color(category ? category.color : '#00f0ff');
}

function updateRelationshipEdges() {
  if (!relationshipEdgesMesh) return;

  const positions = relationshipEdgesMesh.geometry.attributes.position.array;
  relationshipEdges.forEach((edge, idx) => {
    const offset = idx * 6;
    if (!edge.fromNode.visible || !edge.toNode.visible) {
      positions.fill(0, offset, offset + 6);
      return;
    }
    positions[offset] = edge.fromNode.position.x;
    positions[offset + 1] = edge.fromNode.position.y;
    positions[offset + 2] = edge.fromNode.position.z;
    positions[offset + 3] = edge.toNode.position.x;
    positions[offset + 4] = edge.toNode.position.y;
    positions[offset + 5] = edge.toNode.position.z;
  });
  relationshipEdgesMesh.geometry.attributes.position.needsUpdate = true;
  updateSelectedRelationEdges();
}

function updateSelectedRelationEdges() {
  if (!selectedEdgesMesh || !selectedNode) {
    if (selectedEdgesMesh) selectedEdgesMesh.geometry.setDrawRange(0, 0);
    return;
  }

  const selectedEdges = getRelatedEdgesForProject(selectedNode.userData.project.id)
    .filter(edge => edge.fromNode.visible && edge.toNode.visible)
    .slice(0, selectedEdgeLimit);
  const positions = selectedEdgesMesh.geometry.attributes.position.array;
  positions.fill(0);

  selectedEdges.forEach((edge, idx) => {
    const offset = idx * 6;
    positions[offset] = edge.fromNode.position.x;
    positions[offset + 1] = edge.fromNode.position.y;
    positions[offset + 2] = edge.fromNode.position.z;
    positions[offset + 3] = edge.toNode.position.x;
    positions[offset + 4] = edge.toNode.position.y;
    positions[offset + 5] = edge.toNode.position.z;
  });
  selectedEdgesMesh.geometry.setDrawRange(0, selectedEdges.length * 2);
  selectedEdgesMesh.geometry.attributes.position.needsUpdate = true;
}

function getRelatedEdgesForProject(projectId) {
  return relationshipEdges.filter(edge => edge.from === projectId || edge.to === projectId);
}

function ensureProjectHowSection() {
  if (inspectHowBody || !inspectDesc) return;

  inspectHowLabel = document.createElement('div');
  inspectHowLabel.className = 'inspector-section-lbl';
  inspectHowLabel.innerText = '[HOW_IT_WORKS]';

  inspectHowBody = document.createElement('div');
  inspectHowBody.className = 'inspector-how-body';

  inspectDesc.insertAdjacentElement('afterend', inspectHowBody);
  inspectDesc.insertAdjacentElement('afterend', inspectHowLabel);
}

function getProjectHowCopy(proj) {
  if (PROJECT_HOW_COPY[proj.id]) return PROJECT_HOW_COPY[proj.id];
  const specs = proj.specs ? Object.entries(proj.specs).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join('; ') : 'project-specific runtime details';
  const features = proj.features ? proj.features.slice(0, 2).join(', ') : 'the core workflow';
  return `${proj.name} combines ${specs} with ${features}. The project is mapped here as a ${USSY_CATEGORIES[proj.category]?.title || 'Ussyverse'} node so its implementation details, related systems, and source links can be inspected together.`;
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
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Inspect ${proj.name}`);
    
    const isStable = proj.status === 'Stable';
    const statusClass = isStable ? 'stable' : 'active-state';
    
      const cat = USSY_CATEGORIES[proj.category];
      item.innerHTML = `
        <div class="project-item-main">
          <span class="project-name">${proj.name}</span>
          <span class="project-meta">${cat ? cat.title : 'Ussyverse'} // ${proj.status}</span>
        </div>
        <div class="status-dot ${statusClass}"></div>
      `;
    
    item.addEventListener('click', () => {
      selectProject(proj.id, true);
    });
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectProject(proj.id, true);
      }
    });
    
    projectsScrollList.appendChild(item);
  });
}

function setupUIEventListeners() {
  // Category Filtering
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', card.classList.contains('active') ? 'true' : 'false');
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      cards.forEach(c => c.setAttribute('aria-pressed', 'false'));
      card.classList.add('active');
      card.setAttribute('aria-pressed', 'true');
      activeCategory = card.dataset.category;
      
      populateProjectsUI();
      
      projectNodes.forEach(node => {
        const proj = node.userData.project;
        const matches = activeCategory === 'all' || proj.category === activeCategory;
        
        node.visible = matches;
        node.userData.connectionLine.visible = matches;
      });
      updateRelationshipEdges();
      
      projectLabels.forEach(label => {
        const matches = activeCategory === 'all' || label.object3d.userData.project.category === activeCategory;
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
    dot.tabIndex = 0;
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', `Scroll to ${dot.innerText || 'section'}`);
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
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dot.click();
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
    item.setAttribute('aria-current', item.dataset.id === projId ? 'true' : 'false');
  });
  
  projectLabels.forEach(l => {
    l.element.classList.toggle('active', l.element.dataset.id === projId);
  });

  projectNodes.forEach(node => {
    const isSelected = node.userData.project.id === projId;
    const isRelated = getRelatedEdgesForProject(projId).some(edge => edge.fromNode === node || edge.toNode === node);
    node.scale.setScalar(isSelected ? 1.5 : 1);
    node.material.opacity = isSelected ? 1.0 : (isRelated ? 0.82 : 0.5);
    node.userData.connectionLine.material.opacity = isSelected ? 0.6 : 0.15;
  });
  updateSelectedRelationEdges();

  inspectTitle.innerText = proj.name.toUpperCase();
  
  const cat = USSY_CATEGORIES[proj.category];
  inspectCategory.innerText = cat ? cat.title.toUpperCase() : "USSYVERSE CORE";
  inspectCategory.style.borderColor = "rgba(148, 163, 184, 0.24)";
  inspectCategory.style.color = "rgba(203, 213, 225, 0.78)";
  
  inspectDesc.innerText = proj.description;
  ensureProjectHowSection();
  inspectHowBody.innerText = getProjectHowCopy(proj);
  
  inspectTags.innerHTML = '';
  proj.tags.forEach(t => {
    const isSpecial = t === 'Featured' || t.includes('Stable') || t.includes('Active');
    const badge = document.createElement('span');
    badge.className = `tag-badge ${isSpecial ? 'special' : ''}`;
    badge.innerText = t;
    inspectTags.appendChild(badge);
  });
  getRelatedEdgesForProject(proj.id).slice(0, 4).forEach(edge => {
    const relatedProj = edge.from === proj.id ? edge.toNode.userData.project : edge.fromNode.userData.project;
    const badge = document.createElement('span');
    badge.className = 'tag-badge orbit-link-badge';
    badge.innerText = `ORBIT: ${relatedProj.name}`;
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
    syncOrbitFromCamera();
  }
}

// Mode Transitions
function activateConsoleMode() {
  isConsoleActive = true;
  document.body.classList.add('console-active');
  
  // Set camera to initial focus view
  camTarget.pos.set(0, 4, 18);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  
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
  updateSelectedRelationEdges();
  
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
  const lastSectionIdx = sectionCamPositions.length - 1;
  const sectionIdx = Math.min(Math.round(scrollTop / clientHeight), lastSectionIdx);
  
  // Update nav dot active class
  const navDots = document.querySelectorAll('.nav-dot');
  navDots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === sectionIdx);
    dot.setAttribute('aria-current', idx === sectionIdx ? 'step' : 'false');
  });
  
  // Increase particle speed on rapid scrolls
  coreOuterParticles.rotation.y -= scrollRatio * 0.005;
  
}

function isOnFinalHeroCard() {
  if (!heroContainer) return false;
  const clientHeight = heroContainer.clientHeight || window.innerHeight;
  const finalCardTop = (sectionCamPositions.length - 1) * clientHeight;
  return heroContainer.scrollTop >= finalCardTop - 8;
}

function onHeroWheel(event) {
  if (isConsoleActive) return;
  if (event.deltaY > 18 && isOnFinalHeroCard()) {
    event.preventDefault();
    activateConsoleMode();
  }
}

function onHeroTouchStart(event) {
  if (event.touches.length > 0) {
    heroTouchStartY = event.touches[0].clientY;
  }
}

function onHeroTouchEnd(event) {
  if (isConsoleActive || !isOnFinalHeroCard() || event.changedTouches.length === 0) return;
  const deltaY = heroTouchStartY - event.changedTouches[0].clientY;
  if (deltaY > 32) {
    activateConsoleMode();
  }
}

function resetCameraView() {
  if (!isConsoleActive) return;
  camTarget.pos.set(0, 4, 18);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(1);
    node.material.opacity = 0.85;
    node.userData.connectionLine.material.opacity = 0.15;
  });
  updateSelectedRelationEdges();
  
  document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.floating-node-label').forEach(lbl => lbl.classList.remove('active'));
}

canvasContainer.addEventListener('dblclick', resetCameraView);

// 4. Input Events
function updatePointerFromClient(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  telemetryCoord.innerText = `X: ${mouse.x.toFixed(2)} Y: ${mouse.y.toFixed(2)} Z: 0.00`;
}

function getInteractiveHits() {
  raycaster.setFromCamera(mouse, camera);
  const visibleTargets = projectHitTargets.filter(h => h.parent && h.parent.visible);
  return raycaster.intersectObjects(visibleTargets, true);
}

function syncOrbitFromCamera() {
  const offset = new THREE.Vector3().copy(camTarget.pos).sub(camTarget.lookAt);
  orbitState.distance = THREE.MathUtils.clamp(offset.length(), orbitState.minDistance, orbitState.maxDistance);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  orbitState.theta = spherical.theta;
  orbitState.phi = THREE.MathUtils.clamp(spherical.phi, Math.PI * 0.12, Math.PI * 0.82);
}

function applyOrbitToCamera() {
  orbitState.phi = THREE.MathUtils.clamp(orbitState.phi, Math.PI * 0.12, Math.PI * 0.82);
  orbitState.distance = THREE.MathUtils.clamp(orbitState.distance, orbitState.minDistance, orbitState.maxDistance);
  const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(
    orbitState.distance,
    orbitState.phi,
    orbitState.theta
  ));
  camTarget.pos.copy(camTarget.lookAt).add(offset);
}

function onPointerDown(event) {
  if (!isConsoleActive || event.button !== 0) return;
  if (event.target.closest && (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive'))) return;

  orbitState.dragging = true;
  orbitState.moved = false;
  orbitState.pointerId = event.pointerId;
  orbitState.lastX = event.clientX;
  orbitState.lastY = event.clientY;
  orbitState.captureTarget = event.target;
  if (orbitState.captureTarget.setPointerCapture) {
    orbitState.captureTarget.setPointerCapture(event.pointerId);
  }
  document.body.classList.add('scene-dragging');
}

function onPointerMove(event) {
  if (!orbitState.dragging || orbitState.pointerId !== event.pointerId) return;

  const dx = event.clientX - orbitState.lastX;
  const dy = event.clientY - orbitState.lastY;
  orbitState.lastX = event.clientX;
  orbitState.lastY = event.clientY;

  if (Math.abs(dx) + Math.abs(dy) > 3) orbitState.moved = true;
  orbitState.theta -= dx * orbitState.rotateSpeed;
  orbitState.phi -= dy * orbitState.rotateSpeed;
  applyOrbitToCamera();
}

function onPointerUp(event) {
  if (orbitState.pointerId !== event.pointerId) return;
  orbitState.dragging = false;
  orbitState.pointerId = null;
  orbitState.captureTarget = null;
  document.body.classList.remove('scene-dragging');
}

function onSceneWheel(event) {
  if (!isConsoleActive || isCoarsePointer) return;
  if (event.target.closest && (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive'))) return;
  event.preventDefault();
  orbitState.distance += event.deltaY * orbitState.zoomSpeed * orbitState.distance;
  applyOrbitToCamera();
}

function onMouseMove(event) {
  customCursor.style.left = event.clientX + 'px';
  customCursor.style.top = event.clientY + 'px';
  updatePointerFromClient(event.clientX, event.clientY);
}

function onTouchStart(event) {
  if (event.touches.length > 0) {
    updatePointerFromClient(event.touches[0].clientX, event.touches[0].clientY);
  }
}

function onSceneClick(event) {
  // Disable clicks while simply reading/scrolling hero overlay
  if (!isConsoleActive) return;
  if (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive')) return;
  if (orbitState.moved) {
    orbitState.moved = false;
    return;
  }
  
  updatePointerFromClient(event.clientX, event.clientY);
  const intersects = getInteractiveHits();
  
  if (intersects.length > 0) {
    const hitNode = intersects[0].object.userData.node || intersects[0].object;
    selectProject(hitNode.userData.project.id, true);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.35 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 5. Engine Animation Loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const startTime = performance.now();
  
  // Slow background rotation for holographic core
  if (!prefersReducedMotion) {
    coreMesh.rotation.y += 0.002;
    coreMesh.rotation.x += 0.0008;
    coreOuterParticles.rotation.y -= 0.0006;
    coreOuterParticles.rotation.x -= 0.0003;
  }
  if (starField && !prefersReducedMotion) {
    starField.rotation.y += 0.00008;
    starField.rotation.x += 0.00003;
  }
  if (dataRibbonGroup && !prefersReducedMotion) {
    dataRibbonGroup.rotation.y -= 0.00018;
  }
  
  const pulseScale = prefersReducedMotion ? 1 : 1 + Math.sin(time * 0.0015) * 0.04;
  coreMesh.scale.setScalar(pulseScale);

  // Floating nodes orbits (slow drift)
  const orbitSpeed = 0.0003;
  projectNodes.forEach(node => {
    if (!prefersReducedMotion && selectedNode !== node) {
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
  updateRelationshipEdges();

  // Slow ambient drift of camera coordinates during passive Hero screensaver state
  if (!isConsoleActive && heroContainer) {
    const scrollTop = heroContainer.scrollTop;
    const clientHeight = heroContainer.clientHeight || window.innerHeight;
    const sectionFloat = scrollTop / clientHeight;
    const lastSectionIdx = sectionCamPositions.length - 1;
    const sectionIdx = Math.min(Math.floor(sectionFloat), lastSectionIdx);
    const nextSectionIdx = Math.min(sectionIdx + 1, lastSectionIdx);
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
    const intersects = getInteractiveHits();
    
    if (intersects.length > 0) {
      const node = intersects[0].object.userData.node || intersects[0].object;
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

  if (selectionRing) {
    if (isConsoleActive && selectedNode) {
      selectionRing.visible = true;
      selectionRing.position.lerp(selectedNode.position, 0.18);
      selectionRing.lookAt(camera.position);
      selectionRing.scale.setScalar(1 + Math.sin(time * 0.004) * 0.08);
      selectionRing.material.opacity = THREE.MathUtils.lerp(selectionRing.material.opacity, 0.75, 0.12);
    } else {
      selectionRing.material.opacity = THREE.MathUtils.lerp(selectionRing.material.opacity, 0, 0.12);
      if (selectionRing.material.opacity < 0.02) selectionRing.visible = false;
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
    
    label.object3d.getWorldPosition(labelTempVec);
    labelTempVec.project(camera);
    
    if (labelTempVec.z > 1 || labelTempVec.z < -1) {
      label.element.style.opacity = 0;
      return;
    }
    
    const x = (labelTempVec.x *  .5 + .5) * window.innerWidth;
    const y = (labelTempVec.y * -.5 + .5) * window.innerHeight;
    
    label.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -130%)`;
    
    const dist = camera.position.distanceTo(label.object3d.position);
    if (dist < 2.0 && label.object3d !== selectedNode) {
      label.element.style.opacity = Math.max(0, (dist - 1.2) * 1.2);
    } else {
      label.element.style.opacity = label.object3d === selectedNode ? 1 : 0.8;
    }
  });

  // Telemetry framerate diagnostics
  const endTime = performance.now();
  telemetryTimer.innerText = `TELEMETRY_LOAD: ${(endTime - startTime).toFixed(2)}ms // DRAW_CALLS: ${renderer.info.render.calls}`;
}

// Start Application
window.onload = init;

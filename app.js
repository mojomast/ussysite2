// --- USSYVERSE 3D CYBERNETIC ENGINE --- //

let scene, camera, renderer;
let coreGroup, nodesGroup, connectionsGroup;
let coreMesh, coreOuterParticles;
let raycaster, mouse;
let hoveredNode = null;
let selectedNode = null;
let activeCategory = 'all';
let isConsoleActive = false; // Hero state by default
let isFlightActive = false;
let heroTouchStartY = 0;
let pointerDirty = true;
let pointLight1, pointLight2; // Global lights for scroll snap neon shifts
let starField, milkyWayField, brightStarField, dataRibbonGroup, selectionRing, relationshipEdgesMesh, selectedEdgesMesh;
let telemetryLastUpdate = 0;
let launchCodeBuffer = '';
let gameRoot, playerShip, flightNavLine;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const projectHitTargets = [];
const projectNodeById = new Map();
const relationshipEdges = [];
const selectedEdgeLimit = 8;
const labelTempVec = new THREE.Vector3();
const tempCamBase = new THREE.Vector3();
const tempCamDrift = new THREE.Vector3();
const tempColor1 = new THREE.Color();
const tempColor2 = new THREE.Color();
const flightForward = new THREE.Vector3();
const flightRight = new THREE.Vector3();
const flightUp = new THREE.Vector3();
const flightTempVec = new THREE.Vector3();
const flightTempVec2 = new THREE.Vector3();
const radarTempVec = new THREE.Vector3();
const navTempVec = new THREE.Vector3();
const navTempVec2 = new THREE.Vector3();
const navScreenVec = new THREE.Vector3();
const flightNavQuat = new THREE.Quaternion();
const flightNavMatrix = new THREE.Matrix4();
const flightBeamAxis = new THREE.Vector3(0, 1, 0);
const flightQuat = new THREE.Quaternion();
const flightInputQuat = new THREE.Quaternion();
const flightEuler = new THREE.Euler(0, 0, 0, 'YXZ');
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
const manualFlightKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);
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
  maxDistance: 82,
  rotateSpeed: 0.005,
  zoomSpeed: 0.0015
};

const flightState = {
  keys: new Set(),
  mouseButtons: new Set(),
  pos: new THREE.Vector3(0, 2.2, 16),
  vel: new THREE.Vector3(),
  orientation: new THREE.Quaternion(),
  yaw: 0,
  pitch: 0,
  roll: 0,
  view: 'cockpit',
  pointerLocked: false,
  score: 0,
  shield: 100,
  armor: 100,
  energy: 100,
  ammo: 240,
  missiles: 8,
  lastTime: 0,
  lastShot: 0,
  lastMissile: 0,
  nearestNode: null,
  nearestDistance: Infinity,
  crosshairNode: null,
  navNode: null,
  navDistance: Infinity,
  navEta: '--',
  autopilot: false,
  status: 'TYPE USSY TO LAUNCH',
  statusUntil: 0,
  landed: false,
  lastHudUpdate: 0,
  mouseSensitivity: 0.0022,
  thrust: 14,
  strafe: 8,
  damping: 0.985,
  fireCooldown: 140,
  missileCooldown: 900,
  laserEnergyCost: 2.5,
  missileEnergyCost: 18,
  enemyFireCooldown: 1500
};

const enemies = [];
const playerBullets = [];
const enemyBullets = [];
const playerMissiles = [];
const maxEnemies = 7;
const maxPlayerBullets = 32;
const maxEnemyBullets = 28;
const maxPlayerMissiles = 8;
const maxPlayerAmmo = 240;
const maxPlayerMissilesStored = 8;
const constellationScale = 2.25;
const flightUniverseScale = 10;
const nodeBaseScale = 1.65;
const landingRange = 7.2;
const flightBounds = 135;
const radarRange = 140;
let radarLastUpdate = 0;
let activeUniverseScale = 1;

const missionState = {
  active: false,
  step: 'idle',
  killGoal: 5,
  kills: 0,
  landingProjectId: 'devussy'
};

const gameMessageState = {
  active: false,
  type: 'MISSION',
  source: 'USSYVERSE CONTROL',
  text: '',
  shown: '',
  index: 0,
  nextTypeAt: 0,
  typeSpeed: 18,
  choices: [],
  onDismiss: null
};

const missionIntroText = 'DOGFIGHT LINK ESTABLISHED. CONGRATULATIONS, OPERATOR: YOU FOUND THE USSYVERSE EASTER EGG. YOU ARE NOW PILOTING A SCRAP-CLASS COCKPIT THROUGH THE PROJECT CONSTELLATION. MOUSELOOK TO AIM, W/S TO THRUST, A/D TO STRAFE, Q/E TO ROLL, LEFT CLICK FOR LASERS, RIGHT CLICK FOR MISSILES, V TO SET NAV, P FOR AUTOPILOT, C FOR CHASE CAM, SPACE TO CONFIRM MESSAGES, L TO LAND AND RESTOCK. FIRST OBJECTIVE: HUNT DOWN 5 TUTORIAL BOGEYS AS THEY TELEPORT INTO THE AO.';

const ttsEngine = {
  supported: 'speechSynthesis' in window,
  enabled: true,
  activeVoice: null,

  speak(text, options = {}) {
    if (!this.supported || !this.enabled || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.1;
    utterance.pitch = options.pitch ?? 0.85;
    utterance.volume = options.volume ?? 0.9;

    if (options.voice) {
      utterance.voice = typeof options.voice === 'string' ? this.setVoice(options.voice) : options.voice;
    } else if (this.activeVoice) {
      utterance.voice = this.activeVoice;
    }

    window.speechSynthesis.speak(utterance);
  },

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  },

  setVoice(voiceNameFragment = '') {
    if (!this.supported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const requested = voiceNameFragment.toLowerCase();
    const requestedVoice = requested
      ? voices.find(voice => `${voice.name} ${voice.lang}`.toLowerCase().includes(requested))
      : null;
    const preferredNames = ['google uk english male', 'daniel', 'alex'];
    const preferredVoice = voices.find(voice => preferredNames.some(name => voice.name.toLowerCase().includes(name)));
    const englishVoice = voices.find(voice => voice.lang.toLowerCase().startsWith('en'));

    this.activeVoice = requestedVoice || preferredVoice || englishVoice || voices[0];
    return this.activeVoice;
  },

  initVoices() {
    return this.setVoice();
  }
};

if (ttsEngine.supported) {
  window.speechSynthesis.onvoiceschanged = () => ttsEngine.initVoices();
  document.addEventListener('DOMContentLoaded', () => ttsEngine.initVoices());
}

function getRenderPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1 : 1.25);
}

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
const flightHud = document.getElementById('flight-hud');
const ttsStatus = document.getElementById('tts-status');
const flightStatus = document.getElementById('flight-status');
const flightScore = document.getElementById('flight-score');
const flightShield = document.getElementById('flight-shield');
const flightTarget = document.getElementById('flight-target');
const flightCrosshairTarget = document.getElementById('flight-crosshair-target');
const flightNavTarget = document.getElementById('flight-nav-target');
const flightNavEta = document.getElementById('flight-nav-eta');
const flightAutopilot = document.getElementById('flight-autopilot');
const flightNavMarker = document.getElementById('flight-nav-marker');
const flightSpeed = document.getElementById('flight-speed');
const flightSpeedBar = document.getElementById('flight-speed-bar');
const flightShieldsDetail = document.getElementById('flight-shields-detail');
const flightShieldBar = document.getElementById('flight-shield-bar');
const flightEnergy = document.getElementById('flight-energy');
const flightEnergyBar = document.getElementById('flight-energy-bar');
const flightArmor = document.getElementById('flight-armor');
const flightArmorBar = document.getElementById('flight-armor-bar');
const flightAmmo = document.getElementById('flight-ammo');
const flightAmmoBar = document.getElementById('flight-ammo-bar');
const flightMissiles = document.getElementById('flight-missiles');
const flightMissileBar = document.getElementById('flight-missile-bar');
const gameMessageSystem = document.getElementById('game-message-system');
const gameMessageType = document.getElementById('game-message-type');
const gameMessageSource = document.getElementById('game-message-source');
const gameMessageBody = document.getElementById('game-message-body');
const gameMessageChoices = document.getElementById('game-message-choices');
const cockpitRadar = document.getElementById('cockpit-radar');
const radarCtx = cockpitRadar ? cockpitRadar.getContext('2d', { alpha: true }) : null;

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
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(getRenderPixelRatio());
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
  createFlightGameObjects();
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
  document.addEventListener('contextmenu', onSceneContextMenu);
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  document.addEventListener('wheel', onSceneWheel, { passive: false });
  document.addEventListener('keydown', onGlobalKeyDown);
  document.addEventListener('keyup', onGlobalKeyUp);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);
  window.addEventListener('blur', clearFlightInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearFlightInput();
  });

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
  const particleCount = prefersReducedMotion || isCoarsePointer ? 260 : 380;
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
    opacity: 0.55,
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
  const starCount = prefersReducedMotion ? 900 : (isCoarsePointer ? 1100 : 2400);
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 32;
  starCanvas.height = 32;
  const starCtx = starCanvas.getContext('2d');
  const starGrad = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  starGrad.addColorStop(0, 'rgba(255,255,255,1)');
  starGrad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  starGrad.addColorStop(1, 'rgba(255,255,255,0)');
  starCtx.fillStyle = starGrad;
  starCtx.fillRect(0, 0, 32, 32);
  const starTexture = new THREE.CanvasTexture(starCanvas);
  const colorPalette = [
    new THREE.Color(0xdce7ff),
    new THREE.Color(0xf4f0df),
    new THREE.Color(0xb8caff),
    new THREE.Color(0xffdfb0)
  ];

  for (let i = 0; i < starCount; i++) {
    const radius = 28 + Math.pow(Math.random(), 0.45) * 92;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const intensity = 0.45 + Math.pow(Math.random(), 3) * 0.55;
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starField = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: isCoarsePointer ? 0.55 : 0.42,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  scene.add(starField);

  const bandCount = prefersReducedMotion ? 360 : (isCoarsePointer ? 520 : 1200);
  const bandGeo = new THREE.BufferGeometry();
  const bandPositions = new Float32Array(bandCount * 3);
  const bandColors = new Float32Array(bandCount * 3);
  const bandColorA = new THREE.Color(0x9fb2df);
  const bandColorB = new THREE.Color(0xf0d4aa);

  for (let i = 0; i < bandCount; i++) {
    const spread = (Math.random() - 0.5) * 86;
    const thickness = (Math.random() - 0.5) * (5 + Math.random() * 9);
    const depth = -58 - Math.random() * 36;
    bandPositions[i * 3] = spread;
    bandPositions[i * 3 + 1] = thickness + Math.sin(spread * 0.08) * 3.5;
    bandPositions[i * 3 + 2] = depth + (Math.random() - 0.5) * 18;

    const color = Math.random() > 0.72 ? bandColorB : bandColorA;
    const intensity = 0.18 + Math.pow(Math.random(), 2) * 0.34;
    bandColors[i * 3] = color.r * intensity;
    bandColors[i * 3 + 1] = color.g * intensity;
    bandColors[i * 3 + 2] = color.b * intensity;
  }

  bandGeo.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3));
  bandGeo.setAttribute('color', new THREE.BufferAttribute(bandColors, 3));
  milkyWayField = new THREE.Points(
    bandGeo,
    new THREE.PointsMaterial({
      size: isCoarsePointer ? 0.85 : 0.7,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  milkyWayField.rotation.z = -0.38;
  milkyWayField.rotation.y = 0.18;
  scene.add(milkyWayField);

  const brightCount = prefersReducedMotion ? 10 : (isCoarsePointer ? 14 : 30);
  const brightGeo = new THREE.BufferGeometry();
  const brightPositions = new Float32Array(brightCount * 3);
  const brightColors = new Float32Array(brightCount * 3);

  for (let i = 0; i < brightCount; i++) {
    const radius = 42 + Math.random() * 76;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    brightPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    brightPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    brightPositions[i * 3 + 2] = radius * Math.cos(phi);

    const color = Math.random() > 0.5 ? new THREE.Color(0xfff2cf) : new THREE.Color(0xd9e7ff);
    brightColors[i * 3] = color.r;
    brightColors[i * 3 + 1] = color.g;
    brightColors[i * 3 + 2] = color.b;
  }

  brightGeo.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3));
  brightGeo.setAttribute('color', new THREE.BufferAttribute(brightColors, 3));
  brightStarField = new THREE.Points(
    brightGeo,
    new THREE.PointsMaterial({
      size: isCoarsePointer ? 1.65 : 1.25,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  scene.add(brightStarField);

  dataRibbonGroup = new THREE.Group();
  const ribbonCount = prefersReducedMotion || isCoarsePointer ? 0 : 1;
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
      opacity: 0.025
    });
    dataRibbonGroup.add(new THREE.Line(ribbonGeo, ribbonMat));
  }
  scene.add(dataRibbonGroup);
}

function createFlightGameObjects() {
  gameRoot = new THREE.Group();
  gameRoot.visible = false;
  scene.add(gameRoot);

  playerShip = new THREE.Group();
  const hullMat = new THREE.MeshBasicMaterial({ color: 0xdce7ff, wireframe: true, transparent: true, opacity: 0.92 });
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.72 });
  const engineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.72 });
  const weaponMat = new THREE.MeshBasicMaterial({ color: 0xff3355, wireframe: true, transparent: true, opacity: 0.82 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.45, 6), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = -0.05;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.72, 6), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.92;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.2), hullMat);
  tail.position.z = 0.68;
  playerShip.add(fuselage, nose, tail);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), engineMat);
  cockpit.scale.set(0.85, 0.48, 1.25);
  cockpit.position.set(0, 0.13, -0.42);
  playerShip.add(cockpit);

  const foilGeo = new THREE.BoxGeometry(0.92, 0.035, 0.25);
  const engineGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.36, 8);
  const cannonGeo = new THREE.BoxGeometry(0.025, 0.025, 0.82);
  [-1, 1].forEach(side => {
    [-1, 1].forEach(layer => {
      const foil = new THREE.Mesh(foilGeo, wingMat);
      foil.position.set(side * 0.52, layer * 0.13, 0.04);
      foil.rotation.z = side * layer * 0.24;
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.38, layer * 0.11, 0.31);
      const cannon = new THREE.Mesh(cannonGeo, weaponMat);
      cannon.position.set(side * 0.93, layer * 0.22, -0.12);
      playerShip.add(foil, engine, cannon);
    });
  });
  gameRoot.add(playerShip);

  const enemyBodyGeo = new THREE.SphereGeometry(0.32, 10, 8);
  const enemyBodyMat = new THREE.MeshBasicMaterial({ color: 0xff3355, wireframe: true, transparent: true, opacity: 0.95 });
  const enemyWingGeo = new THREE.BoxGeometry(0.08, 1.05, 1.05);
  const enemyWingMat = new THREE.MeshBasicMaterial({ color: 0xb8c4d8, wireframe: true, transparent: true, opacity: 0.78 });
  const enemyStrutGeo = new THREE.BoxGeometry(0.78, 0.05, 0.05);
  const enemyStrutMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.65 });
  for (let i = 0; i < maxEnemies; i++) {
    const enemy = new THREE.Group();
    const body = new THREE.Mesh(enemyBodyGeo, enemyBodyMat.clone());
    const leftWing = new THREE.Mesh(enemyWingGeo, enemyWingMat.clone());
    const rightWing = new THREE.Mesh(enemyWingGeo, enemyWingMat.clone());
    const strut = new THREE.Mesh(enemyStrutGeo, enemyStrutMat.clone());
    const antenna = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.48, 5),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.7 })
    );
    leftWing.position.x = -0.55;
    rightWing.position.x = 0.55;
    antenna.rotation.x = -Math.PI / 2;
    antenna.position.z = -0.42;
    enemy.add(body, leftWing, rightWing, strut, antenna);
    enemy.visible = false;
    enemy.userData = { active: false, health: 1, cooldown: 500 + Math.random() * 1200, radius: 0.62 };
    gameRoot.add(enemy);
    enemies.push(enemy);
  }

  const playerBulletGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 6);
  const playerBulletMat = new THREE.MeshBasicMaterial({ color: 0x66ff44, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
  for (let i = 0; i < maxPlayerBullets; i++) {
    const bullet = new THREE.Mesh(playerBulletGeo, playerBulletMat);
    bullet.visible = false;
    bullet.userData = { active: false, velocity: new THREE.Vector3(), life: 0, radius: 0.22 };
    gameRoot.add(bullet);
    playerBullets.push(bullet);
  }

  const enemyBulletGeo = new THREE.CylinderGeometry(0.026, 0.026, 1.55, 6);
  const enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  for (let i = 0; i < maxEnemyBullets; i++) {
    const bullet = new THREE.Mesh(enemyBulletGeo, enemyBulletMat);
    bullet.visible = false;
    bullet.userData = { active: false, velocity: new THREE.Vector3(), life: 0, radius: 0.2 };
    gameRoot.add(bullet);
    enemyBullets.push(bullet);
  }

  const missileGeo = new THREE.ConeGeometry(0.09, 0.72, 8);
  const missileMat = new THREE.MeshBasicMaterial({ color: 0xfff2cf, wireframe: true, transparent: true, opacity: 0.95 });
  for (let i = 0; i < maxPlayerMissiles; i++) {
    const missile = new THREE.Mesh(missileGeo, missileMat);
    missile.visible = false;
    missile.userData = { active: false, velocity: new THREE.Vector3(), life: 0, radius: 0.36, target: null };
    gameRoot.add(missile);
    playerMissiles.push(missile);
  }

  const navLineGeo = new THREE.BufferGeometry();
  navLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  flightNavLine = new THREE.Line(
    navLineGeo,
    new THREE.LineBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    })
  );
  flightNavLine.visible = false;
  gameRoot.add(flightNavLine);
}

// 2. Procedural Nodes Graph
function buildProjectNodes() {
  const count = USSY_PROJECTS.length;
  
  USSY_PROJECTS.forEach((proj, idx) => {
    // Position nodes in an expanding spiral
    const angle = (idx / count) * Math.PI * 2 * 2.5; 
    const radius = (5.5 + (idx / count) * 8.5) * constellationScale;
    const yHeight = ((Math.sin(angle * 2) * 1.5) + (Math.random() * 0.5)) * constellationScale;
    
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
    nodeMesh.userData = { project: proj, baseScale: nodeBaseScale, basePosition: nodeMesh.position.clone() };
    nodeMesh.scale.setScalar(nodeBaseScale);

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

function applyFlightUniverseScale(scale) {
  if (activeUniverseScale === scale) return;
  activeUniverseScale = scale;
  projectNodes.forEach(node => {
    if (!node.userData.basePosition) node.userData.basePosition = node.position.clone();
    node.position.copy(node.userData.basePosition).multiplyScalar(scale);
    const line = node.userData.connectionLine;
    if (line && line.geometry && line.geometry.attributes.position) {
      const position = line.geometry.attributes.position;
      position.setXYZ(1, node.position.x, node.position.y, node.position.z);
      position.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }
  });
  updateRelationshipEdges();
  if (selectedNode && selectionRing) selectionRing.position.copy(selectedNode.position);
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
      if (isFlightActive) return;
      selectProject(proj.id, true);
    });
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isFlightActive) return;
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
      if (isFlightActive) return;
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
    node.scale.setScalar(node.userData.baseScale * (isSelected ? 1.5 : 1));
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
    camTarget.pos.copy(pos).add(dir.multiplyScalar(7.2)).add(new THREE.Vector3(0, 2.4, 0));
    camTarget.lookAt.copy(pos);
    syncOrbitFromCamera();
  }
}

// Mode Transitions
function activateConsoleMode() {
  isConsoleActive = true;
  document.body.classList.add('console-active');
  
  // Set camera to initial focus view
  camTarget.pos.set(0, 8, 38);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  
  if (selectedNode) {
    selectProject(selectedNode.userData.project.id, true);
  }
}

function deactivateConsoleMode() {
  if (isFlightActive) exitFlightMode(false);
  isConsoleActive = false;
  document.body.classList.remove('console-active');
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(node.userData.baseScale);
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

function isTypingTarget(target) {
  return Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]'));
}

function resetCategoryFilterForFlight() {
  activeCategory = 'all';
  document.querySelectorAll('.category-card').forEach(card => {
    const isAll = card.dataset.category === 'all';
    card.classList.toggle('active', isAll);
    card.setAttribute('aria-pressed', isAll ? 'true' : 'false');
  });
  projectNodes.forEach(node => {
    node.visible = true;
    node.userData.connectionLine.visible = true;
  });
  projectLabels.forEach(label => {
    label.element.style.display = 'block';
  });
  populateProjectsUI();
  updateRelationshipEdges();
}

function enterFlightMode() {
  if (!renderer || !renderer.domElement) return;
  if (!isConsoleActive) activateConsoleMode();
  resetCategoryFilterForFlight();

  isFlightActive = true;
  document.body.classList.add('flight-active');
  document.body.classList.toggle('flight-third-person', flightState.view === 'third');
  orbitState.dragging = false;
  document.body.classList.remove('scene-dragging');

  if (gameRoot) gameRoot.visible = true;
  applyFlightUniverseScale(flightUniverseScale);
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  flightState.vel.set(0, 0, 0);
  flightState.score = 0;
  flightState.shield = 100;
  flightState.armor = 100;
  flightState.energy = 100;
  flightState.ammo = maxPlayerAmmo;
  flightState.missiles = maxPlayerMissilesStored;
  flightState.lastTime = 0;
  flightState.lastShot = 0;
  flightState.lastMissile = 0;
  flightState.nearestNode = null;
  flightState.nearestDistance = Infinity;
  flightState.crosshairNode = null;
  flightState.navNode = null;
  flightState.navDistance = Infinity;
  flightState.navEta = '--';
  flightState.autopilot = false;
  flightState.landed = false;
  flightState.statusUntil = 0;
  flightState.status = isCoarsePointer ? 'KEYBOARD FLIGHT READY' : 'REQUESTING MOUSELOOK LOCK';
  flightState.pos.copy(camCurrent.pos.lengthSq() ? camCurrent.pos : camTarget.pos);

  flightTempVec.copy(camCurrent.lookAt).sub(flightState.pos).normalize();
  if (flightTempVec.lengthSq() > 0) {
    flightState.yaw = Math.atan2(-flightTempVec.x, -flightTempVec.z);
    flightState.pitch = THREE.MathUtils.clamp(Math.asin(flightTempVec.y), -1.2, 1.2);
  }
  flightState.roll = 0;
  flightEuler.set(flightState.pitch, flightState.yaw, 0, 'YXZ');
  flightState.orientation.setFromEuler(flightEuler);

  enemies.forEach(enemy => deactivateCombatObject(enemy));
  playerBullets.forEach(bullet => deactivateCombatObject(bullet));
  enemyBullets.forEach(bullet => deactivateCombatObject(bullet));
  playerMissiles.forEach(missile => deactivateCombatObject(missile));

  ttsEngine.speak('USSYVERSE DOGFIGHT MODE ACTIVATED. WELCOME, OPERATOR.', { rate: 1.0, pitch: 0.72 });
  startTutorialMission();
  updateFlightHud(true);
  updateCockpitRadar(0, true);
  if (!isCoarsePointer && renderer.domElement.requestPointerLock) {
    const lockRequest = renderer.domElement.requestPointerLock();
    if (lockRequest && typeof lockRequest.catch === 'function') {
      lockRequest.catch(onPointerLockError);
    }
  }
}

function exitFlightMode(releasePointer = true) {
  ttsEngine.stop();
  isFlightActive = false;
  flightState.pointerLocked = false;
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  flightState.crosshairNode = null;
  flightState.navNode = null;
  flightState.navDistance = Infinity;
  flightState.navEta = '--';
  flightState.autopilot = false;
  flightState.vel.set(0, 0, 0);
  document.body.classList.remove('flight-active', 'pointer-unlocked', 'flight-third-person');
  if (gameRoot) gameRoot.visible = false;
  applyFlightUniverseScale(1);
  enemies.forEach(enemy => deactivateCombatObject(enemy));
  playerBullets.forEach(bullet => deactivateCombatObject(bullet));
  enemyBullets.forEach(bullet => deactivateCombatObject(bullet));
  playerMissiles.forEach(missile => deactivateCombatObject(missile));
  if (releasePointer && document.pointerLockElement === renderer.domElement && document.exitPointerLock) {
    document.exitPointerLock();
  }
  syncOrbitFromCamera();
  gameMessageState.active = false;
  updateFlightNavLine();
  updateFlightNavMarker();
  renderGameMessage();
  updateFlightHud(true);
}

function onPointerLockChange() {
  flightState.pointerLocked = document.pointerLockElement === renderer.domElement;
  if (!flightState.pointerLocked) clearFlightInput();
  document.body.classList.toggle('pointer-unlocked', isFlightActive && !flightState.pointerLocked);
  if (isFlightActive) {
    if (flightState.pointerLocked) {
      flightState.landed = false;
      flightState.status = `MOUSELOOK ${flightState.view.toUpperCase()} VIEW`;
    } else if (performance.now() > flightState.statusUntil) {
      flightState.status = 'CLICK VIEWPORT TO RECAPTURE';
    }
    updateFlightHud(true);
  }
}

function onPointerLockError() {
  if (!isFlightActive) return;
  flightState.pointerLocked = false;
  flightState.status = 'CLICK VIEWPORT TO CAPTURE MOUSELOOK';
  document.body.classList.add('pointer-unlocked');
  clearFlightInput();
  updateFlightHud(true);
}

function clearFlightInput() {
  if (!isFlightActive) return;
  flightState.keys.clear();
  flightState.mouseButtons.clear();
}

function toggleFlightView() {
  flightState.view = flightState.view === 'cockpit' ? 'third' : 'cockpit';
  document.body.classList.toggle('flight-third-person', flightState.view === 'third');
  flightState.status = `${flightState.view.toUpperCase()} VIEW ACTIVE`;
  updateFlightHud(true);
  updateCockpitRadar(0, true);
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function getProjectNodeName(node) {
  return node?.userData?.project?.name || 'UNKNOWN';
}

function updateCrosshairProjectTarget() {
  flightState.crosshairNode = null;
  let bestScore = Infinity;
  projectNodes.forEach(node => {
    if (!node.visible) return;
    navTempVec.copy(node.position).sub(flightState.pos);
    const distance = navTempVec.length();
    if (distance < 0.001) return;
    navTempVec.multiplyScalar(1 / distance);
    const alignment = navTempVec.dot(flightForward);
    if (alignment < 0.988) return;
    const score = (1 - alignment) * 1000 + distance * 0.001;
    if (score < bestScore) {
      bestScore = score;
      flightState.crosshairNode = node;
    }
  });
}

function updateFlightNavigation() {
  updateCrosshairProjectTarget();
  if (!flightState.navNode || !flightState.navNode.visible) {
    flightState.navDistance = Infinity;
    flightState.navEta = '--';
    flightState.autopilot = false;
    updateFlightNavLine();
    return;
  }

  navTempVec.copy(flightState.navNode.position).sub(flightState.pos);
  flightState.navDistance = navTempVec.length();
  const closingSpeed = flightState.navDistance > 0.001
    ? flightState.vel.dot(navTempVec.multiplyScalar(1 / flightState.navDistance))
    : 0;
  flightState.navEta = closingSpeed > 1 ? formatEta(flightState.navDistance / closingSpeed) : '--';
  updateFlightNavLine();
}

function setNavigationTarget(node, source = 'manual') {
  if (!node) return false;
  flightState.navNode = node;
  flightState.navDistance = node.position.distanceTo(flightState.pos);
  flightState.status = `NAV SET: ${getProjectNodeName(node).toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2400;
  if (source === 'manual') selectProject(node.userData.project.id, false);
  updateFlightNavigation();
  updateFlightHud(true);
  return true;
}

function setNavigationFromCrosshair() {
  updateCrosshairProjectTarget();
  if (!flightState.crosshairNode) {
    flightState.status = 'PUT CROSSHAIR ON PROJECT NODE TO SET NAV';
    flightState.statusUntil = performance.now() + 2400;
    updateFlightHud(true);
    return;
  }
  setNavigationTarget(flightState.crosshairNode, 'manual');
}

function toggleAutopilot() {
  if (!flightState.navNode) {
    flightState.status = 'SET NAV TARGET BEFORE AUTOPILOT';
    flightState.statusUntil = performance.now() + 2400;
    updateFlightHud(true);
    return;
  }
  flightState.autopilot = !flightState.autopilot;
  flightState.status = flightState.autopilot ? `AUTOPILOT ENROUTE: ${getProjectNodeName(flightState.navNode).toUpperCase()}` : 'AUTOPILOT DISENGAGED';
  flightState.statusUntil = performance.now() + 2400;
  updateFlightHud(true);
}

function disableAutopilot(reason) {
  if (!flightState.autopilot) return;
  flightState.autopilot = false;
  if (reason) {
    flightState.status = reason;
    flightState.statusUntil = performance.now() + 1800;
  }
}

function updateAutopilot(dt) {
  if (!flightState.autopilot || !flightState.navNode) return;
  navTempVec.copy(flightState.navNode.position).sub(flightState.pos);
  const distance = navTempVec.length();
  const arrivalRange = landingRange * activeUniverseScale * 1.25;
  if (distance <= arrivalRange) {
    disableAutopilot('AUTOPILOT ARRIVAL HOLD');
    flightState.vel.multiplyScalar(Math.pow(0.9, dt * 60));
    return;
  }
  navTempVec.multiplyScalar(1 / distance);
  flightNavMatrix.lookAt(flightState.pos, flightState.navNode.position, flightUp);
  flightNavQuat.setFromRotationMatrix(flightNavMatrix);
  flightState.orientation.slerp(flightNavQuat, Math.min(1, dt * 0.75));
  updateFlightBasis();
  const alignment = flightForward.dot(navTempVec);
  if (alignment > 0.45) {
    const slowZone = arrivalRange * 4;
    const thrustScale = distance < slowZone ? THREE.MathUtils.clamp(distance / slowZone, 0.22, 0.72) : 0.86;
    flightState.vel.addScaledVector(flightForward, flightState.thrust * thrustScale * dt);
  }
  if (distance < arrivalRange * 3) {
    flightState.vel.multiplyScalar(Math.pow(0.965, dt * 60));
  }
}

function updateFlightNavLine() {
  if (!flightNavLine) return;
  const visible = isFlightActive && !!flightState.navNode;
  flightNavLine.visible = visible;
  if (!visible) return;
  const positions = flightNavLine.geometry.attributes.position;
  navTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.4);
  positions.setXYZ(0, navTempVec.x, navTempVec.y, navTempVec.z);
  positions.setXYZ(1, flightState.navNode.position.x, flightState.navNode.position.y, flightState.navNode.position.z);
  positions.needsUpdate = true;
  flightNavLine.geometry.computeBoundingSphere();
}

function getVoicePersona(source = '') {
  const normalizedSource = String(source).toUpperCase();

  if (normalizedSource.includes('USSYVERSE CONTROL')) return { pitch: 0.80, rate: 1.0 };
  if (normalizedSource.includes('DEVUSSY DOCK CONTROL')) return { pitch: 0.75, rate: 1.05 };
  if (normalizedSource.includes('COMBAT SYSTEM')) return { pitch: 0.70, rate: 1.3 };
  if (normalizedSource.includes('NAVIGATION')) return { pitch: 0.88, rate: 0.95 };
  if (normalizedSource.includes('DEVUSSY')) return { pitch: 0.78, rate: 1.05 };
  if (normalizedSource.includes('FACTION')) return { pitch: 0.72, rate: 0.98 };

  return { pitch: 0.82, rate: 1.05 };
}

function showGameMessage({ type = 'MISSION', source = 'USSYVERSE CONTROL', text = '', choices = [], onDismiss = null, typeSpeed = 18 }) {
  gameMessageState.active = true;
  gameMessageState.type = type;
  gameMessageState.source = source;
  gameMessageState.text = text;
  gameMessageState.shown = '';
  gameMessageState.index = 0;
  gameMessageState.nextTypeAt = 0;
  gameMessageState.typeSpeed = typeSpeed;
  gameMessageState.choices = choices;
  gameMessageState.onDismiss = onDismiss;
  renderGameMessage();
  ttsEngine.speak(text, getVoicePersona(source));
}

function renderGameMessage() {
  if (!gameMessageSystem) return;
  gameMessageSystem.classList.toggle('active', gameMessageState.active);
  if (gameMessageType) gameMessageType.textContent = gameMessageState.type;
  if (gameMessageSource) gameMessageSource.textContent = gameMessageState.source;
  if (gameMessageBody) {
    gameMessageBody.textContent = gameMessageState.active && gameMessageState.index < gameMessageState.text.length
      ? `${gameMessageState.shown}_`
      : gameMessageState.text;
  }
  if (gameMessageChoices) {
    gameMessageChoices.innerHTML = '';
    gameMessageState.choices.forEach(choice => {
      const item = document.createElement('div');
      item.className = 'game-message-choice';
      item.innerHTML = `<kbd>${choice.key}</kbd><span>${choice.label}</span>`;
      gameMessageChoices.appendChild(item);
    });
  }
}

function updateGameMessage(time) {
  if (!gameMessageState.active || gameMessageState.index >= gameMessageState.text.length) return;
  if (time < gameMessageState.nextTypeAt) return;
  const chunk = gameMessageState.text.slice(gameMessageState.index, gameMessageState.index + 2);
  gameMessageState.shown += chunk;
  gameMessageState.index += chunk.length;
  gameMessageState.nextTypeAt = time + gameMessageState.typeSpeed;
  renderGameMessage();
}

function dismissGameMessage() {
  if (!gameMessageState.active) return false;
  const callback = gameMessageState.onDismiss;
  gameMessageState.active = false;
  gameMessageState.onDismiss = null;
  renderGameMessage();
  ttsEngine.stop();
  if (callback) callback();
  return true;
}

function handleGameMessageChoice(event) {
  if (!gameMessageState.active || gameMessageState.choices.length === 0) return false;
  const key = event.key.toLowerCase();
  const code = event.code.toLowerCase();
  const choice = gameMessageState.choices.find(item => item.key.toLowerCase() === key || item.code?.toLowerCase() === code);
  if (!choice) return false;
  gameMessageState.active = false;
  renderGameMessage();
  ttsEngine.speak(`${choice.label}`, { rate: 1.1, pitch: 0.9 });
  if (choice.action) choice.action();
  return true;
}

function startTutorialMission() {
  missionState.active = true;
  missionState.kills = 0;
  missionState.step = 'introTyping';
  showGameMessage({
    type: 'EASTER EGG DISCOVERED',
    source: 'USSYVERSE CONTROL',
    text: missionIntroText,
    onDismiss: () => setMissionStep('killTutorialBogeys')
  });
  flightState.status = 'MISSION BRIEFING OPEN';
  flightState.statusUntil = performance.now() + 3500;
}

function setMissionStep(step) {
  missionState.step = step;
  if (step === 'killTutorialBogeys') {
    flightState.landed = false;
    flightState.status = 'TUTORIAL BOGEYS TELEPORTING IN';
    flightState.statusUntil = performance.now() + 2500;
    spawnTutorialBogeys();
    showGameMessage({
      type: 'MISSION OBJECTIVE',
      source: 'USSYVERSE CONTROL',
      text: `OBJECTIVE: SPLASH TUTORIAL BOGEYS 0/${missionState.killGoal}. THEY WILL TELEPORT IN FROM LONG RANGE. USE RADAR CONTACTS TO ACQUIRE THEM, THEN FIRE LASERS OR MISSILES.`
    });
  } else if (step === 'goLandAtProject') {
    const projectName = getMissionLandingProjectName();
    const missionNode = projectNodeById.get(missionState.landingProjectId);
    if (missionNode) setNavigationTarget(missionNode, 'mission');
    showGameMessage({
      type: 'MISSION UPDATE',
      source: 'USSYVERSE CONTROL',
      text: `OBJECTIVE COMPLETE. NAVIGATE TO ${projectName.toUpperCase()} AND LAND WITH L TO RECEIVE YOUR NEXT MISSION PACKAGE.`
    });
    flightState.status = `LAND AT ${projectName.toUpperCase()}`;
    flightState.statusUntil = performance.now() + 3000;
  } else if (step === 'landedHandoff') {
    showGameMessage({
      type: 'INCOMING COMMUNICATION',
      source: 'DEVUSSY DOCK CONTROL',
      text: 'DOCKING CONFIRMED. DEVUSSY HAS REARMED YOUR SHIP AND DELIVERED THE NEXT CONTRACT. THE FULL GAME LOOP IS ONLINE: HUNT BOGEYS, LAND ON PROJECTS, LEARN THE SYSTEM, RESTOCK, AND KEEP MOVING.',
      choices: [
        { key: '1', code: 'Digit1', label: 'ACKNOWLEDGE AND FREE ROAM', action: () => showGameMessage({ type: 'SYSTEM UPDATE', source: 'USSYVERSE CONTROL', text: 'FREE ROAM ENABLED. LAND ON PROJECT NODES TO INSPECT SYSTEMS AND RESTOCK BETWEEN ENGAGEMENTS.' }) },
        { key: '2', code: 'Digit2', label: 'REQUEST MORE CONTRACTS', action: () => showGameMessage({ type: 'FACTION COMMS', source: 'DEVUSSY DOCK CONTROL', text: 'CONTRACT BOARD IS BEING ASSEMBLED. FOR NOW, KEEP THE CONSTELLATION CLEAR AND MAP PROJECT NODES.' }) }
      ]
    });
    flightState.status = 'MISSION HANDOFF RECEIVED';
    flightState.statusUntil = performance.now() + 3000;
  }
}

function updateMission(time) {
  if (!missionState.active) return;
  updateGameMessage(time);
}

function registerMissionKill() {
  if (!missionState.active || missionState.step !== 'killTutorialBogeys') return;
  missionState.kills = Math.min(missionState.killGoal, missionState.kills + 1);
  if (missionState.kills >= missionState.killGoal) {
    enemies.forEach(enemy => deactivateCombatObject(enemy));
    setMissionStep('goLandAtProject');
  } else {
    const killCallouts = ['SPLASH ONE', 'BOGEY DOWN', 'KILL CONFIRMED', 'TARGET ELIMINATED'];
    ttsEngine.speak(killCallouts[Math.floor(Math.random() * killCallouts.length)], { rate: 1.3, pitch: 0.75, volume: 0.85 });
    showGameMessage({
      type: 'MISSION PROGRESS',
      source: 'COMBAT SYSTEM',
      text: `BOGEY DESTROYED. OBJECTIVE PROGRESS: ${missionState.kills}/${missionState.killGoal}. CONTINUE SWEEPING RADAR.`
    });
  }
}

function handleMissionLanding(project) {
  if (!missionState.active || missionState.step !== 'goLandAtProject') return true;
  if (project.id !== missionState.landingProjectId) {
    flightState.status = `WRONG DOCK // LAND AT ${getMissionLandingProjectName().toUpperCase()}`;
    flightState.statusUntil = performance.now() + 2500;
    updateFlightHud(true);
    return false;
  }
  setMissionStep('landedHandoff');
  return true;
}

function spawnTutorialBogeys() {
  enemies.forEach(enemy => deactivateCombatObject(enemy));
  const tutorialCount = Math.min(3, enemies.length);
  for (let i = 0; i < tutorialCount; i++) spawnEnemy(enemies[i], i * 2.2, i * 0.8);
}

function handleEnemyDestroyed(enemy) {
  registerMissionKill();
  if (missionState.active && missionState.step === 'killTutorialBogeys' && missionState.kills < missionState.killGoal) {
    spawnEnemy(enemy, flightState.score + missionState.kills, 1.2 + Math.random() * 1.6);
  } else if (missionState.active && missionState.step !== 'killTutorialBogeys') {
    deactivateCombatObject(enemy);
  } else {
    spawnEnemy(enemy, flightState.score, 1.2 + Math.random() * 2.2);
  }
}

function getMissionLandingProjectName() {
  const project = USSY_PROJECTS.find(p => p.id === missionState.landingProjectId);
  return project ? project.name : 'Devussy';
}

function landOnNearestProject() {
  updateProjectLandingTarget();
  const activeLandingRange = landingRange * activeUniverseScale;
  if (!flightState.nearestNode || flightState.nearestDistance > activeLandingRange) {
    flightState.status = 'APPROACH PROJECT NODE TO LAND';
    updateFlightHud(true);
    return;
  }
  const project = flightState.nearestNode.userData.project;
  if (!handleMissionLanding(project)) return;
  restockAtProject(project);
  flightState.landed = true;
  flightState.vel.set(0, 0, 0);
  selectProject(project.id, false);
  if (document.pointerLockElement === renderer.domElement && document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function restockAtProject(project) {
  flightState.shield = 100;
  flightState.armor = 100;
  flightState.ammo = maxPlayerAmmo;
  flightState.missiles = maxPlayerMissilesStored;
  flightState.energy = 100;
  flightState.status = `RESTOCKED AT ${project.name.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2500;
  ttsEngine.speak(`DOCKING AT ${project.name.toUpperCase()}. RESTOCKING SUPPLIES.`, { rate: 1.0, pitch: 0.80 });
  updateFlightHud(true);
}

function deactivateCombatObject(object) {
  if (!object) return;
  object.visible = false;
  object.userData.active = false;
  object.userData.life = 0;
}

function spawnEnemy(enemy, offset = 0, delay = 0) {
  if (!enemy) return;
  const angle = Math.random() * Math.PI * 2 + offset;
  const height = (Math.random() - 0.5) * 54;
  const radius = 92 + Math.random() * 58;
  enemy.position.set(
    flightState.pos.x + Math.cos(angle) * radius,
    flightState.pos.y + height,
    flightState.pos.z + Math.sin(angle) * radius
  );
  enemy.userData.active = true;
  enemy.userData.health = 1;
  enemy.userData.spawnDelay = delay;
  enemy.userData.cooldown = 2400 + delay * 1000 + Math.random() * flightState.enemyFireCooldown;
  enemy.visible = delay <= 0;
}

function fireBullet(pool, origin, direction, speed, life) {
  const bullet = pool.find(item => !item.userData.active);
  if (!bullet) return false;
  bullet.position.copy(origin);
  bullet.userData.velocity.copy(direction).multiplyScalar(speed);
  bullet.userData.life = life;
  bullet.userData.active = true;
  bullet.quaternion.setFromUnitVectors(flightBeamAxis, direction);
  bullet.visible = true;
  return true;
}

function fireMissile(origin, direction) {
  const missile = playerMissiles.find(item => !item.userData.active);
  if (!missile) return false;
  missile.position.copy(origin);
  missile.userData.velocity.copy(direction).multiplyScalar(17);
  missile.userData.life = 4.2;
  missile.userData.target = findNearestEnemy();
  missile.userData.active = true;
  missile.quaternion.setFromUnitVectors(flightBeamAxis, direction);
  missile.visible = true;
  return true;
}

function findNearestEnemy() {
  let nearest = null;
  let nearestDist = Infinity;
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0) return;
    const dist = enemy.position.distanceToSquared(flightState.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  });
  return nearest;
}

function onGlobalKeyDown(event) {
  if (isTypingTarget(event.target) || event.metaKey || event.altKey) return;
  if (!isFlightActive && event.ctrlKey) return;

  if (event.key.length === 1 && !isFlightActive) {
    launchCodeBuffer = (launchCodeBuffer + event.key.toLowerCase()).slice(-4);
    if (launchCodeBuffer === 'ussy') {
      event.preventDefault();
      launchCodeBuffer = '';
      enterFlightMode();
      return;
    }
  }

  if (!isFlightActive) return;

  if (handleGameMessageChoice(event)) {
    event.preventDefault();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    dismissGameMessage();
    return;
  }

  if (event.code !== 'Escape') event.preventDefault();
  if (event.code === 'KeyV') {
    event.preventDefault();
    if (!event.repeat) setNavigationFromCrosshair();
    return;
  }
  if (event.code === 'KeyP') {
    event.preventDefault();
    if (!event.repeat) toggleAutopilot();
    return;
  }
  if (event.code === 'KeyC') {
    event.preventDefault();
    if (!event.repeat) toggleFlightView();
    return;
  }
  if (event.code === 'KeyL') {
    event.preventDefault();
    if (!event.repeat) landOnNearestProject();
    return;
  }
  if (event.code === 'KeyM') {
    event.preventDefault();
    if (!event.repeat) toggleFlightTts();
    return;
  }
  if (event.code === 'Escape' && !flightState.pointerLocked) {
    event.preventDefault();
    exitFlightMode();
    return;
  }
  if (manualFlightKeys.has(event.code)) disableAutopilot('AUTOPILOT MANUAL OVERRIDE');
  flightState.keys.add(event.code);
}

function onGlobalKeyUp(event) {
  if (!isFlightActive) return;
  flightState.keys.delete(event.code);
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
  if (!isConsoleActive || isFlightActive) return;
  camTarget.pos.set(0, 4, 18);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(node.userData.baseScale);
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
  pointerDirty = true;
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
  if (isFlightActive) {
    if (event.button === 0 || event.button === 2) {
      event.preventDefault();
      flightState.mouseButtons.add(event.button);
    }
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock && !(event.target.closest && event.target.closest('.hud-panel, .hud-interactive'))) {
      renderer.domElement.requestPointerLock();
    }
    return;
  }
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
  if (isFlightActive) {
    flightState.mouseButtons.delete(event.button);
    return;
  }
  if (orbitState.pointerId !== event.pointerId) return;
  orbitState.dragging = false;
  orbitState.pointerId = null;
  orbitState.captureTarget = null;
  document.body.classList.remove('scene-dragging');
}

function onSceneContextMenu(event) {
  if (!isFlightActive) return;
  event.preventDefault();
}

function onSceneWheel(event) {
  if (isFlightActive) return;
  if (!isConsoleActive || isCoarsePointer) return;
  if (event.target.closest && (event.target.closest('.hud-panel') || event.target.closest('.hud-interactive'))) return;
  event.preventDefault();
  orbitState.distance += event.deltaY * orbitState.zoomSpeed * orbitState.distance;
  applyOrbitToCamera();
}

function onMouseMove(event) {
  if (isFlightActive && flightState.pointerLocked) {
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) disableAutopilot('AUTOPILOT MANUAL OVERRIDE');
    applyLocalFlightRotation(0, 1, 0, -event.movementX * flightState.mouseSensitivity);
    applyLocalFlightRotation(1, 0, 0, -event.movementY * flightState.mouseSensitivity);
    return;
  }
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
  if (isFlightActive) {
    if (!flightState.pointerLocked && renderer.domElement.requestPointerLock && !(event.target.closest && event.target.closest('.hud-panel, .hud-interactive'))) {
      renderer.domElement.requestPointerLock();
    }
    return;
  }
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

function applyLocalFlightRotation(x, y, z, angle) {
  if (!angle) return;
  flightTempVec.set(x, y, z);
  flightInputQuat.setFromAxisAngle(flightTempVec, angle);
  flightState.orientation.multiply(flightInputQuat).normalize();
}

function updateFlightBasis() {
  flightQuat.copy(flightState.orientation);
  flightForward.set(0, 0, -1).applyQuaternion(flightQuat).normalize();
  flightRight.set(1, 0, 0).applyQuaternion(flightQuat).normalize();
  flightUp.set(0, 1, 0).applyQuaternion(flightQuat).normalize();
}

function updateFlight(time) {
  const dt = Math.min(((time - flightState.lastTime) / 1000) || 0.016, 0.05);
  flightState.lastTime = time;
  updateFlightBasis();
  updateMission(time);
  flightState.energy = Math.min(100, flightState.energy + 18 * dt);

  if (flightState.landed) {
    flightState.vel.multiplyScalar(Math.pow(0.9, dt * 60));
    updateProjectLandingTarget();
    updateFlightNavigation();
    updateFlightCamera();
    updateCockpitRadar(time);
    updateFlightHud(false);
    return;
  }

  updateAutopilot(dt);

  if (flightState.pointerLocked || isCoarsePointer) {
    if (flightState.keys.has('KeyQ')) applyLocalFlightRotation(0, 0, 1, 1.85 * dt);
    if (flightState.keys.has('KeyE')) applyLocalFlightRotation(0, 0, 1, -1.85 * dt);
    updateFlightBasis();

    const boost = flightState.keys.has('ShiftLeft') || flightState.keys.has('ShiftRight') ? 1.75 : 1;
    if (flightState.keys.has('KeyW') || flightState.keys.has('ArrowUp')) {
      flightState.vel.addScaledVector(flightForward, flightState.thrust * boost * dt);
    }
    if (flightState.keys.has('KeyS') || flightState.keys.has('ArrowDown')) {
      flightState.vel.addScaledVector(flightForward, -flightState.thrust * 0.58 * dt);
    }
    if (flightState.keys.has('KeyA') || flightState.keys.has('ArrowLeft')) {
      flightState.vel.addScaledVector(flightRight, -flightState.strafe * dt);
    }
    if (flightState.keys.has('KeyD') || flightState.keys.has('ArrowRight')) {
      flightState.vel.addScaledVector(flightRight, flightState.strafe * dt);
    }

    const maxSpeed = 22 * boost;
    if (flightState.vel.lengthSq() > maxSpeed * maxSpeed) flightState.vel.setLength(maxSpeed);
    if (flightState.mouseButtons.has(0) && time - flightState.lastShot > flightState.fireCooldown) {
      if (flightState.ammo <= 0) {
        flightState.status = 'LASER AMMO EMPTY // LAND TO RESTOCK';
      } else if (flightState.energy < flightState.laserEnergyCost) {
        flightState.status = 'ENERGY LOW';
      } else {
        flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 0.85);
        if (fireBullet(playerBullets, flightTempVec, flightForward, 46, 1.35)) {
          flightState.ammo -= 1;
          flightState.energy = Math.max(0, flightState.energy - flightState.laserEnergyCost);
        }
      }
      flightState.lastShot = time;
    }
    if (flightState.mouseButtons.has(2) && time - flightState.lastMissile > flightState.missileCooldown) {
      if (flightState.missiles <= 0) {
        flightState.status = 'MISSILES EMPTY // LAND TO RESTOCK';
      } else if (flightState.energy < flightState.missileEnergyCost) {
        flightState.status = 'MISSILE ENERGY LOW';
      } else {
        flightTempVec.copy(flightState.pos).addScaledVector(flightForward, 1.05);
        if (fireMissile(flightTempVec, flightForward)) {
          flightState.missiles -= 1;
          flightState.energy = Math.max(0, flightState.energy - flightState.missileEnergyCost);
          flightState.status = 'MISSILE AWAY';
        }
      }
      flightState.lastMissile = time;
    }
  }

  flightState.vel.multiplyScalar(Math.pow(flightState.damping, dt * 60));
  flightState.pos.addScaledVector(flightState.vel, dt);
  flightState.pos.clampLength(1.8, flightBounds * activeUniverseScale);

  updateProjectLandingTarget();
  updateFlightNavigation();
  updateCombatObjects(dt);
  updateFlightCamera();
  updateCockpitRadar(time);
  updateFlightHud(false);
}

function updateProjectLandingTarget() {
  flightState.nearestNode = null;
  flightState.nearestDistance = Infinity;
  projectNodes.forEach(node => {
    if (!node.visible) return;
    const dist = node.position.distanceTo(flightState.pos);
    if (dist < flightState.nearestDistance) {
      flightState.nearestDistance = dist;
      flightState.nearestNode = node;
    }
  });
  if (flightState.nearestNode) {
    const projectName = flightState.nearestNode.userData.project.name;
    const activeLandingRange = landingRange * activeUniverseScale;
    if (performance.now() > flightState.statusUntil) {
      flightState.status = flightState.nearestDistance <= activeLandingRange
        ? `LANDING RANGE: ${projectName}`
        : `${flightState.view.toUpperCase()} VIEW // ${flightState.pointerLocked || isCoarsePointer ? 'MOUSELOOK ARMED' : 'CLICK TO RECAPTURE'}`;
    }
  }
}

function updateCombatObjects(dt) {
  playerBullets.forEach(bullet => updateBullet(bullet, dt));
  enemyBullets.forEach(bullet => updateBullet(bullet, dt));
  playerMissiles.forEach(missile => updateMissile(missile, dt));

  enemies.forEach(enemy => {
    if (!enemy.userData.active) return;
    if (enemy.userData.spawnDelay > 0) {
      enemy.userData.spawnDelay -= dt;
      if (enemy.userData.spawnDelay <= 0) enemy.visible = true;
      return;
    }
    flightTempVec.copy(flightState.pos).sub(enemy.position);
    const dist = flightTempVec.length();
    if (dist > 0.001) flightTempVec.multiplyScalar(1 / dist);
    const approachSpeed = dist > 46 ? 18 : (4.2 + Math.min(flightState.score * 0.08, 2.2));
    enemy.position.addScaledVector(flightTempVec, approachSpeed * dt);
    enemy.lookAt(flightState.pos);
    enemy.userData.cooldown -= dt * 1000;

    if (enemy.userData.cooldown <= 0 && dist < 46) {
      flightTempVec2.copy(flightState.pos).sub(enemy.position).normalize();
      fireBullet(enemyBullets, enemy.position, flightTempVec2, 18, 2.1);
      enemy.userData.cooldown = 900 + Math.random() * flightState.enemyFireCooldown;
    }

    if (dist < 1.15) {
      applyPlayerDamage(14);
      spawnEnemy(enemy, flightState.score, 1.4 + Math.random() * 2);
    }
  });

  playerBullets.forEach(bullet => {
    if (!bullet.userData.active) return;
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0 || !bullet.userData.active) return;
      const radius = enemy.userData.radius + bullet.userData.radius;
      if (bullet.position.distanceToSquared(enemy.position) < radius * radius) {
        deactivateCombatObject(bullet);
        flightState.score += 1;
        flightState.status = 'BOGEY SPLASHED';
        handleEnemyDestroyed(enemy);
      }
    });
  });

  enemyBullets.forEach(bullet => {
    if (!bullet.userData.active) return;
    if (bullet.position.distanceToSquared(flightState.pos) < 0.55) {
      deactivateCombatObject(bullet);
      applyPlayerDamage(8);
    }
  });

  playerMissiles.forEach(missile => {
    if (!missile.userData.active) return;
    enemies.forEach(enemy => {
      if (!enemy.userData.active || !enemy.visible || enemy.userData.spawnDelay > 0 || !missile.userData.active) return;
      const radius = enemy.userData.radius + missile.userData.radius;
      if (missile.position.distanceToSquared(enemy.position) < radius * radius) {
        deactivateCombatObject(missile);
        flightState.score += 2;
        flightState.status = 'MISSILE KILL';
        handleEnemyDestroyed(enemy);
      }
    });
  });

  if (flightState.armor <= 0) {
    flightState.status = 'HULL BREACH // LAND FOR REPAIRS';
    flightState.armor = 25;
    flightState.shield = 0;
    flightState.score = Math.max(0, flightState.score - 4);
    flightState.vel.set(0, 0, 0);
    flightState.pos.set(0, 2.2, 16);
    enemies.forEach((enemy, idx) => spawnEnemy(enemy, idx * 1.7, idx * 0.9));
  }
}

function applyPlayerDamage(amount) {
  let remaining = amount;
  if (flightState.shield > 0) {
    const absorbed = Math.min(flightState.shield, remaining);
    flightState.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    flightState.armor = Math.max(0, flightState.armor - remaining);
  }
}

function updateBullet(bullet, dt) {
  if (!bullet.userData.active) return;
  bullet.position.addScaledVector(bullet.userData.velocity, dt);
  bullet.userData.life -= dt;
  if (bullet.userData.life <= 0 || bullet.position.distanceToSquared(flightState.pos) > 3600) {
    deactivateCombatObject(bullet);
  }
}

function updateMissile(missile, dt) {
  if (!missile.userData.active) return;
  const target = missile.userData.target && missile.userData.target.userData.active ? missile.userData.target : findNearestEnemy();
  missile.userData.target = target;
  if (target) {
    flightTempVec.copy(target.position).sub(missile.position).normalize();
    missile.userData.velocity.lerp(flightTempVec.multiplyScalar(24), 0.045);
  }
  missile.position.addScaledVector(missile.userData.velocity, dt);
  if (missile.userData.velocity.lengthSq() > 0.001) {
    flightTempVec.copy(missile.userData.velocity).normalize();
    missile.quaternion.setFromUnitVectors(flightBeamAxis, flightTempVec);
  }
  missile.userData.life -= dt;
  if (missile.userData.life <= 0 || missile.position.distanceToSquared(flightState.pos) > 4900) {
    deactivateCombatObject(missile);
  }
}

function updateFlightCamera() {
  updateFlightBasis();
  if (playerShip) {
    playerShip.position.copy(flightState.pos);
    playerShip.quaternion.copy(flightQuat);
    playerShip.visible = flightState.view === 'third';
  }

  if (flightState.view === 'third') {
    camTarget.pos.copy(flightState.pos).addScaledVector(flightForward, -7).addScaledVector(flightUp, 2.2);
    camTarget.lookAt.copy(flightState.pos).addScaledVector(flightForward, 8);
  } else {
    camTarget.pos.copy(flightState.pos).addScaledVector(flightUp, 0.08);
    camTarget.lookAt.copy(flightState.pos).addScaledVector(flightForward, 18);
  }
}

function mapRadarPoint(targetPos, radius) {
  radarTempVec.copy(targetPos).sub(flightState.pos);
  const right = radarTempVec.dot(flightRight);
  const forward = radarTempVec.dot(flightForward);
  const up = radarTempVec.dot(flightUp);
  const distance = Math.max(0.001, Math.sqrt(right * right + forward * forward + up * up));
  const activeRadarRange = radarRange * activeUniverseScale;
  const scale = Math.min(distance, activeRadarRange) / activeRadarRange;
  const angle = Math.atan2(right, forward);
  return {
    x: Math.sin(angle) * scale * radius,
    y: -Math.cos(angle) * scale * radius,
    distance,
    above: up > 8,
    below: up < -8,
    edge: distance > activeRadarRange
  };
}

function drawRadarContact(ctx, cx, cy, radius, targetPos, type, highlighted = false) {
  const point = mapRadarPoint(targetPos, radius);
  const x = cx + point.x;
  const y = cy + point.y;
  const alpha = point.edge ? 0.48 : 0.92;
  const color = type === 'enemy' ? `rgba(255, 51, 85, ${alpha})` : (highlighted ? `rgba(255, 204, 0, ${alpha})` : `rgba(0, 240, 255, ${alpha * 0.72})`);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = highlighted ? 2 : 1;
  if (type === 'enemy') {
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(-4, -4, 8, 8);
    if (highlighted) {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (point.above || point.below) {
    ctx.font = '10px monospace';
    ctx.fillText(point.above ? '+' : '-', 8, -7);
  }
  ctx.restore();
}

function updateCockpitRadar(time, force = false) {
  if (!radarCtx || !cockpitRadar || !isFlightActive) return;
  const interval = isCoarsePointer ? 160 : 95;
  if (!force && time - radarLastUpdate < interval) return;
  radarLastUpdate = time;

  const ctx = radarCtx;
  const width = cockpitRadar.width;
  const height = cockpitRadar.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = 'rgba(3, 6, 15, 0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.stroke();

  projectNodes.forEach(node => {
    if (!node.visible) return;
    const highlighted = node === flightState.nearestNode || node === flightState.navNode || node.userData.project.id === missionState.landingProjectId;
    drawRadarContact(ctx, cx, cy, radius, node.position, 'project', highlighted);
  });
  enemies.forEach(enemy => {
    if (!enemy.userData.active || !enemy.visible) return;
    drawRadarContact(ctx, cx, cy, radius, enemy.position, 'enemy');
  });

  ctx.fillStyle = 'rgba(255, 204, 0, 0.95)';
  ctx.strokeStyle = 'rgba(255, 204, 0, 0.95)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 7, cy + 8);
  ctx.lineTo(cx, cy + 4);
  ctx.lineTo(cx - 7, cy + 8);
  ctx.closePath();
  ctx.fill();

  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(125, 252, 255, 0.78)';
  ctx.fillText(`RANGE ${radarRange * activeUniverseScale}`, 10, height - 12);
  ctx.restore();
}

function updateFlightHud(force) {
  const now = performance.now();
  if (!force && now - flightState.lastHudUpdate < 120) return;
  flightState.lastHudUpdate = now;
  const speed = flightState.vel.length();
  updateTtsStatusIndicator();
  if (flightStatus) flightStatus.textContent = isFlightActive ? flightState.status : 'TYPE USSY TO LAUNCH';
  if (flightScore) flightScore.textContent = String(flightState.score);
  if (flightShield) flightShield.textContent = String(Math.round(flightState.shield));
  if (flightTarget) {
    flightTarget.textContent = flightState.nearestNode
      ? `${flightState.nearestNode.userData.project.name} ${flightState.nearestDistance.toFixed(1)}u`
      : 'NONE';
  }
  if (flightCrosshairTarget) {
    flightCrosshairTarget.textContent = flightState.crosshairNode
      ? `${getProjectNodeName(flightState.crosshairNode)} // PRESS V`
      : 'NO PROJECT';
  }
  if (flightNavTarget) {
    flightNavTarget.textContent = flightState.navNode
      ? `${getProjectNodeName(flightState.navNode)} ${Math.round(flightState.navDistance)}u`
      : 'NONE';
  }
  if (flightNavEta) flightNavEta.textContent = flightState.navEta;
  if (flightAutopilot) flightAutopilot.textContent = flightState.autopilot ? 'P: ON' : 'P: OFF';
  if (flightSpeed) flightSpeed.textContent = `${speed.toFixed(1)}u/s`;
  if (flightSpeedBar) flightSpeedBar.style.width = `${Math.min(100, (speed / 38) * 100).toFixed(1)}%`;
  if (flightShieldsDetail) flightShieldsDetail.textContent = `${Math.round(flightState.shield)}%`;
  if (flightShieldBar) flightShieldBar.style.width = `${Math.max(0, flightState.shield).toFixed(1)}%`;
  if (flightEnergy) flightEnergy.textContent = `${Math.round(flightState.energy)}%`;
  if (flightEnergyBar) flightEnergyBar.style.width = `${Math.max(0, flightState.energy).toFixed(1)}%`;
  if (flightArmor) flightArmor.textContent = `${Math.round(flightState.armor)}%`;
  if (flightArmorBar) flightArmorBar.style.width = `${Math.max(0, flightState.armor).toFixed(1)}%`;
  if (flightAmmo) flightAmmo.textContent = `${flightState.ammo}/${maxPlayerAmmo}`;
  if (flightAmmoBar) flightAmmoBar.style.width = `${((flightState.ammo / maxPlayerAmmo) * 100).toFixed(1)}%`;
  if (flightMissiles) flightMissiles.textContent = `${flightState.missiles}/${maxPlayerMissilesStored}`;
  if (flightMissileBar) flightMissileBar.style.width = `${((flightState.missiles / maxPlayerMissilesStored) * 100).toFixed(1)}%`;
}

function updateTtsStatusIndicator() {
  const ttsStatusEl = ttsStatus || document.getElementById('tts-status');
  if (ttsStatusEl) ttsStatusEl.textContent = ttsEngine.enabled ? 'TTS●' : 'TTS○';
  if (ttsStatusEl) ttsStatusEl.classList.toggle('muted', !ttsEngine.enabled);
}

function toggleFlightTts() {
  ttsEngine.enabled = !ttsEngine.enabled;
  if (!ttsEngine.enabled) ttsEngine.stop();
  flightState.status = ttsEngine.enabled ? 'TTS ACTIVE' : 'TTS MUTED';
  flightState.statusUntil = performance.now() + 2200;
  updateTtsStatusIndicator();
  updateFlightHud(true);
}

function updateFlightNavMarker() {
  if (!flightNavMarker) return;
  if (!isFlightActive || !flightState.navNode) {
    flightNavMarker.classList.remove('active', 'offscreen');
    return;
  }

  navTempVec.copy(flightState.navNode.position).sub(camera.position).normalize();
  camera.getWorldDirection(navTempVec2);
  const inFront = navTempVec.dot(navTempVec2) > 0.05;
  navScreenVec.copy(flightState.navNode.position).project(camera);
  let x = (navScreenVec.x * 0.5 + 0.5) * window.innerWidth;
  let y = (-navScreenVec.y * 0.5 + 0.5) * window.innerHeight;
  if (!inFront) {
    x = window.innerWidth - x;
    y = window.innerHeight - y;
  }
  const margin = 76;
  const offscreen = !inFront || x < margin || x > window.innerWidth - margin || y < margin || y > window.innerHeight - margin;
  x = THREE.MathUtils.clamp(x, margin, window.innerWidth - margin);
  y = THREE.MathUtils.clamp(y, margin, window.innerHeight - margin);
  flightNavMarker.style.left = `${x}px`;
  flightNavMarker.style.top = `${y}px`;
  flightNavMarker.textContent = `NAV ${getProjectNodeName(flightState.navNode)}\n${Math.round(flightState.navDistance)}u // ETA ${flightState.navEta}\nAUTO ${flightState.autopilot ? 'ON' : 'OFF'}`;
  flightNavMarker.classList.toggle('active', true);
  flightNavMarker.classList.toggle('offscreen', offscreen);
}

function updateDeepSpaceAnchor() {
  const scale = isFlightActive ? flightUniverseScale : 1;
  const followCamera = isFlightActive;
  [starField, milkyWayField, brightStarField].forEach(field => {
    if (!field) return;
    if (field.userData.baseSize === undefined) field.userData.baseSize = field.material.size;
    if (followCamera) {
      field.position.copy(camera.position);
    } else {
      field.position.set(0, 0, 0);
    }
    field.scale.setScalar(scale);
    field.material.size = field.userData.baseSize * scale;
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getRenderPixelRatio());
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
  if (milkyWayField && !prefersReducedMotion) {
    milkyWayField.rotation.y += 0.000025;
  }
  if (brightStarField && !prefersReducedMotion) {
    brightStarField.rotation.y -= 0.000045;
  }
  if (dataRibbonGroup && !prefersReducedMotion) {
    dataRibbonGroup.rotation.y -= 0.00018;
  }
  
  const pulseScale = prefersReducedMotion ? 1 : 1 + Math.sin(time * 0.0015) * 0.04;
  coreMesh.scale.setScalar(pulseScale);

  // Floating nodes orbits (slow drift)
  const orbitSpeed = isConsoleActive ? 0.0003 : 0.00012;
  let nodesMoved = false;
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
      nodesMoved = true;
    }
  });
  if (nodesMoved || isConsoleActive) updateRelationshipEdges();

  // Slow ambient drift of camera coordinates during passive Hero screensaver state
  if (isFlightActive) {
    updateFlight(time);
    pointLight1.color.lerp(tempColor1.set(0xffcc00), 0.08);
    pointLight2.color.lerp(tempColor2.set(0xff3355), 0.08);
  } else if (!isConsoleActive && heroContainer) {
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
    tempCamBase.lerpVectors(posA, posB, t);
    
    // Add subtle ambient floating/screensaver drift
    tempCamDrift.set(
      Math.sin(time * 0.0005) * 1.5,
      Math.cos(time * 0.0003) * 0.8,
      Math.sin(time * 0.0004) * 1.2
    );
    
    // Set camTarget.pos to base + drift
    camTarget.pos.copy(tempCamBase).add(tempCamDrift);
    camTarget.lookAt.set(0, 0, 0);

    // Smoothly LERP point light colors matching each sector
    const color1A = sectionColors[sectionIdx].light1;
    const color1B = sectionColors[nextSectionIdx].light1;
    const color2A = sectionColors[sectionIdx].light2;
    const color2B = sectionColors[nextSectionIdx].light2;
    
    const targetColor1 = tempColor1.copy(color1A).lerp(color1B, t);
    const targetColor2 = tempColor2.copy(color2A).lerp(color2B, t);

    pointLight1.color.lerp(targetColor1, 0.05);
    pointLight2.color.lerp(targetColor2, 0.05);
  } else if (isConsoleActive) {
    // Dynamic color shifts when selecting different projects based on their category
    if (selectedNode) {
      const proj = selectedNode.userData.project;
      const cat = USSY_CATEGORIES[proj.category];
      const catColorHex = parseInt(cat.color.replace('#', '0x'));
      const targetColor1 = tempColor1.set(catColorHex);
      const targetColor2 = tempColor2.set(0xff0055); // Neon Pink contrast

      pointLight1.color.lerp(targetColor1, 0.05);
      pointLight2.color.lerp(targetColor2, 0.05);
    } else {
      // Default Console mode colors (Cyan and Pink)
      pointLight1.color.lerp(tempColor1.set(0x00f0ff), 0.05);
      pointLight2.color.lerp(tempColor2.set(0xff0055), 0.05);
    }
  }

  // Raycasting hover highlight (only active in Console mode)
  if (isConsoleActive && !isFlightActive && pointerDirty) {
    const intersects = getInteractiveHits();
    pointerDirty = false;
    
    if (intersects.length > 0) {
      const node = intersects[0].object.userData.node || intersects[0].object;
      if (hoveredNode !== node) {
        if (hoveredNode && hoveredNode !== selectedNode) {
          hoveredNode.scale.setScalar(hoveredNode.userData.baseScale);
          hoveredNode.material.opacity = 0.85;
        }
        
        hoveredNode = node;
        customCursor.classList.add('hovering');
        
        if (node !== selectedNode) {
          node.scale.setScalar(node.userData.baseScale * 1.25);
          node.material.opacity = 1.0;
        }
      }
    } else {
      if (hoveredNode) {
        if (hoveredNode !== selectedNode) {
          hoveredNode.scale.setScalar(hoveredNode.userData.baseScale);
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
  const lerpFactor = isFlightActive ? (flightState.view === 'cockpit' ? 0.28 : 0.16) : (isConsoleActive ? 0.06 : 0.02); // Slower, more cinematic drift in Hero mode
  camCurrent.pos.lerp(camTarget.pos, lerpFactor);
  camCurrent.lookAt.lerp(camTarget.lookAt, lerpFactor);
  
  camera.position.copy(camCurrent.pos);
  if (isFlightActive) {
    camera.up.copy(flightUp);
  } else {
    camera.up.set(0, 1, 0);
  }
  camera.lookAt(camCurrent.lookAt);
  updateDeepSpaceAnchor();
  updateFlightNavMarker();

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
  if (endTime - telemetryLastUpdate > 250) {
    telemetryTimer.innerText = isFlightActive
      ? `DOGFIGHT_LOAD: ${(endTime - startTime).toFixed(2)}ms // VIEW: ${flightState.view.toUpperCase()} // DRAW_CALLS: ${renderer.info.render.calls}`
      : `TELEMETRY_LOAD: ${(endTime - startTime).toFixed(2)}ms // DRAW_CALLS: ${renderer.info.render.calls}`;
    if (isFlightActive) {
      telemetryCoord.innerText = `X: ${flightState.pos.x.toFixed(2)} Y: ${flightState.pos.y.toFixed(2)} Z: ${flightState.pos.z.toFixed(2)}`;
    }
    telemetryLastUpdate = endTime;
  }
}

// Start Application
window.onload = init;

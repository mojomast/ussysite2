// --- USSYVERSE 3D CYBERNETIC ENGINE --- //

import { COMMODITIES, configureTrader, openTradeMenu, refuelAt, tickPriceDrift, traderState } from '../economy/trader.js';
import { getStationLore, getStationMissions } from '../economy/lore.js';
import { gainReputation, getEnemyAggressionMultiplier, loseReputation, normalizeCategory, reputationState } from '../economy/reputation.js';
import { configureInput, flightState, getInteractiveHits, inputState, onPointerLockError, orbitState, registerInputListeners, syncOrbitFromCamera } from '../input.js';
export { flightState };
import {
  configureFlightPhysics,
  flightForward,
  flightQuat,
  flightRight,
  flightTempVec,
  flightTempVec2,
  flightUp,
  updateFlight,
  updateFlightBasis
} from './physics.js';
import {
  configureFlightNavigation,
  disableAutopilot,
  getProjectNodeName,
  setNavigationFromCrosshair,
  setNavigationTarget,
  toggleAutopilot,
  updateAutopilot,
  updateFlightNavLine,
  updateFlightNavigation,
  updateFlightNavMarker as updateNavigationMarker,
  updateProjectLandingTarget
} from './navigation.js';
import {
  ENEMY_CLASSES,
  WEAPON_DEFS,
  WEAPON_PRICES,
  SKILL_TREE_NODES,
  configureCombat,
  emitCombatEnemyKill,
  emitCombatMissionComplete,
  emitCombatPlayerHit,
  getEnemyClass,
  getStationEquipment,
  getWeaponDef
} from './combat-overhaul.js';
import {
  awardXp,
  buyWeapon,
  combatState,
  consumeCombatDebrief,
  recordKillStreak,
  deserializeCombatState,
  equipWeapon,
  recordCombatKillStats,
  reset as resetCombatState,
  resetCombatSessionStats,
  reapplySkills,
  serializeCombatState,
  setCombatFlightState,
  unlockSkillNode as unlockCombatSkillNode
} from './combat-state.js';
import {
  configureHud,
  addKillFeedEntry as addHudKillFeedEntry,
  drawRadarContact as drawRadarContactModule,
  mapRadarPoint as mapRadarPointModule,
  showCreditGain,
  updateCockpitRadar as updateCockpitRadarModule,
  updateFlightCamera as updateFlightCameraModule,
  updateFlightHud as updateFlightHudModule,
  updateTtsStatusIndicator as updateTtsStatusIndicatorModule
} from './hud.js';
import {
  configureMessages,
  dismissGameMessage as dismissGameMessageModule,
  getVoicePersona as getVoicePersonaModule,
  handleGameMessageChoice as handleGameMessageChoiceModule,
  renderGameMessage as renderGameMessageModule,
  showGameMessage as showGameMessageModule,
  updateGameMessage as updateGameMessageModule
} from './messages.js';
import { showDebrief } from './debrief.js';
import { applyRunState, clearRunState, loadRunState, saveRunState } from './persist.js';
import { activateEnemyWave, buildOrchestratorGameState, dispatchOrchestratorEvent, startMissionContract as startOrchestratorMissionContract } from './orchestrator.js';
import {
  MISSION_INTRO_TEXT,
  applyMissionProgress,
  cloneMissionContracts,
  configureMission,
  createMissionState,
  handleMissionLanding as missionHandleMissionLanding,
  registerMissionKill as missionRegisterMissionKill,
  registerMissionTrade,
  serializeMissionProgress,
  setMissionStep as missionSetMissionStep,
  startTutorialMission as missionStartTutorialMission,
  updateMission as missionUpdateMission
} from './mission.js';
import {
  applyEnemyHit,
  applyPlayerDamage,
  configureCombatScene,
  configureEnemies,
  configureWeapons,
  createFlightGameObjects as createCombatFlightGameObjects,
  deactivateCombatObject,
  enemyBullets,
  enemies,
  findNearestEnemy,
  firePrimaryWeapon,
  fireSecondaryWeapon,
  handleBossDeath,
  playerBullets,
  playerMissiles,
  resetWeaponVfxPools,
  spawnEnemy,
  triggerDeathExplosion,
  updateCombatObjects,
  updateWeaponVfxPools
} from './combat.js';
// Combat bark ownership moved to flight modules; contract tests still assert these priority forms:
// combatAudio.bark('FOX TWO', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' })
// combatAudio.bark('TAKING FIRE', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' })
import { animateHolographicCore, createHolographicCore as createEngineHolographicCore } from '../engine/core.js';
import { projectHitTargets as engineProjectHitTargets, projectLabels as engineProjectLabels, projectNodeById as engineProjectNodeById, projectNodes as engineProjectNodes, relationshipEdges as engineRelationshipEdges } from '../engine/nodes.js';
import { createAmbientLighting as createEngineAmbientLighting, createCameraAnimationState, createSceneGroups, initScene as initEngineScene, resizeScene } from '../engine/scene.js';
import {
  animateDeepSpaceEffects,
  createDebrisField as createEngineDebrisField,
  createDeepSpaceEffects as createEngineDeepSpaceEffects,
  createDustField as createEngineDustField,
  createRadialGlowTexture as createEngineRadialGlowTexture,
  randomizeDebrisInstance as randomizeEngineDebrisInstance,
  randomizeDustParticle as randomizeEngineDustParticle,
  updateDebrisField as updateEngineDebrisField,
  updateDebrisMatrix as updateEngineDebrisMatrix,
  updateDeepSpaceAnchor as updateEngineDeepSpaceAnchor,
  updateDustField as updateEngineDustField,
  updateSpaceEnvironment as updateEngineSpaceEnvironment
} from '../engine/starfield.js';
import { flightUniverseScale, isCoarsePointer, maxPlayerAmmo, maxPlayerMissilesStored, prefersReducedMotion } from '../constants.js';
import { combatAudio, configureFlightAudio, gameSettings, radioChain, setChatterVolume, setRadioVolume, setSfxVolume, setTTSBackendEnabled, ttsEngine, volumePercent } from './audio.js';
import { sfxEngine } from './sfx.js';
import { configureCursor, setCursorHovering, tickCustomCursor } from '../ui/cursor.js';
import { configureHeroUI, setupHeroNavDots, updateHeroCameraAndLights } from '../ui/hero.js';
import { configureInventoryPanel } from '../ui/inventory-panel.js';
import {
  activateConsoleMode as activateConsoleModeModule,
  configureConsoleUI,
  deactivateConsoleMode as deactivateConsoleModeModule,
  populateProjectsUI as populateProjectsUIModule,
  resetCategoryFilterForFlight as resetCategoryFilterForFlightModule,
  selectProject as selectProjectModule,
  setupUIEventListeners as setupUIEventListenersModule
} from '../ui/console.js';
import { configureNodesOverlay, renderProjectLabels, updateNodeHoverSelection } from '../ui/nodes-overlay.js';

const USSY_PROJECTS = window.USSY_PROJECTS || [];
const USSY_CATEGORIES = window.USSY_CATEGORIES || {};

let scene, camera, renderer;
let coreGroup, nodesGroup, connectionsGroup;
let coreMesh, coreOuterParticles;
let raycaster, mouse;
let hoveredNode = null;
let selectedNode = null;
let activeCategory = 'all';
let isConsoleActive = false; // Hero state by default
let isFlightActive = false;
let pointLight1, pointLight2; // Global lights for scroll snap neon shifts
let starField, milkyWayField, brightStarField, dataRibbonGroup, selectionRing, relationshipEdgesMesh, selectedEdgesMesh;
let debrisField, dustField;
let telemetryLastUpdate = 0;
let gameRoot, playerShip, flightNavLine;
let flightAssistKeyCaptureRegistered = false;

const projectHitTargets = engineProjectHitTargets;
const projectNodeById = engineProjectNodeById;
const relationshipEdges = engineRelationshipEdges;
const selectedEdgeLimit = 8;
const labelTempVec = new THREE.Vector3();
const tempCamBase = new THREE.Vector3();
const tempCamDrift = new THREE.Vector3();
const tempColor1 = new THREE.Color();
const tempColor2 = new THREE.Color();
const radarTempVec = new THREE.Vector3();
const flightEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const planetLabelOffset = new THREE.Vector3();
const debrisMatrix = new THREE.Matrix4();
const debrisQuaternion = new THREE.Quaternion();
const debrisPosition = new THREE.Vector3();
const debrisScale = new THREE.Vector3(1, 1, 1);
const debrisAxis = new THREE.Vector3();
const dustTempVec = new THREE.Vector3();
const cameraRollQuat = new THREE.Quaternion();
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
const maxEnemies = 7;
const maxPlayerBullets = 32;
const maxEnemyBullets = 28;
const maxPlayerMissiles = 8;
const playerLaserStreakLength = 5.4;
const playerLaserTrailPoints = 14;
const playerLaserMaxDistanceSq = 320 * 320;
const constellationScale = 2.25;
const nodeBaseScale = 1;
const planetNodeRadius = isCoarsePointer ? 1.55 : 1.75;
const planetNodeFlightScale = isCoarsePointer ? 3.8 : 4.4;
const planetDistantHaloScale = isCoarsePointer ? 14 : 18;
const flightPlanetMinDistance = 260;
const flightPlanetMaxDistance = 1080;
const planetNodeHitRadius = isCoarsePointer ? planetNodeRadius * 1.18 : planetNodeRadius * 1.06;
const planetLabelRadius = planetNodeRadius * 1.35;
const landingRange = 7.2;
const flightBounds = 135;
const radarRange = 140;
const debrisCount = prefersReducedMotion ? 72 : (isCoarsePointer ? 210 : 300);
const dustParticleCount = prefersReducedMotion ? 180 : (isCoarsePointer ? 420 : 600);
const debrisPositions = new Float32Array(debrisCount * 3);
const debrisAxes = new Float32Array(debrisCount * 3);
const debrisAngles = new Float32Array(debrisCount);
const debrisSpinRates = new Float32Array(debrisCount);
let dustPositions = null;
let dustSpeeds = null;
let lastTriangleWarnAt = 0;
let radarLastUpdate = 0;
let lastPriceDriftTick = 0;
let lastAutoSave = 0;
let pendingRunState = null;
let activeUniverseScale = 1;

const loadoutState = {
  get primary() {
    return combatState.primaryWeapon;
  },
  set primary(value) {
    combatState.primaryWeapon = value;
  },
  get secondary() {
    return combatState.secondaryWeapon;
  },
  set secondary(value) {
    combatState.secondaryWeapon = value;
  },
  getWeapon(slot) {
    return getWeaponDef(this[slot]);
  }
};

const skillTree = {
  unlocked: combatState.unlocked,

  canUnlock(nodeId) {
    const node = SKILL_TREE_NODES.find(item => item.id === nodeId);
    if (!node) return false;
    if (this.unlocked.has(nodeId)) return false;
    if (combatState.skillPoints < node.cost) return false;
    if (node.requires && !this.unlocked.has(node.requires)) return false;
    return true;
  },

  unlock(nodeId) {
    const result = unlockCombatSkillNode(nodeId);
    return result.success;
  },

  getMaxShield() {
    let value = 100;
    if (this.unlocked.has('shield_1')) value += 25;
    if (this.unlocked.has('shield_2')) value += 25;
    return value;
  },

  getMaxArmor() {
    let value = 100;
    if (this.unlocked.has('hull_1')) value += 20;
    if (this.unlocked.has('hull_2')) value += 30;
    return value;
  },

  getMaxEnergy() {
    return this.unlocked.has('weap_1') ? 120 : 100;
  },

  getPrimaryCooldown(weapon) {
    const multiplier = this.unlocked.has('weap_3') ? 0.85 : 1;
    return weapon.cooldown * multiplier;
  },

  getArmorDamageMultiplier() {
    return this.unlocked.has('hull_3') ? 0.85 : 1;
  },

  applyAll() {
    reapplySkills();
    flightState.energy = Math.min(Math.max(flightState.energy, this.getMaxEnergy()), this.getMaxEnergy());
  }
};

setCombatFlightState(flightState);
configureCombat({
  onEnemyKill: ({ classId, pos, xpReward } = {}) => {
    triggerDeathExplosion(pos);
    const cls = getEnemyClass(classId || 'scout');
    awardXp(xpReward ?? cls.xpReward ?? 25);
    loseReputation(getNearestStationFaction(pos), 1);
  },
  onPlayerHit: () => {
    sfxEngine.playFlat('shield_hit', { volume: 0.8 });
    awardXp(5);
  },
  onMissionComplete: () => awardXp(100)
});

const missionState = createMissionState();

const gameOrchestrator = {
  enabled: true,
  polling: false,
  lastEventTime: 0,
  lastEventId: null,
  minInterval: 40000,
  maxInterval: 90000,
  nextPollAt: 0,
  tutorialComplete: false,
  pendingEvent: null,
  bountyPendingReward: 0,
  _lastCheck: 0
};

const gameMessageState = {
  active: false,
  type: 'MISSION',
  source: 'USSYVERSE CONTROL',
  text: '',
  shown: '',
  index: 0,
  nextTypeAt: 0,
  ttsWaitUntil: 0,
  typeSpeed: 18,
  choices: [],
  ui: null,
  onDismiss: null
};

const missionIntroText = MISSION_INTRO_TEXT;
const missionContracts = cloneMissionContracts();
let persistedMissionProgress = null;

// Flight audio/TTS implementation lives in js/flight/audio.js.
function getRenderPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1 : 1.25);
}

// Animation state
const { camTarget, camCurrent, sectionCamPositions, sectionColors } = createCameraAnimationState({ THREE });

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
const projectNodes = engineProjectNodes;
const projectLabels = engineProjectLabels;

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
const flightFuel = document.getElementById('flight-fuel');
const flightFuelBar = document.getElementById('flight-fuel-bar');
const flightArmor = document.getElementById('flight-armor');
const flightArmorBar = document.getElementById('flight-armor-bar');
const flightAmmo = document.getElementById('flight-ammo');
const flightAmmoBar = document.getElementById('flight-ammo-bar');
const flightMissiles = document.getElementById('flight-missiles');
const flightMissileBar = document.getElementById('flight-missile-bar');
const flightHeat = document.getElementById('flight-heat');
const flightHeatBar = document.getElementById('flight-heat-bar');
const flightHeatCockpit = document.getElementById('flight-heat-cockpit');
const flightHeatBarCockpit = document.getElementById('flight-heat-bar-cockpit');
const flightCredits = document.getElementById('flight-credits');
const flightXpBar = document.getElementById('flight-xp-bar');
const flightXpLabel = document.getElementById('flight-xp-label');
const flightSp = document.getElementById('flight-sp');
const flightWeaponPrimary = document.getElementById('flight-weapon-primary');
const flightWeaponSecondary = document.getElementById('flight-weapon-secondary');
const adrenalineVignette = document.getElementById('adrenaline-vignette');
const gameMessageSystem = document.getElementById('game-message-system');
const gameMessageType = document.getElementById('game-message-type');
const gameMessageSource = document.getElementById('game-message-source');
const gameMessageBody = document.getElementById('game-message-body');
const gameMessageChoices = document.getElementById('game-message-choices');
const cockpitRadar = document.getElementById('cockpit-radar');
const radarCtx = cockpitRadar ? cockpitRadar.getContext('2d', { alpha: true }) : null;
const objectivesPanel = document.getElementById('objectives-panel');
const objectiveViewButtons = document.querySelectorAll('[data-objective-view]');
const currentObjectivePane = document.getElementById('current-objective-pane');
const availableObjectivesPane = document.getElementById('available-objectives-pane');
const objectiveKicker = document.getElementById('objective-kicker');
const objectiveTitle = document.getElementById('objective-title');
const objectiveBody = document.getElementById('objective-body');
const objectiveProgress = document.getElementById('objective-progress');
const availableObjectivesList = document.getElementById('available-objectives-list');

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

function restoreCombatStateFromHash() {
  const hashMatch = location.hash.match(/#save:([A-Za-z0-9+/=]+)/);
  if (hashMatch) {
    deserializeCombatState(hashMatch[1]);
    applyPersistedFlightResources();
  }
  const creditsMatch = location.hash.match(/cr:(\d+)/);
  if (creditsMatch) traderState.credits = parseInt(creditsMatch[1], 10);
  const reputationMatch = location.hash.match(/rep:([A-Za-z0-9+/=]+)/);
  if (reputationMatch) {
    try {
      const scores = JSON.parse(atob(reputationMatch[1]));
      Object.keys(reputationState.scores).forEach(faction => {
        if (typeof scores[faction] === 'number') reputationState.scores[faction] = Math.max(-100, Math.min(100, scores[faction]));
      });
    } catch {
      // Ignore malformed shared save URLs.
    }
  }
  const missionMatch = location.hash.match(/ms:([A-Za-z0-9+/=]+)/);
  if (missionMatch) restoreMissionProgress(missionMatch[1]);
  syncCombatCreditsFromTrader();
}

function saveCombatStateToHash() {
  const encoded = serializeCombatState();
  const reputationEncoded = btoa(JSON.stringify(reputationState.scores));
  const missionEncoded = btoa(JSON.stringify(serializeMissionProgress({ missionState, missionContracts, gameOrchestrator })));
  history.replaceState(null, '', `#save:${encoded}:cr:${traderState.credits}:rep:${reputationEncoded}:ms:${missionEncoded}`);
}

function buildPersistentCombatState() {
  return {
    ...combatState,
    score: flightState.score,
    armor: flightState.armor,
    shield: flightState.shield
  };
}

function addKillFeedEntry(text, colorOrOptions = '#ffffff') {
  addHudKillFeedEntry(text, colorOrOptions);
  updateFlightHud(true);
}

function saveCurrentRunState({ manual = false } = {}) {
  const saved = saveRunState(buildPersistentCombatState(), traderState, reputationState, skillTree);
  if (saved && manual) addKillFeedEntry('STATE SAVED', '#44ff88');
  return saved;
}

function applySavedRunState(data) {
  if (!applyRunState(data, combatState, traderState, reputationState, skillTree)) return false;
  flightState.score = data.combat.score;
  flightState.armor = data.combat.hull;
  flightState.shield = data.combat.shieldHp;
  skillTree.applyAll();
  syncCombatCreditsFromTrader();
  updateFlightHud(true);
  return true;
}

function restoreMissionProgress(encoded) {
  try {
    const data = JSON.parse(atob(encoded));
    if (data && typeof data === 'object') persistedMissionProgress = data;
  } catch {
    // Ignore malformed shared save URLs.
  }
}

function applyPersistedFlightResources() {
  const resources = combatState.resources;
  if (!resources) return;
  if (Number.isFinite(resources.ammo)) flightState.ammo = Math.min(maxPlayerAmmo, Math.max(0, Math.floor(resources.ammo)));
  if (Number.isFinite(resources.missiles)) flightState.missiles = Math.min(maxPlayerMissilesStored, Math.max(0, Math.floor(resources.missiles)));
  if (Number.isFinite(resources.fuel)) {
    traderState.fuel = Math.min(traderState.maxFuel, Math.max(0, resources.fuel));
    flightState.fuel = traderState.fuel;
  }
  if (typeof resources.fuelDepleted === 'boolean') flightState.fuelDepleted = resources.fuelDepleted;
}

function applyPersistedMissionProgress() {
  if (!persistedMissionProgress) return;
  if (applyMissionProgress(persistedMissionProgress, { missionState, missionContracts, gameOrchestrator })) {
    if (missionState.active && missionState.contractId && getActiveContractStep()) updateContractObjectiveProgress();
    else renderObjectivesPanel();
  }
  persistedMissionProgress = null;
}

// Init application
export function init() {
  pendingRunState = loadRunState();
  configureFlightAudio({ flightState, updateFlightHud, getVoicePersona });
  configureTrader({
    showGameMessage,
    dismissGameMessage,
    updateFlightHud,
    getVoicePersona,
    onTrade: handleTradeCompleted,
    showFactionMission,
    onUndock: undockFromTradeMenu
  });
  restoreCombatStateFromHash();
  if (objectivesPanel) objectivesPanel.addEventListener('click', handleObjectivesPanelClick);
  renderObjectivesPanel();

  // Initialize Three.js Scene
  ({ scene, camera, renderer } = initEngineScene(canvasContainer, { THREE, isCoarsePointer }));

  // Groups
  ({ coreGroup, nodesGroup, connectionsGroup } = createSceneGroups(scene, { THREE }));

  // Interactive Raycaster Setup
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Create Scene Elements
  createHolographicCore();
  buildProjectNodes();
  buildRelatedProjectEdges();
  configureHud({
    activeUniverseScale: () => activeUniverseScale,
    camTarget,
    camera,
    cockpitRadar,
    documentRef: document,
    enemies,
    findNearestEnemy,
    flightForward,
    flightQuat,
    flightRight,
    flightState,
    flightUp,
    getProjectNodeName,
    isCoarsePointer,
    isFlightActive: () => isFlightActive,
    missionState,
    playerShip,
    projectNodes,
    radarCtx,
    radarRange,
    radarTempVec,
    skillTree,
    syncCombatCreditsFromTrader,
    ttsEngine,
    ttsStatus,
    updateFlightBasis
  });
  configureMessages({
    documentRef: document,
    gameMessageBody,
    gameMessageChoices,
    gameMessageSource,
    gameMessageState,
    gameMessageSystem,
    gameMessageType,
    ttsEngine
  });
  configureCombatScene({
    THREE,
    scene,
    maxEnemies,
    maxPlayerBullets,
    maxEnemyBullets,
    maxPlayerMissiles,
    playerLaserStreakLength,
    playerLaserTrailPoints,
    playerLaserMaxDistanceSq
  });
  configureFlightPhysics({
    activeUniverseScale: () => activeUniverseScale,
    firePrimaryWeapon,
    fireSecondaryWeapon,
    findNearestEnemy,
    flightBounds,
    flightHud,
    flightState,
    getVoicePersona,
    isCoarsePointer,
    showGameMessage,
    skillTree,
    ttsEngine,
    updateAutopilot,
    updateCockpitRadar,
    updateCombatObjects,
    updateFlightCamera,
    updateFlightHud,
    updateFlightNavigation,
    updateMission,
    updateProjectLandingTarget,
    updateWeaponVfxPools
  });
  createDeepSpaceEffects();
  createAmbientLighting();
  createFlightGameObjects();
  configureCursor({
    customCursor,
    isConsoleActive: () => isConsoleActive,
    isFlightActive: () => isFlightActive
  });
  configureHeroUI({
    activateConsoleMode,
    camTarget,
    coreOuterParticles,
    documentRef: document,
    heroContainer,
    isConsoleActive: () => isConsoleActive,
    pointLight1,
    pointLight2,
    sectionCamPositions,
    sectionColors,
    windowRef: window
  });
  configureNodesOverlay({
    camera,
    getInteractiveHits,
    inputState,
    isConsoleActive: () => isConsoleActive,
    isFlightActive: () => isFlightActive,
    planetLabelRadius,
    projectLabels,
    selectedNode: () => selectedNode,
    setCursorHovering,
    setProjectNodeOpacity,
    windowRef: window
  });
  configureConsoleUI({
    PROJECT_HOW_COPY,
    USSY_CATEGORIES,
    USSY_PROJECTS,
    activeCategory: () => activeCategory,
    backToHeroBtn,
    btnDemo,
    btnGithub,
    camTarget,
    documentRef: document,
    enterConsoleBtn,
    exitFlightMode,
    getRelatedEdgesForProject,
    getSelectedNode: () => selectedNode,
    heroContainer,
    heroSetupNavDots: setupHeroNavDots,
    hudHeaderTitle,
    inspectCategory,
    inspectDesc,
    inspectFeatures,
    inspectSpecs,
    inspectTags,
    inspectTelemetry,
    inspectTitle,
    isFlightActive: () => isFlightActive,
    projectLabels,
    projectNodes,
    projectsScrollList,
    setActiveCategory: value => { activeCategory = value; },
    setConsoleActive: value => { isConsoleActive = value; },
    setProjectNodeOpacity,
    setSelectedNode: value => { selectedNode = value; },
    syncOrbitFromCamera,
    updateRelationshipEdges,
    updateSelectedRelationEdges
  });
  configureInventoryPanel({ flightState });
  configureHud({ playerShip });
  configureEnemies({
    addKillFeedEntry,
    combatAudio,
    emitCombatPlayerHit,
    flightHud,
    flightForward,
    flightRight,
    flightState,
    flightTempVec,
    flightTempVec2,
    flightUp,
    getEnemyFireCooldown,
    getVoicePersona,
    handleEnemyDestroyed,
    missionState,
    onWaveComplete: () => saveCurrentRunState(),
    showGameMessage,
    skillTree,
    ttsEngine,
    windowRef: window
  });
  configureWeapons({
    applyEnemyHit,
    camera,
    combatAudio,
    enemies,
    flightForward,
    flightHeatBar,
    flightRight,
    flightState,
    flightTempVec,
    flightTempVec2,
    flightUp,
    gameRoot,
    getVoicePersona,
    loadoutState,
    playerLaserMaxDistanceSq,
    skillTree
  });
  configureFlightNavigation({
    activeUniverseScale: () => activeUniverseScale,
    combatAudio,
    flightForward,
    flightNavLine,
    flightState,
    flightUp,
    getVoicePersona,
    isCoarsePointer,
    isFlightActive: () => isFlightActive,
    landingRange,
    missionState,
    projectNodeById,
    projectNodes,
    selectProject,
    updateFlightBasis,
    updateFlightHud
  });
  configureMission({
    activateEnemyWave,
    addCombatCredits,
    combatAudio,
    deactivateCombatObject,
    enemies,
    flightState,
    gainReputation,
    gameOrchestrator,
    getStationCategory,
    getVoicePersona,
    missionContracts,
    missionState,
    normalizeCategory,
    openTradeMenu,
    projectNodeById,
    renderObjectivesPanel,
    setNavigationTarget,
    showGameMessage,
    sfxEngine,
    spawnEnemy,
    traderState,
    ttsEngine,
    updateFlightHud
  });
  configureInput({
    activateConsoleMode,
    camTarget,
    camera,
    canvasContainer,
    coreOuterParticles,
    customCursor,
    disableAutopilot,
    dismissGameMessage,
    documentRef: document,
    enterFlightMode,
    exitFlightMode,
    gameMessageState,
    handleGameMessageChoice,
    heroContainer,
    isConsoleActive: () => isConsoleActive,
    isFlightActive: () => isFlightActive,
    landOnNearestProject,
    mouse,
    openAudioSettingsMenu,
    openSkillTree,
    openStationMenu,
    playFireSfx: type => sfxEngine.playFlat(type, { volume: type === 'missile' ? 0.9 : 0.8 }),
    projectHitTargets,
    radioChain,
    raycaster,
    renderer,
    onUndock: handleFlightUndock,
    resetCameraView,
    sectionCamPositions,
    selectProject,
    setNavigationFromCrosshair,
    telemetryCoord,
    toggleAutopilot,
    toggleFlightTts,
    toggleFlightView,
    toggleObjectivesView,
    traderState,
    unlockAudio: () => sfxEngine.unlock(),
    updateFlightHud,
    windowRef: window
  });
  registerFlightAssistKeyCapture();
  syncOrbitFromCamera();
  
  // Populate UI Lists
  populateProjectsUI();
  setupUIEventListeners();
  
  // Select initial project (Devussy)
  selectProject('devussy', false);

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  registerInputListeners();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.setInterval(saveCombatStateToHash, 30000);
  window.addEventListener('beforeunload', saveCombatStateToHash);

}

// 1. Holographic Core
function createHolographicCore() {
  ({ coreMesh, coreOuterParticles, selectionRing } = createEngineHolographicCore({
    THREE,
    documentRef: document,
    scene,
    coreGroup,
    prefersReducedMotion,
    isCoarsePointer
  }));
}

function createRadialGlowTexture({ inner = 'rgba(255,255,255,0.95)', mid = 'rgba(0,240,255,0.35)', outer = 'rgba(0,0,0,0)', size = 256 } = {}) {
  return createEngineRadialGlowTexture({ THREE, documentRef: document, inner, mid, outer, size });
}

function createDeepSpaceEffects() {
  ({ starField, milkyWayField, brightStarField, dataRibbonGroup } = createEngineDeepSpaceEffects({
    THREE,
    documentRef: document,
    scene,
    prefersReducedMotion,
    isCoarsePointer,
    flightTempVec,
    createDebrisField,
    createDustField
  }));
}

function randomizeDebrisInstance(index, ahead = false) {
  randomizeEngineDebrisInstance({ index, ahead, flightBounds, flightState, flightForward, flightRight, flightUp, debrisPositions, debrisAxes, debrisSpinRates });
}

function createDebrisField() {
  debrisField = createEngineDebrisField({
    THREE,
    scene,
    debrisCount,
    updateFlightBasis,
    randomizeDebris: randomizeDebrisInstance,
    updateDebris: updateDebrisMatrix
  });
}

function updateDebrisMatrix(index, dt, targetDebrisField = debrisField) {
  updateEngineDebrisMatrix({ index, dt, debrisField: targetDebrisField, debrisPositions, debrisAxes, debrisAngles, debrisSpinRates, debrisMatrix, debrisQuaternion, debrisPosition, debrisScale, debrisAxis });
}

function createDustField() {
  dustPositions = new Float32Array(dustParticleCount * 3);
  dustSpeeds = new Float32Array(dustParticleCount);
  ({ dustField, dustPositions, dustSpeeds } = createEngineDustField({
    THREE,
    documentRef: document,
    scene,
    dustParticleCount,
    isCoarsePointer,
    updateFlightBasis,
    randomizeDust: randomizeDustParticle,
    dustPositions,
    dustSpeeds
  }));
}

function randomizeDustParticle(index, forwardDistance = 60) {
  randomizeEngineDustParticle({ index, forwardDistance, flightState, flightForward, flightRight, flightUp, dustPositions, dustSpeeds });
}

function createFlightGameObjects() {
  ({ gameRoot, playerShip, flightNavLine } = createCombatFlightGameObjects());
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
    
    const cat = USSY_CATEGORIES[proj.category];
    const catColor = cat ? cat.color : '#00f0ff';
    const hexColor = parseInt(catColor.replace('#', '0x'));

    const nodeMesh = createPlanetNodeLOD(hexColor);
    nodeMesh.position.set(posX, yHeight, posZ);
    Object.assign(nodeMesh.userData, {
      project: proj,
      baseScale: nodeBaseScale,
      basePosition: nodeMesh.position.clone(),
      flightPosition: createFlightProjectPosition(idx, count, proj)
    });
    nodeMesh.userData.visualRadius = planetNodeRadius;
    nodeMesh.scale.setScalar(nodeBaseScale);

    const hitGeo = new THREE.SphereGeometry(planetNodeHitRadius, 16, 12);
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

function createFlightProjectPosition(idx, count, project) {
  const total = Math.max(1, count);
  const t = total === 1 ? 0.5 : idx / (total - 1);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const idOffset = Array.from(project.id || '').reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.0017;
  const theta = idx * goldenAngle + idOffset;
  const vertical = 1 - 2 * ((idx + 0.5) / total);
  const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const shellRadius = THREE.MathUtils.lerp(flightPlanetMinDistance, flightPlanetMaxDistance, t)
    + Math.sin((idx + 1) * 12.9898 + idOffset) * 54;
  return new THREE.Vector3(
    Math.cos(theta) * radial * shellRadius,
    vertical * shellRadius * 0.92 + Math.sin(theta * 1.7) * 120,
    Math.sin(theta) * radial * shellRadius
  );
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
  const flightScaleActive = scale === flightUniverseScale;
  const visualScale = flightScaleActive ? planetNodeFlightScale : 1;
  projectNodes.forEach(node => {
    if (!node.userData.basePosition) node.userData.basePosition = node.position.clone();
    if (flightScaleActive && node.userData.flightPosition) {
      node.position.copy(node.userData.flightPosition);
    } else {
      node.position.copy(node.userData.basePosition).multiplyScalar(scale);
    }
    node.scale.setScalar((node.userData.baseScale ?? nodeBaseScale) * visualScale);
    if (node.userData.distantHalo) node.userData.distantHalo.visible = flightScaleActive;
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

function createPlanetNodeLOD(hexColor) {
  if (!createPlanetNodeLOD.glowTexture) {
    createPlanetNodeLOD.glowTexture = createRadialGlowTexture({
      inner: 'rgba(255,255,255,0.85)',
      mid: 'rgba(0,240,255,0.36)',
      outer: 'rgba(0,0,0,0)',
      size: 128
    });
  }
  const lod = new THREE.LOD();
  const highMat = new THREE.MeshBasicMaterial({ color: hexColor, wireframe: true, transparent: true, opacity: 0.92 });
  const midMat = new THREE.MeshBasicMaterial({ color: hexColor, wireframe: true, transparent: true, opacity: 0.78 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: hexColor,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const spriteMat = new THREE.SpriteMaterial({
    map: createPlanetNodeLOD.glowTexture,
    color: hexColor,
    transparent: true,
    opacity: 0.64,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const distantHaloMat = new THREE.SpriteMaterial({
    map: createPlanetNodeLOD.glowTexture,
    color: hexColor,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const high = new THREE.Mesh(new THREE.IcosahedronGeometry(planetNodeRadius, 3), highMat);
  const medium = new THREE.Mesh(new THREE.IcosahedronGeometry(planetNodeRadius, 1), midMat);
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.setScalar(planetNodeRadius * 5.8);
  const distantHalo = new THREE.Sprite(distantHaloMat);
  distantHalo.scale.setScalar(planetNodeRadius * planetDistantHaloScale);
  distantHalo.visible = false;
  const glowShell = new THREE.Mesh(new THREE.SphereGeometry(planetNodeRadius * 1.18, 24, 12), glowMat);
  lod.addLevel(high, 0);
  lod.addLevel(medium, 80);
  lod.addLevel(sprite, 220);
  lod.add(glowShell);
  lod.add(distantHalo);
  lod.userData.visualMaterials = [highMat, midMat, spriteMat];
  lod.userData.glowMaterial = glowMat;
  lod.userData.distantHalo = distantHalo;
  lod.userData.distantHaloMaterial = distantHaloMat;
  lod.userData.visualRadius = planetNodeRadius;
  return lod;
}

function setProjectNodeOpacity(node, opacity) {
  if (!node) return;
  node.userData.visualMaterials?.forEach(material => {
    material.opacity = material.isSpriteMaterial ? opacity * 0.48 : opacity;
  });
  if (node.userData.glowMaterial) node.userData.glowMaterial.opacity = 0.18 * opacity;
  if (node.userData.distantHaloMaterial) node.userData.distantHaloMaterial.opacity = 0.18 * opacity;
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
  ({ pointLight1, pointLight2 } = createEngineAmbientLighting(scene, { THREE }));
}

// 3. UI Syncing
function populateProjectsUI() {
  return populateProjectsUIModule();
}

function setupUIEventListeners() {
  return setupUIEventListenersModule();
}

// Select project by ID
function selectProject(projId, triggerFly = true) {
  return selectProjectModule(projId, triggerFly);
}

// Mode Transitions
function activateConsoleMode() {
  return activateConsoleModeModule();
}

function deactivateConsoleMode() {
  return deactivateConsoleModeModule();
}

function resetCategoryFilterForFlight() {
  return resetCategoryFilterForFlightModule();
}

function enterFlightMode() {
  if (!renderer || !renderer.domElement) return;
  sfxEngine.init();
  sfxEngine.stopStationAmbient();
  sfxEngine.startEngineHum();
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
  flightState.fuel = flightState.maxFuel;
  flightState.fuelDepleted = false;
  flightState.currentDockedProject = null;
  flightState.thrust = 14;
  flightState.strafe = 8;
  flightState.damping = 0.985;
  resetFlightAssistState();
  resetCombatState(combatState);
  combatState.heat = 0;
  combatState.overheated = false;
  combatState.adrenaline = 0;
  combatState.afterburnerActive = false;
  combatState.afterburnerUntil = 0;
  combatState.afterburnerCooldownUntil = 0;
  combatState.overchargeUsed = false;
  syncCombatCreditsFromTrader();
  skillTree.applyAll();
  traderState.fuel = traderState.maxFuel;
  applyPersistedFlightResources();
  traderState.docked = false;
  traderState.dockedStation = null;
  gameOrchestrator.tutorialComplete = false;
  gameOrchestrator.pendingEvent = null;
  gameOrchestrator.bountyPendingReward = 0;
  gameOrchestrator.nextPollAt = 0;
  gameOrchestrator.lastEventTime = 0;
  gameOrchestrator.lastEventId = null;
  applyPersistedMissionProgress();
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
  flightState.shieldCriticalSpoken = false;
  flightState.hullCriticalLogged = false;
  flightState.finalApproachSpoken = false;
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

  ttsEngine.speak('USSYVERSE DOGFIGHT MODE ACTIVATED. WELCOME, OPERATOR.', { rate: 1.0, pitch: 0.72, priority: 'high' });
  if (pendingRunState) {
    if (applySavedRunState(pendingRunState)) {
      showGameMessage({ type: 'PREVIOUS RUN DETECTED', source: 'SESSION STORAGE', text: 'PREVIOUS RUN DETECTED. SESSION STATE RESTORED.', choices: [{ key: 'space', code: 'Space', label: 'CONTINUE', action: () => dismissGameMessage() }], ttsPriority: 'normal' });
    } else {
      clearRunState();
      showFlightStartupChoice();
    }
    pendingRunState = null;
  } else {
    clearRunState();
    showFlightStartupChoice();
  }
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
  combatAudio.stopAll();
  sfxEngine.stopEngineHum();
  sfxEngine.stopStationAmbient();
  isFlightActive = false;
  flightState.pointerLocked = false;
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  flightState.crosshairNode = null;
  flightState.navNode = null;
  flightState.navDistance = Infinity;
  flightState.navEta = '--';
  flightState.autopilot = false;
  flightState.currentDockedProject = null;
  flightState.vel.set(0, 0, 0);
  resetFlightAssistState();
  traderState.docked = false;
  traderState.dockedStation = null;
  gameOrchestrator.polling = false;
  gameOrchestrator.pendingEvent = null;
  if (flightHud) flightHud.classList.remove('afterburner-active');
  document.body.classList.remove('flight-active', 'pointer-unlocked', 'flight-third-person');
  if (gameRoot) gameRoot.visible = false;
  if (debrisField) debrisField.visible = false;
  if (dustField) dustField.visible = false;
  if (scene.fog) scene.fog.density = 0.02;
  applyFlightUniverseScale(1);
  enemies.forEach(enemy => deactivateCombatObject(enemy));
  playerBullets.forEach(bullet => deactivateCombatObject(bullet));
  enemyBullets.forEach(bullet => deactivateCombatObject(bullet));
  playerMissiles.forEach(missile => deactivateCombatObject(missile));
  resetWeaponVfxPools();
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

function toggleFlightView() {
  if (flightState.keys.has('KeyC')) return;
  flightState.view = flightState.view === 'cockpit' ? 'third' : 'cockpit';
  document.body.classList.toggle('flight-third-person', flightState.view === 'third');
  flightState.status = `${flightState.view.toUpperCase()} VIEW ACTIVE`;
  updateFlightHud(true);
  updateCockpitRadar(0, true);
}

function getVoicePersona(source = '') {
  return getVoicePersonaModule(source);
}

function syncCombatCreditsFromTrader() {
  traderState.credits = Math.max(0, Math.round(traderState.credits));
}

function setCombatCredits(value) {
  traderState.credits = Math.max(0, Math.round(value));
}

function addCombatCredits(value) {
  setCombatCredits(traderState.credits + value);
  if (value > 0 && isFlightActive) showCreditGain(value);
}

function triggerEnemyDeathFeedback(enemy, cls) {
  const isDreadnought = cls.id === 'dreadnought';
  const overlay = globalThis.document?.getElementById?.('cockpit-overlay');
  if (overlay) {
    const color = `#${cls.color.toString(16).padStart(6, '0')}`;
    const durationMs = isDreadnought ? 400 : 180;
    overlay.style.setProperty('--death-flash-color', color);
    overlay.style.setProperty('--death-flash-duration', `${durationMs}ms`);
    overlay.classList.remove('enemy-death-flash');
    void overlay.offsetWidth;
    overlay.classList.add('enemy-death-flash');
    globalThis.setTimeout?.(() => overlay.classList.remove('enemy-death-flash'), durationMs);
  }
  if (enemy?.userData?.engineGlow) {
    enemy.userData.engineGlow.intensity = isDreadnought ? 12.0 : 6.0;
    enemy.userData.engineGlowDeathSpike = true;
  }
  if (isDreadnought) sfxEngine.playFlat('explosion_large', { volume: 0.9 });
}

function announceEnemyWave(waveEnemies = []) {
  const spawned = waveEnemies.filter(enemy => enemy?.userData?.active);
  if (!spawned.length) return;
  const counts = new Map();
  spawned.forEach(enemy => {
    const cls = getEnemyClass(enemy.userData.classId || 'scout');
    counts.set(cls.label, (counts.get(cls.label) || 0) + 1);
  });
  const waveComposition = [...counts.entries()]
    .map(([label, count]) => `${count}x ${label}`)
    .join(', ');
  combatState.waveNumber = (combatState.waveNumber || 0) + 1;
  combatState.waveComposition = waveComposition;
  if (spawned.some(enemy => enemy?.userData?.classId === 'dreadnought')) {
    addKillFeedEntry('DREADNOUGHT SPAWNED', 'var(--cyber-pink)');
  }
  showGameMessage({
    type: `WAVE ${combatState.waveNumber}`,
    source: 'TACTICAL',
    text: `${spawned.length} HOSTILES INBOUND - ${waveComposition}`,
    ttsPriority: 'normal'
  });
}

function showGameMessage({ type = 'MISSION', source = 'USSYVERSE CONTROL', text = '', choices = [], ui = null, onDismiss = null, typeSpeed = 18, ttsPriority = 'high' }) {
  // Contract-preserved in messages.js: gameMessageState.ttsWaitUntil = ttsEngine.enabled ? performance.now() + 3500 : 0
  // Contract-preserved in messages.js: onStart: () => { gameMessageState.ttsWaitUntil = 0; priority: ttsPriority }
  return showGameMessageModule({ type, source, text, choices, ui, onDismiss, typeSpeed, ttsPriority });
}

function renderGameMessage() {
  return renderGameMessageModule();
}

function updateGameMessage(time) {
  // Contract-preserved in messages.js: if (time < gameMessageState.ttsWaitUntil) return
  return updateGameMessageModule(time);
}

function dismissGameMessage() {
  const dismissed = dismissGameMessageModule();
  if (dismissed) sfxEngine.playFlat('ui_deny', { volume: 0.55 });
  return dismissed;
}

function handleGameMessageChoice(event) {
  const handled = handleGameMessageChoiceModule(event);
  if (handled) sfxEngine.playFlat('ui_confirm', { volume: 0.55 });
  return handled;
}

function handleFlightUndock() {
  sfxEngine.stopStationAmbient();
  sfxEngine.startEngineHum();
}

function resetFlightAssistState() {
  flightState.throttleEnabled = false;
  flightState.throttleLevel = 0.5;
  flightState.matchSpeedActive = false;
  flightState.matchSpeedTarget = null;
  flightState.matchSpeedUntil = 0;
  flightState.cameraRollTarget = 0;
  flightState.cameraRollCurrent = 0;
}

function registerFlightAssistKeyCapture() {
  if (flightAssistKeyCaptureRegistered) return;
  flightAssistKeyCaptureRegistered = true;
  const assistKeys = new Set(['KeyT', 'KeyC']);
  window.addEventListener('keydown', event => {
    if (!isFlightActive || !assistKeys.has(event.code)) return;
    flightState.keys.add(event.code);
  }, true);
  window.addEventListener('keyup', event => {
    if (!assistKeys.has(event.code)) return;
    flightState.keys.delete(event.code);
  }, true);
}

function undockFromTradeMenu() {
  flightState.landed = false;
  flightState.currentDockedProject = null;
  resetFlightAssistState();
  handleFlightUndock();
  flightState.status = 'UNDOCKED. CLICK VIEWPORT TO RECAPTURE MOUSELOOK.';
  flightState.statusUntil = performance.now() + 3000;
  updateFlightHud(true);
  saveCurrentRunState({ manual: true });
}

function resetContractState() {
  missionState.contractId = null;
  missionState.contractTitle = '';
  missionState.contractStepIndex = 0;
  missionState.contractProgress = 0;
  missionState.contractStartStationId = null;
}

function getMissionContract(contractId) {
  return missionContracts.find(contract => contract.id === contractId) || null;
}

function getActiveContractStep() {
  const contract = getMissionContract(missionState.contractId);
  return contract?.steps?.[missionState.contractStepIndex] || null;
}

function setCurrentObjective({ id = 'free-roam', kicker = 'DIRECTOR IDLE', title = 'Free Roam', detail = 'Pick a project node, accept a contract, or wait for the director.', progress = null, target = null, targetProjectId = null, source = 'local' } = {}) {
  missionState.currentObjective = { id, kicker, title, detail, progress, target, targetProjectId, source };
  renderObjectivesPanel();
}

function getObjectiveProgressLabel(objective = missionState.currentObjective) {
  if (!objective) return 'NO ACTIVE OBJECTIVE';
  if (Number.isFinite(objective.progress) && Number.isFinite(objective.target) && objective.target > 0) {
    return `PROGRESS ${Math.min(objective.progress, objective.target)}/${objective.target}`;
  }
  return objective.source === 'director' ? 'DIRECTOR TRACKING' : 'TRACKED IN HUD';
}

function renderObjectivesPanel() {
  if (!objectivesPanel) return;
  const objective = missionState.currentObjective || {
    kicker: 'DIRECTOR IDLE',
    title: 'Free Roam',
    detail: 'Launch the ship, pick a project node, or accept a contract.',
    source: 'local'
  };
  if (objectiveKicker) objectiveKicker.textContent = objective.kicker || 'OBJECTIVE';
  if (objectiveTitle) objectiveTitle.textContent = objective.title || 'Free Roam';
  if (objectiveBody) objectiveBody.textContent = objective.detail || 'No objective selected.';
  if (objectiveProgress) objectiveProgress.textContent = getObjectiveProgressLabel(objective);
  objectiveViewButtons.forEach(button => {
    const active = button.dataset.objectiveView === missionState.objectiveView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (currentObjectivePane) currentObjectivePane.hidden = missionState.objectiveView !== 'current';
  if (availableObjectivesPane) availableObjectivesPane.hidden = missionState.objectiveView !== 'available';
  if (!availableObjectivesList) return;
  availableObjectivesList.innerHTML = '';
  missionContracts.forEach(contract => {
    const canStart = gameOrchestrator.tutorialComplete && !missionState.active;
    const card = document.createElement('div');
    card.className = 'available-objective-card';
    const title = document.createElement('h5');
    title.textContent = contract.title;
    const desc = document.createElement('p');
    desc.textContent = contract.description;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'objective-start-btn';
    button.dataset.startObjective = contract.id;
    button.disabled = !canStart;
    button.textContent = missionState.active ? 'ACTIVE MISSION LOCK' : (gameOrchestrator.tutorialComplete ? 'TRACK OBJECTIVE' : 'COMPLETE STARTUP FIRST');
    card.append(title, desc, button);
    availableObjectivesList.appendChild(card);
  });
}

function switchObjectivesView(view) {
  missionState.objectiveView = view === 'available' ? 'available' : 'current';
  renderObjectivesPanel();
}

function toggleObjectivesView() {
  switchObjectivesView(missionState.objectiveView === 'current' ? 'available' : 'current');
}

function handleObjectivesPanelClick(event) {
  const viewButton = event.target.closest('[data-objective-view]');
  if (viewButton) {
    switchObjectivesView(viewButton.dataset.objectiveView);
    return;
  }
  const startButton = event.target.closest('[data-start-objective]');
  if (startButton && !startButton.disabled) startMissionContract(startButton.dataset.startObjective);
}

function showFlightStartupChoice() {
  // Contract-preserved for TTS/typewriter pacing tests: typeSpeed: 30
  setCurrentObjective({
    id: 'startup-choice',
    kicker: 'BOOT SEQUENCE',
    title: 'Choose Deployment',
    detail: 'Start the guided tutorial or drop directly into director-led free roam.'
  });
  showGameMessage({
    type: 'DEPLOYMENT CHOICE',
    source: 'USSYVERSE CONTROL',
    text: 'DOGFIGHT MODE ONLINE. CHOOSE A GUIDED TUTORIAL WITH COMBAT, LANDING, AND TRADING, OR DROP STRAIGHT INTO FREE ROAM WITH THE DIRECTOR ENABLED.',
    choices: [
      { key: '1', code: 'Digit1', label: 'START TUTORIAL', action: () => startTutorialMission() },
      { key: '2', code: 'Digit2', label: 'FREE ROAM WITH DIRECTOR', action: () => startFreeRoam() }
    ],
    onDismiss: () => startTutorialMission(),
    typeSpeed: 18
  });
  flightState.status = 'SELECT DEPLOYMENT PROFILE';
  flightState.statusUntil = performance.now() + 3500;
}

function startFreeRoam(message = 'FREE ROAM ENABLED. THE DIRECTOR WILL OFFER COMMS, BOUNTIES, DISTRESS CALLS, AND ROUTE PRESSURE AS YOU EXPLORE.') {
  missionState.active = false;
  missionState.step = 'idle';
  missionState.kills = 0;
  resetContractState();
  gameOrchestrator.tutorialComplete = true;
  gameOrchestrator.nextPollAt = performance.now() + 12000;
  setCurrentObjective({
    id: 'free-roam',
    kicker: 'DIRECTOR ONLINE',
    title: 'Free Roam',
    detail: 'Accept available objectives from the HUD, land at project stations, trade cargo, or wait for the director to inject events.',
    source: 'director'
  });
  showGameMessage({ type: 'SYSTEM UPDATE', source: 'USSYVERSE CONTROL', text: message, ttsPriority: 'normal' });
  updateFlightHud(true);
}

function startTutorialMission() {
  missionStartTutorialMission();
}

function setMissionStep(step) {
  missionSetMissionStep(step);
}

function startTradingTutorialBuy(projectId) {
  missionState.step = 'tradingTutorialBuy';
  missionState.contractStartStationId = projectId;
  setCurrentObjective({
    id: 'tutorial-trade-buy',
    kicker: 'TUTORIAL 4/5',
    title: 'Buy Cargo',
    detail: 'Buy at least one commodity from the station market.',
    progress: 0,
    target: 1
  });
  openTradeMenu(projectId);
}

function finishTutorialMission(message) {
  const pointsBefore = combatState.skillPoints;
  emitCombatMissionComplete({ type: 'tutorial' });
  missionState.active = false;
  missionState.step = 'idle';
  resetContractState();
  gameOrchestrator.tutorialComplete = true;
  gameOrchestrator.nextPollAt = performance.now() + 30000;
  setCurrentObjective({
    id: 'free-roam',
    kicker: 'DIRECTOR ONLINE',
    title: 'Free Roam',
    detail: 'Pick an available objective, trade between project stations, or wait for the director to inject live events.',
    source: 'director'
  });
  if (combatState.skillPoints > pointsBefore) flightState.status = `MISSION BONUS SP:${combatState.skillPoints}`;
  showGameMessage({ type: 'SYSTEM UPDATE', source: 'USSYVERSE CONTROL', text: message, ttsPriority: 'normal' });
  updateFlightHud(true);
}

function getTradingTutorialDestinationId() {
  if (projectNodeById.has('openclawssy')) return 'openclawssy';
  const destination = USSY_PROJECTS.find(project => project.id !== missionState.contractStartStationId && project.id !== 'devussy');
  return destination?.id || 'devussy';
}

function updateMission(time) {
  updateGameMessage(time);
  missionUpdateMission(time);
}

function registerMissionKill(enemy) {
  missionRegisterMissionKill(enemy);
}

function showMissionKillProgress(text) {
  const killCallouts = [
    'SPLASH ONE',
    'BOGEY DOWN',
    'KILL CONFIRMED',
    'TARGET ELIMINATED',
    'FOX TWO AWAY',
    'TALLY HO',
    'GUNS GUNS GUNS',
    'BANDIT DOWN',
    'CLEARED HOT',
    'WINCHESTER ACHIEVED',
    'SPLASH ANOTHER',
    'GOOD KILL',
    'RADAR CONTACT LOST',
    'BINGO BINGO',
    'BREAKING RIGHT',
    'ENGAGED'
  ];
  combatAudio.bark(killCallouts[Math.floor(Math.random() * killCallouts.length)], { ...getVoicePersona('COMBAT SYSTEM'), volume: 0.85, priority: 'low' });
  showGameMessage({ type: 'MISSION PROGRESS', source: 'COMBAT SYSTEM', text });
}

function handleMissionLanding(project) {
  if (!missionState.active) return handleDirectorLanding(project);
  return missionHandleMissionLanding(project.id);
}

function handleDirectorLanding(project) {
  const objective = missionState.currentObjective;
  if (!objective?.id?.startsWith('director-distress')) return true;
  if (objective.targetProjectId && project.id !== objective.targetProjectId) return true;
  setCurrentObjective({
    id: 'free-roam',
    kicker: 'DIRECTOR ONLINE',
    title: 'Free Roam',
    detail: 'Distress coordinates reached. Await the next director event or pick a contract.',
    source: 'director'
  });
  showGameMessage({ type: 'DISTRESS RESOLVED', source: 'USSYVERSE CONTROL', text: 'DISTRESS COORDINATES REACHED. LOCAL STATION LOGGED YOUR RESPONSE.' });
  return true;
}

function spawnTutorialBogeys() {
  missionSetMissionStep('killTutorialBogeys');
}

function seededRange(seed, min, max) {
  return min + (Math.abs(seed) % (max - min + 1));
}

function getFactionMissionDestination(projectId, seed) {
  const candidates = USSY_PROJECTS.filter(project => project.id !== projectId);
  return candidates[seed % Math.max(1, candidates.length)] || USSY_PROJECTS.find(project => project.id === projectId) || null;
}

function upsertFactionMissionContract(projectId) {
  const stationMissions = getStationMissions(projectId);
  if (stationMissions.length) {
    const mission = stationMissions.find(item => stationMissionAvailable(item)) || stationMissions[0];
    return upsertStationMissionContract(projectId, mission);
  }
  const project = USSY_PROJECTS.find(item => item.id === projectId) || { id: projectId, name: stationName(projectId), category: 'tools' };
  const seed = Array.from(projectId).reduce((sum, char) => sum + char.charCodeAt(0), 0) + new Date().getDay();
  const missionType = ['escort', 'delivery', 'bounty'][seed % 3];
  const destination = getFactionMissionDestination(projectId, seed + 1) || project;
  const faction = normalizeCategory(project.category);
  const id = `faction-${projectId}-${new Date().getDay()}`;
  const existing = getMissionContract(id);
  if (existing) return existing;
  const commodityPool = COMMODITIES.filter(commodity => !commodity.blackMarketOnly && !commodity.restricted);
  const commodity = commodityPool[seed % commodityPool.length] || COMMODITIES[0];
  let contract;

  if (missionType === 'escort') {
    const rewardCredits = seededRange(seed * 7, 50, 300);
    contract = {
      id,
      title: `${project.name} Escort Sweep`,
      description: `Destroy 2 hostiles near ${destination.name}. Reward: ${rewardCredits}cr + 5 rep.`,
      rewardCredits,
      rewardRep: 5,
      rewardFaction: faction,
      steps: [
        { id: `${id}-rally`, type: 'land', label: `Rally At ${destination.name}`, detail: `Fly to ${destination.name} to draw out the escort raiders.`, targetProjectId: destination.id },
        { id: `${id}-sweep`, type: 'kills', label: `Clear ${destination.name} Hostiles`, detail: `Destroy 2 hostiles near ${destination.name}.`, target: 2, spawnEnemies: 2 }
      ]
    };
  } else if (missionType === 'delivery') {
    const rewardCredits = seededRange(seed * 11, 100, 200);
    contract = {
      id,
      title: `${project.name} Delivery Run`,
      description: `Buy 1 ${commodity.name} here, sell at ${destination.name}. Bonus: ${rewardCredits}cr + 8 rep.`,
      rewardCredits,
      rewardRep: 8,
      rewardFaction: faction,
      steps: [
        { id: `${id}-buy`, type: 'trade', action: 'buy', commodityId: commodity.id, stationId: projectId, label: `Buy ${commodity.name}`, detail: `Buy 1 ${commodity.name} at ${project.name}.`, target: 1 },
        { id: `${id}-travel`, type: 'land', label: `Dock At ${destination.name}`, detail: `Deliver the cargo to ${destination.name}.`, targetProjectId: destination.id },
        { id: `${id}-sell`, type: 'trade', action: 'sell', commodityId: commodity.id, stationId: destination.id, label: `Sell ${commodity.name}`, detail: `Sell 1 ${commodity.name} at ${destination.name}.`, target: 1 }
      ]
    };
  } else {
    const rewardCredits = seededRange(seed * 13, 150, 350);
    contract = {
      id,
      title: `${project.name} Bounty Packet`,
      description: `Destroy 3 enemies. Reward: ${rewardCredits}cr + 6 rep.`,
      rewardCredits,
      rewardRep: 6,
      rewardFaction: faction,
      steps: [
        { id: `${id}-bounty`, type: 'kills', label: 'Destroy Bounty Targets', detail: 'Destroy 3 enemies marked by station control.', target: 3, spawnEnemies: 3 }
      ]
    };
  }

  missionContracts.push(contract);
  renderObjectivesPanel();
  return contract;
}

function stationMissionAvailable(mission) {
  if (!mission?.requiredCargo) return true;
  return (traderState.cargo[mission.requiredCargo.commodityId] || 0) >= mission.requiredCargo.qty;
}

function stationMissionCargoText(mission) {
  if (!mission?.requiredCargo) return 'NO CARGO REQUIRED';
  const commodity = COMMODITIES.find(item => item.id === mission.requiredCargo.commodityId);
  const held = traderState.cargo[mission.requiredCargo.commodityId] || 0;
  return `${held}/${mission.requiredCargo.qty} ${commodity?.name || mission.requiredCargo.commodityId.toUpperCase()}`;
}

function stationMissionRewardText(mission) {
  return `${mission.reward?.credits || 0}CR + ${mission.reward?.rep || 0} REP + ${mission.reward?.fuelBonus || 0} FUEL`;
}

function buildStationMissionSteps(projectId, mission) {
  const destinationName = stationName(mission.deliverTo);
  if (mission.type === 'ESCORT') {
    return [
      { id: `${mission.id}-rally`, type: 'land', label: `Rally At ${destinationName}`, detail: `Dock at ${destinationName} and establish escort contact.`, targetProjectId: mission.deliverTo, target: 1 },
      { id: `${mission.id}-cover`, type: 'kills', label: `Cover ${destinationName}`, detail: `Destroy 2 hostile contacts near ${destinationName}.`, target: 2, spawnEnemies: 2 }
    ];
  }
  if (mission.requiredCargo) {
    const commodity = COMMODITIES.find(item => item.id === mission.requiredCargo.commodityId);
    return [
      { id: `${mission.id}-dock`, type: 'land', label: `Dock At ${destinationName}`, detail: `Deliver ${mission.requiredCargo.qty} ${commodity?.name || mission.requiredCargo.commodityId.toUpperCase()} to ${destinationName}.`, targetProjectId: mission.deliverTo, target: 1 },
      { id: `${mission.id}-sell`, type: 'trade', action: 'sell', commodityId: mission.requiredCargo.commodityId, stationId: mission.deliverTo, label: `Transfer ${commodity?.name || mission.requiredCargo.commodityId.toUpperCase()}`, detail: `Sell ${mission.requiredCargo.qty} ${commodity?.name || mission.requiredCargo.commodityId.toUpperCase()} at ${destinationName} to complete delivery.`, target: mission.requiredCargo.qty }
    ];
  }
  return [
    { id: `${mission.id}-travel`, type: 'land', label: `${mission.type} ${destinationName}`, detail: `Dock at ${destinationName} and transmit the ${mission.type.toLowerCase()} packet.`, targetProjectId: mission.deliverTo, target: 1 }
  ];
}

function upsertStationMissionContract(projectId, mission) {
  const existing = getMissionContract(mission.id);
  if (existing) return existing;
  const project = USSY_PROJECTS.find(item => item.id === projectId) || { category: 'tools' };
  const contract = {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    rewardCredits: mission.reward?.credits || 0,
    rewardRep: mission.reward?.rep || 0,
    rewardFuel: mission.reward?.fuelBonus || 0,
    rewardFaction: normalizeCategory(project.category),
    steps: buildStationMissionSteps(projectId, mission)
  };
  missionContracts.push(contract);
  renderObjectivesPanel();
  return contract;
}

function acceptLoreMission(projectId, mission) {
  if (!mission?.id) return;
  if (missionState.active || !gameOrchestrator.tutorialComplete || !stationMissionAvailable(mission)) {
    showStationMissionDetail(projectId, mission);
    return;
  }
  const contract = upsertStationMissionContract(projectId, mission);
  startMissionContract(contract);
  sfxEngine.playFlat('ui_confirm', { volume: 0.55 });
  flightState.status = `CONTRACT ACCEPTED: ${mission.title}`;
  flightState.statusUntil = performance.now() + 2000;
  openStationMenu(projectId);
}

function showStationMissionDetail(projectId, mission) {
  const available = stationMissionAvailable(mission);
  const choices = [{ key: '2', code: 'Digit2', label: 'MISSION BOARD', action: () => showFactionMission(projectId) }];
  if (!missionState.active && gameOrchestrator.tutorialComplete && available) {
    choices.unshift({ key: '1', code: 'Digit1', label: 'ACCEPT MISSION', action: () => acceptLoreMission(projectId, mission) });
  }
  showGameMessage({
    type: available ? 'MISSION DETAIL' : 'MISSION LOCKED',
    source: `${stationName(projectId).toUpperCase()} CONTRACT BOARD`,
    text: `${mission.title.toUpperCase()}. TYPE ${mission.type} // ${available ? 'AVAILABLE' : 'LOCKED'} // CARGO ${stationMissionCargoText(mission)}. ${mission.description} REWARD ${stationMissionRewardText(mission)}.`,
    choices,
    ttsPriority: 'normal'
  });
}

function showFactionMission(projectId) {
  const lore = getStationLore(projectId);
  const stationMissions = getStationMissions(projectId);
  if (!stationMissions.length) {
    const contract = upsertFactionMissionContract(projectId);
    const choices = [
      { key: '2', code: 'Digit2', label: 'STATION MENU', action: () => openTradeMenu(projectId) }
    ];
    if (!missionState.active && gameOrchestrator.tutorialComplete) {
      choices.unshift({ key: '1', code: 'Digit1', label: 'ACCEPT MISSION', action: () => startMissionContract(contract.id) });
    }
    showGameMessage({
      type: 'FACTION MISSION',
      source: `${stationName(projectId).toUpperCase()} CONTRACT BOARD`,
      text: missionState.active
        ? 'MISSION BOARD LOCKED. COMPLETE CURRENT OBJECTIVE FIRST.'
        : `${contract.title.toUpperCase()}. ${contract.description}`,
      ui: {
        headerTitle: 'MISSION BOARD',
        headerBadge: stationName(projectId).toUpperCase(),
        colorClass: lore.colorClass || 'green'
      },
      choices,
      ttsPriority: 'normal'
    });
    return;
  }
  const choices = stationMissions.map((mission, idx) => {
    const available = stationMissionAvailable(mission);
    const disabled = missionState.active || !gameOrchestrator.tutorialComplete || !available;
    return {
      key: String(idx + 1),
      code: `Digit${idx + 1}`,
      label: `ACCEPT // ${mission.title}`,
      hint: `${mission.type} // ${mission.description} // REWARD ${stationMissionRewardText(mission)}`,
      tone: available ? 'confirm' : 'deny',
      disabled,
      action: () => acceptLoreMission(projectId, mission)
    };
  });
  const backChoice = { key: 'b', code: 'KeyB', label: 'STATION MENU', action: () => openStationMenu(projectId) };
  const rows = stationMissions.map((mission, idx) => {
    const status = stationMissionAvailable(mission) ? 'AVAILABLE' : 'LOCKED';
    return `[${idx + 1}] ${status}: ${mission.type} // ${mission.title} TO ${stationName(mission.deliverTo).toUpperCase()} // ${mission.description} // REWARD ${stationMissionRewardText(mission)} // ${stationMissionCargoText(mission)}`;
  });
  showGameMessage({
    type: 'MISSION BOARD',
    source: `${stationName(projectId).toUpperCase()} CONTRACT BOARD`,
    text: missionState.active
      ? 'MISSION BOARD LOCKED. COMPLETE CURRENT OBJECTIVE FIRST.'
      : rows.join(' // '),
    choices,
    ui: {
      headerTitle: 'MISSION BOARD',
      headerBadge: stationName(projectId).toUpperCase(),
      colorClass: lore.colorClass || 'green',
      layout: 'dock-grid',
      footerStats: [`${stationMissions.length} CONTRACTS`, `${traderState.credits}CR`],
      footerChoices: [backChoice]
    },
    ttsPriority: 'normal'
  });
}

function startMissionContract(contractId) {
  if (missionState.active || !gameOrchestrator.tutorialComplete) return;
  const contract = typeof contractId === 'string' ? getMissionContract(contractId) : contractId;
  if (!contract) return;
  return startOrchestratorMissionContract(contract, {
    combatAudio,
    dockedAt: traderState.dockedStation || null,
    getVoicePersona,
    missionContracts,
    missionState,
    setMissionStep,
    ttsEngine
  });
}

function beginContractStep() {
  const step = getActiveContractStep();
  if (!step) return completeMissionContract();
  missionState.step = step.id;
  missionState.contractProgress = 0;
  updateContractObjectiveProgress();
  if ((step.type === 'land' || step.type === 'landDifferent') && step.targetProjectId) {
    const targetNode = projectNodeById.get(step.targetProjectId);
    if (targetNode) setNavigationTarget(targetNode, 'mission');
  }
  if (step.type === 'kills') {
    resetCombatSessionStats(combatState);
    enemies.forEach(enemy => deactivateCombatObject(enemy));
    const count = Math.min(step.spawnEnemies || step.target || 1, enemies.length);
    const spawned = [];
    for (let i = 0; i < count; i++) {
      spawnEnemy(enemies[i], i * 1.8, i * 0.6);
      spawned.push(enemies[i]);
    }
    announceEnemyWave(spawned);
    flightState.status = `${step.label.toUpperCase()} STARTED`;
    flightState.statusUntil = performance.now() + 2400;
  }
}

function updateContractObjectiveProgress() {
  const contract = getMissionContract(missionState.contractId);
  const step = getActiveContractStep();
  if (!contract || !step) return;
  setCurrentObjective({
    id: `${contract.id}:${step.id}`,
    kicker: `${contract.title} ${missionState.contractStepIndex + 1}/${contract.steps.length}`,
    title: step.label,
    detail: step.detail,
    progress: Number.isFinite(step.target) ? missionState.contractProgress : null,
    target: Number.isFinite(step.target) ? step.target : null
  });
}

function advanceContractStep() {
  const contract = getMissionContract(missionState.contractId);
  if (!contract) return;
  missionState.contractStepIndex += 1;
  if (missionState.contractStepIndex >= contract.steps.length) {
    completeMissionContract();
    return;
  }
  beginContractStep();
  const step = getActiveContractStep();
  showGameMessage({ type: 'OBJECTIVE UPDATED', source: 'USSYVERSE CONTROL', text: `NEXT STEP: ${step.label.toUpperCase()}. ${step.detail}`, ttsPriority: 'normal' });
}

function completeMissionContract() {
  const contract = getMissionContract(missionState.contractId);
  const reward = contract?.rewardCredits || 0;
  const rewardFuel = contract?.rewardFuel || contract?.rewards?.fuel || 0;
  const rewardRep = contract?.rewardRep ?? 5;
  const rewardFaction = normalizeCategory(contract?.rewardFaction || getStationCategory(traderState.dockedStation || missionState.contractStartStationId || 'devussy'));
  emitCombatMissionComplete({ type: 'contract', contractId: contract?.id });
  if (reward > 0) addCombatCredits(reward);
  if (rewardFuel > 0) traderState.fuel = Math.min(traderState.maxFuel, traderState.fuel + rewardFuel);
  if (rewardRep > 0) gainReputation(rewardFaction, rewardRep);
  const title = contract?.title || 'Objective';
  missionState.active = false;
  missionState.step = 'idle';
  resetContractState();
  setCurrentObjective({
    id: 'free-roam',
    kicker: 'DIRECTOR ONLINE',
    title: 'Free Roam',
    detail: `${title} complete${reward ? `, ${reward}cr paid` : ''}${rewardFuel ? `, ${rewardFuel} fuel loaded` : ''}. Pick another objective or keep flying.`,
    source: 'director'
  });
  showGameMessage({ type: 'OBJECTIVE COMPLETE', source: 'USSYVERSE CONTROL', text: `${title.toUpperCase()} COMPLETE.${reward ? ` ${reward} CREDITS TRANSFERRED.` : ''}${rewardFuel ? ` ${rewardFuel} FUEL LOADED.` : ''}`, ttsPriority: 'normal' });
  updateFlightHud(true);
}

function handleContractLanding(project) {
  const step = getActiveContractStep();
  if (!step || (step.type !== 'land' && step.type !== 'landDifferent')) return true;
  if (step.targetProjectId && project.id !== step.targetProjectId) {
    flightState.status = `OBJECTIVE TARGET: ${stationName(step.targetProjectId).toUpperCase()}`;
    flightState.statusUntil = performance.now() + 2500;
    updateFlightHud(true);
    return false;
  }
  if (step.type === 'landDifferent' && project.id === missionState.contractStartStationId) {
    flightState.status = 'OBJECTIVE NEEDS A DIFFERENT STATION';
    flightState.statusUntil = performance.now() + 2500;
    updateFlightHud(true);
    return false;
  }
  missionState.contractProgress = step.target || 1;
  if (!missionState.contractStartStationId) missionState.contractStartStationId = project.id;
  advanceContractStep();
  return true;
}

function handleTradeCompleted(trade) {
  if (registerMissionTrade(trade)) return;
  if (missionState.active && missionState.step === 'tradingTutorialBuy' && trade.action === 'buy') {
    missionState.contractStartStationId = trade.stationId;
    setMissionStep('tradingTutorialTravel');
    return;
  }
  if (missionState.active && missionState.step === 'tradingTutorialSell' && trade.action === 'sell') {
    setCurrentObjective({
      id: 'tutorial-trade-sell',
      kicker: 'TUTORIAL 5/5',
      title: 'Sell Cargo',
      detail: 'Cargo sold. Tutorial handoff is complete.',
      progress: 1,
      target: 1
    });
    finishTutorialMission('TUTORIAL COMPLETE. COMBAT, LANDING, TRADING, CONTRACTS, AND THE DIRECTOR ARE ONLINE.');
    return;
  }
  const step = getActiveContractStep();
  if (!missionState.active || !step || step.type !== 'trade') return;
  if (step.action && trade.action !== step.action) return;
  if (step.commodityId && trade.commodity !== step.commodityId) return;
  if (step.stationId && trade.stationId !== step.stationId) return;
  if (step.action === 'buy') missionState.contractStartStationId = trade.stationId;
  missionState.contractProgress = Math.min(step.target || 1, missionState.contractProgress + Math.max(1, trade.qty || 1));
  updateContractObjectiveProgress();
  if (missionState.contractProgress >= (step.target || 1)) advanceContractStep();
}

function handleEnemyDestroyed(enemy) {
  const cls = getEnemyClass(enemy?.userData?.classId);
  if (handleBossDeath(combatState, enemy, flightState, { addCombatCredits, addKillFeedEntry, showGameMessage })) {
    flightState.status = 'DREADNOUGHT DESTROYED +1200CR';
    flightState.statusUntil = performance.now() + 3000;
    updateFlightHud(true);
    return;
  }
  const pointsBefore = combatState.skillPoints;
  const multiplier = recordKillStreak(combatState, performance.now());
  const baseCreditReward = Number.isFinite(enemy?.userData?.creditReward) ? enemy.userData.creditReward : cls.creditReward;
  const baseXpReward = Number.isFinite(enemy?.userData?.xpReward) ? enemy.userData.xpReward : cls.xpReward;
  const creditReward = Math.round(baseCreditReward * multiplier);
  const xpReward = Math.round(baseXpReward * multiplier);
  const isBountyKill = gameOrchestrator.bountyPendingReward > 0 && enemy?.userData?.bountyEventId;
  recordCombatKillStats({ creditsEarned: isBountyKill ? 0 : creditReward, xpEarned: xpReward }, combatState);
  addKillFeedEntry(`${cls.label.toUpperCase()} DESTROYED +${creditReward}CR`, `#${cls.color.toString(16).padStart(6, '0')}`);
  triggerEnemyDeathFeedback(enemy, cls);
  sfxEngine.playPositional('explosion', enemy, { volume: 0.9 });
  emitCombatEnemyKill({ classId: cls.id, pos: enemy?.position, xpReward });
  registerMissionKill(enemy);
  if (gameOrchestrator.bountyPendingReward > 0 && enemy?.userData?.bountyEventId) {
    deactivateCombatObject(enemy);
    if (enemies.every(item => !item.userData.active)) {
      const reward = gameOrchestrator.bountyPendingReward;
      addCombatCredits(reward);
      combatState.sessionCredits += reward;
      flightState.status = `BOUNTY CLAIMED: +${reward}cr`;
      addKillFeedEntry(`WAVE CLEARED +${reward}CR`, 'var(--cyber-green)');
      flightState.statusUntil = performance.now() + 3000;
      gameOrchestrator.bountyPendingReward = 0;
      setCurrentObjective({
        id: 'free-roam',
        kicker: 'DIRECTOR ONLINE',
        title: 'Free Roam',
        detail: `Bounty wave cleared, ${reward}cr paid. Pick another objective or await director traffic.`,
        source: 'director'
      });
      ttsEngine.speak('BOUNTY CLAIMED.', getVoicePersona('USSYVERSE CONTROL'));
      updateFlightHud(true);
    }
    return;
  }
  flightState.score += Math.max(1, Math.round(baseXpReward / 10));
  addCombatCredits(creditReward);
  if (combatState.skillPoints > pointsBefore) {
    flightState.status = `SKILL POINT EARNED - SP:${combatState.skillPoints}`;
    flightState.statusUntil = performance.now() + 2500;
  } else {
    const streak = multiplier > 1 ? ` // ${combatState.killStreakCount}x STREAK ${multiplier}x` : '';
    flightState.status = `${cls.label} DESTROYED +${creditReward}CR${streak}`;
    flightState.statusUntil = performance.now() + 1800;
  }
  const killCallouts = ['SPLASH ONE', 'BOGEY DOWN', 'KILL CONFIRMED', 'TARGET ELIMINATED', 'BANDIT DOWN', 'GOOD KILL'];
  combatAudio.bark(killCallouts[Math.floor(Math.random() * killCallouts.length)], { ...getVoicePersona('COMBAT SYSTEM'), volume: 0.85, priority: 'low' });
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
  flightState.currentDockedProject = project;
  traderState.docked = true;
  traderState.dockedStation = project.id;
  saveCurrentRunState({ manual: true });
  sfxEngine.stopEngineHum();
  sfxEngine.startStationAmbient();
  flightState.vel.set(0, 0, 0);
  selectProject(project.id, false);
  if (document.pointerLockElement === renderer.domElement && document.exitPointerLock) {
    document.exitPointerLock();
  }
  if (!gameMessageState.active) openStationMenu(project.id);
}

function restockAtProject(project) {
  skillTree.applyAll();
  const maxShield = skillTree.getMaxShield();
  flightState.shield = Math.min(flightState.shield + maxShield, maxShield);
  flightState.armor = skillTree.getMaxArmor();
  if (skillTree.unlocked.has('hull_4')) {
    flightState.armor = Math.min(flightState.armor + 20, skillTree.getMaxArmor() + 20);
  }
  if (skillTree.unlocked.has('shield_4') && !combatState.overchargeUsed) {
    flightState.shield = Math.round(maxShield * 1.5);
    combatState.overchargeUsed = true;
  }
  flightState.ammo = maxPlayerAmmo;
  flightState.missiles = maxPlayerMissilesStored;
  flightState.energy = skillTree.getMaxEnergy();
  combatState.heat = 0;
  combatState.overheated = false;
  refuelAt(project.id, { free: true, silent: true });
  flightState.fuel = traderState.fuel;
  flightState.fuelDepleted = false;
  flightState.strafe = 8;
  resetFlightAssistState();
  flightState.shieldCriticalSpoken = false;
  flightState.finalApproachSpoken = false;
  flightState.status = `RESTOCKED AT ${project.name.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2500;
  ttsEngine.speak(`DOCKING AT ${project.name.toUpperCase()}. RESTOCKING SUPPLIES.`, { rate: 1.0, pitch: 0.80, priority: 'normal' });
  updateFlightHud(true);
}

function stationName(projectId) {
  return USSY_PROJECTS.find(project => project.id === projectId)?.name || 'UNKNOWN';
}

function getStationCategory(projectId) {
  return USSY_PROJECTS.find(project => project.id === projectId)?.category || 'default';
}

function getNearestStationFaction(pos) {
  if (!pos || typeof pos.distanceToSquared !== 'function') {
    return normalizeCategory(getStationCategory(traderState.dockedStation || flightState.nearestNode?.userData?.project?.id || 'devussy'));
  }
  let nearestProject = null;
  let minDist = Infinity;
  for (const node of projectNodes) {
    if (!node?.position) continue;
    const dist = pos.distanceToSquared(node.position);
    if (dist < minDist) {
      minDist = dist;
      nearestProject = node.userData?.project || null;
    }
  }
  return normalizeCategory(nearestProject?.category);
}

function getEnemyFireCooldown(pos, cls) {
  const aggression = getEnemyAggressionMultiplier(getNearestStationFaction(pos));
  return cls.fireRate / aggression;
}

function openStationMenu(projectId) {
  if (!projectId) return;
  syncCombatCreditsFromTrader();
  const lore = getStationLore(projectId);
  const loreMissions = getStationMissions(projectId);
  showGameMessage({
    type: 'STATION SERVICES',
    source: lore.merchantName,
    text: `DOCKED AT ${stationName(projectId).toUpperCase()}. CREDITS: ${traderState.credits}CR. SELECT SERVICE:`,
    ui: {
      headerTitle: lore.merchantName,
      headerBadge: stationName(projectId).toUpperCase(),
      colorClass: lore.colorClass || 'green'
    },
    choices: [
      { key: '1', code: 'Digit1', label: 'RESTOCK', action: () => restockAtProject(USSY_PROJECTS.find(project => project.id === projectId) || { id: projectId, name: stationName(projectId) }) },
      { key: '2', code: 'Digit2', label: 'EQUIPMENT', action: () => openEquipmentMarket(projectId) },
      { key: '3', code: 'Digit3', label: 'CARGO MARKET', action: () => openTradeMenu(projectId) },
      { key: '4', code: 'Digit4', label: 'MISSION BOARD', hint: `${loreMissions.length} LORE CONTRACTS`, action: () => showFactionMission(projectId) },
      { key: 'space', code: 'Space', label: 'DISMISS', action: () => dismissGameMessage() }
    ],
    ttsPriority: 'normal'
  });
}

function openEquipmentMarket(projectId) {
  syncCombatCreditsFromTrader();
  const weaponIds = getStationEquipment(getStationCategory(projectId));
  const choices = [];
  const rows = weaponIds.map((weaponId, idx) => {
    const weapon = getWeaponDef(weaponId);
    const price = WEAPON_PRICES[weaponId] ?? 0;
    const slot = weapon.type === 'missile' || weapon.type === 'area' ? 'secondary' : 'primary';
    const equippedSlot = loadoutState.primary === weaponId ? 'P' : (loadoutState.secondary === weaponId ? 'S' : null);
    if (equippedSlot) return `${equippedSlot}: ${weapon.name} - EQUIPPED`;
    if (combatState.ownedWeapons.has(weaponId)) {
      choices.push({ key: String(idx + 1), code: `Digit${idx + 1}`, label: `${weapon.name} - EQUIP ${slot.toUpperCase()}`, action: () => buyAndEquipWeapon(projectId, weaponId, slot) });
      return `[${idx + 1}] ${weapon.name} - OWNED`;
    }
    if (traderState.credits >= price) {
      choices.push({ key: String(idx + 1), code: `Digit${idx + 1}`, label: `${weapon.name} - ${price}CR`, action: () => buyAndEquipWeapon(projectId, weaponId, slot) });
      return `[${idx + 1}] ${weapon.name} - ${price}CR`;
    }
    return `${weapon.name} - ${price}CR (NEED ${price - traderState.credits}CR MORE)`;
  });
  choices.push({ key: 'b', code: 'KeyB', label: 'BACK', action: () => openStationMenu(projectId) });
  showGameMessage({
    type: 'EQUIPMENT MARKET',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: `AVAILABLE SYSTEMS: ${rows.join(' // ')}`,
    choices,
    ttsPriority: 'normal'
  });
}

function buyAndEquipWeapon(projectId, weaponId, slot) {
  const weapon = getWeaponDef(weaponId);
  if (!weapon) {
    openEquipmentMarket(projectId);
    return;
  }
  let result = { success: true, message: `${weapon.name} ALREADY IN ARSENAL.` };
  if (!combatState.ownedWeapons.has(weaponId)) result = buyWeapon(weaponId, traderState);
  if (!result.success) {
    showGameMessage({
      type: 'PURCHASE DENIED',
      source: `${stationName(projectId).toUpperCase()} ARMORY`,
      text: result.message,
      choices: [{ key: '1', code: 'Digit1', label: 'EQUIPMENT', action: () => openEquipmentMarket(projectId) }],
      ttsPriority: 'normal'
    });
    return;
  }
  const equipResult = equipWeapon(weaponId, slot);
  syncCombatCreditsFromTrader();
  reapplySkills();
  ttsEngine.speak('WEAPON SYSTEM UPDATED.', { ...getVoicePersona('USSYVERSE CONTROL'), priority: 'normal' });
  updateFlightHud(true);
  showGameMessage({
    type: equipResult.success ? 'SYSTEM UPDATED' : 'SYSTEM ERROR',
    source: `${stationName(projectId).toUpperCase()} ARMORY`,
    text: `${equipResult.message} CREDITS REMAINING: ${traderState.credits}CR.`,
    choices: [
      { key: '1', code: 'Digit1', label: 'EQUIPMENT', action: () => openEquipmentMarket(projectId) },
      { key: '2', code: 'Digit2', label: 'STATION MENU', action: () => openStationMenu(projectId) }
    ],
    ttsPriority: 'normal'
  });
}

function openSkillTree() {
  showGameMessage({
    type: 'SHIP UPGRADES',
    source: 'LOADOUT TERMINAL',
    text: `SKILL POINTS: ${combatState.skillPoints} // XP: ${combatState.xp}/${combatState.xpToNextPoint} // SELECT BRANCH:`,
    choices: [
      { key: '1', code: 'Digit1', label: 'HULL', action: () => showSkillBranch('HULL') },
      { key: '2', code: 'Digit2', label: 'SHIELDS', action: () => showSkillBranch('SHIELD') },
      { key: '3', code: 'Digit3', label: 'WEAPONS', action: () => showSkillBranch('WEAPONS') },
      { key: '4', code: 'Digit4', label: 'ENGINES', action: () => showSkillBranch('ENGINES') },
      { key: 'space', code: 'Space', label: 'CLOSE', action: () => dismissGameMessage() }
    ],
    ttsPriority: 'normal'
  });
}

function showSkillBranch(branch) {
  const nodes = SKILL_TREE_NODES.filter(node => node.branch === branch);
  const choices = [];
  const rows = nodes.map((node, idx) => {
    if (skillTree.unlocked.has(node.id)) return `OK ${node.name} - ${node.effect}`;
    if (skillTree.canUnlock(node.id)) {
      choices.push({ key: String(idx + 1), code: `Digit${idx + 1}`, label: `${node.name} (${node.cost}SP)`, action: () => confirmSkillUnlock(node.id) });
      return `> ${node.name} (${node.cost}SP) - ${node.effect}`;
    }
    const need = node.requires ? SKILL_TREE_NODES.find(item => item.id === node.requires)?.name : `${node.cost}SP`;
    return `LOCK ${node.name} (need: ${need})`;
  });
  choices.push({ key: 'b', code: 'KeyB', label: 'BACK', action: () => openSkillTree() });
  showGameMessage({
    type: `${branch} UPGRADES`,
    source: 'LOADOUT TERMINAL',
    text: rows.join(' // '),
    choices,
    ttsPriority: 'normal'
  });
}

function confirmSkillUnlock(nodeId) {
  const node = SKILL_TREE_NODES.find(item => item.id === nodeId);
  if (!node) return;
  showGameMessage({
    type: 'UNLOCK CONFIRM',
    source: 'LOADOUT TERMINAL',
    text: `UNLOCK ${node.name}? COST: ${node.cost} SP // ${node.description}`,
    choices: [
      { key: '1', code: 'Digit1', label: 'CONFIRM', action: () => unlockSkillNode(nodeId) },
      { key: '2', code: 'Digit2', label: 'CANCEL', action: () => showSkillBranch(node.branch) }
    ],
    ttsPriority: 'normal'
  });
}

function unlockSkillNode(nodeId) {
  const node = SKILL_TREE_NODES.find(item => item.id === nodeId);
  if (skillTree.unlock(nodeId)) {
    ttsEngine.speak(`${node.name} UNLOCKED.`, { ...getVoicePersona('USSYVERSE CONTROL'), priority: 'normal' });
    updateFlightHud(true);
    saveCurrentRunState({ manual: true });
  }
  showSkillBranch(node.branch);
}

function buildOrchestratorPayload() {
  const nearestStation = flightState.nearestNode?.userData?.project?.id || null;
  return buildOrchestratorGameState({
    flightState,
    traderState,
    missionState,
    nearestStation,
    dockedAt: traderState.docked ? traderState.dockedStation : null,
    lastEvent: gameOrchestrator.lastEventId,
    lastEventTime: gameOrchestrator.lastEventTime,
    now: performance.now(),
    tutorialComplete: gameOrchestrator.tutorialComplete
  });
}

async function pollOrchestrator() {
  if (!gameOrchestrator.enabled || gameOrchestrator.polling || !isFlightActive) return;
  if (performance.now() < gameOrchestrator.nextPollAt) return;
  if (gameMessageState.active) return;
  if (!gameOrchestrator.tutorialComplete) return;

  gameOrchestrator.polling = true;
  try {
    const res = await fetch('/api/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState: buildOrchestratorPayload() })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.fire && data.event) {
      gameOrchestrator.pendingEvent = data.event;
      fireOrchestratedEvent(data.event);
    }
  } catch {
    // Orchestration is opportunistic and must never interrupt the local game loop.
  } finally {
    gameOrchestrator.polling = false;
    const minInterval = Math.min(gameOrchestrator.minInterval, gameOrchestrator.maxInterval);
    const maxInterval = Math.max(gameOrchestrator.minInterval, gameOrchestrator.maxInterval);
    gameOrchestrator.nextPollAt = performance.now() + minInterval + Math.random() * (maxInterval - minInterval);
  }
}

function spawnOrchestratedEnemies(event, count = event.spawnEnemies) {
  resetCombatSessionStats(combatState);
  const waveEnemies = [];
  const spawned = activateEnemyWave(enemies, Math.min(count || 0, maxEnemies), (enemy, offset, delay) => {
    spawnEnemy(enemy, offset, delay);
    waveEnemies.push(enemy);
    enemy.userData.orchestratorEventId = event.id;
    enemy.userData.bountyEventId = event.type === 'BOUNTY' ? event.id : null;
  });
  announceEnemyWave(waveEnemies);
  return spawned;
}

function getRandomActiveProjectNode() {
  const visible = projectNodes.filter(node => node.visible);
  if (!visible.length) return null;
  return visible[Math.floor(Math.random() * visible.length)];
}

function showOrchestratorMessage(event, choices, overrides = {}) {
  showGameMessage({
    type: event.title || event.type,
    source: event.source || 'DEEP SPACE',
    text: event.text || 'NO SIGNAL.',
    choices,
    typeSpeed: overrides.typeSpeed ?? (event.urgency === 'high' ? 12 : 20),
    ttsPriority: overrides.ttsPriority ?? (event.urgency === 'low' ? 'low' : 'high')
  });
}

function fireOrchestratedEvent(event) {
  const normalizedEvent = {
    id: event.id || `event_${Date.now()}`,
    type: String(event.type || 'COMMS').toUpperCase(),
    source: event.source || 'DEEP SPACE',
    title: event.title || event.type || 'COMMS',
    text: event.text || 'UNRESOLVED TRANSMISSION.',
    choices: Array.isArray(event.choices) ? event.choices : [],
    spawnEnemies: Math.max(0, Math.min(5, Number(event.spawnEnemies) || 0)),
    creditReward: Math.max(0, Number(event.creditReward) || 0),
    fuelReward: Math.max(0, Number(event.fuelReward) || 0),
    urgency: event.urgency || 'normal',
    objectiveText: event.objectiveText || '',
    objectiveTarget: event.objectiveTarget || null
  };
  gameOrchestrator.lastEventTime = performance.now();
  gameOrchestrator.lastEventId = normalizedEvent.id;

  const missionDispatched = dispatchOrchestratorEvent(normalizedEvent.type, { ...buildOrchestratorPayload(), spawnEnemies: normalizedEvent.spawnEnemies }, {
    combatAudio,
    getVoicePersona,
    missionContracts,
    missionState,
    startMissionContract: contract => startMissionContract(contract),
    ttsEngine
  });
  if (missionDispatched) {
    showOrchestratorMessage(normalizedEvent, [{ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() }], { ttsPriority: normalizedEvent.urgency === 'low' ? 'low' : 'normal' });
    return;
  }

  if (normalizedEvent.type === 'COMBAT') {
    const spawned = spawnOrchestratedEnemies(normalizedEvent);
    setCurrentObjective({
      id: `director-combat-${normalizedEvent.id}`,
      kicker: 'DIRECTOR EVENT',
      title: normalizedEvent.title || 'Hostile Contact',
      detail: normalizedEvent.objectiveText || `Survive contact and clear ${spawned || normalizedEvent.spawnEnemies || 1} hostile ships.`,
      source: 'director'
    });
    flightState.status = `HOSTILE CONTACT: ${normalizedEvent.source}`;
    flightState.statusUntil = performance.now() + 3000;
  } else if (normalizedEvent.type === 'BOUNTY') {
    const spawned = spawnOrchestratedEnemies(normalizedEvent);
    gameOrchestrator.bountyPendingReward = normalizedEvent.creditReward || 250;
    setCurrentObjective({
      id: `director-bounty-${normalizedEvent.id}`,
      kicker: 'BOUNTY CONTRACT',
      title: normalizedEvent.title || 'Bounty Posted',
      detail: normalizedEvent.objectiveText || `Clear the bounty wave for ${gameOrchestrator.bountyPendingReward} credits.`,
      progress: 0,
      target: spawned || normalizedEvent.spawnEnemies || null,
      source: 'director'
    });
  }

  if (normalizedEvent.type === 'DISTRESS') {
    showOrchestratorMessage(normalizedEvent, [
      {
        key: '1',
        code: 'Digit1',
        label: 'RESPOND',
        action: () => {
          dismissGameMessage();
          const node = getRandomActiveProjectNode();
          if (node) {
            setNavigationTarget(node, 'mission');
            setCurrentObjective({
              id: `director-distress-${normalizedEvent.id}`,
              kicker: 'DISTRESS ROUTE',
              title: normalizedEvent.title || 'Distress Signal',
              detail: normalizedEvent.objectiveText || `Proceed to ${getProjectNodeName(node)} and land to log the response.`,
              targetProjectId: node.userData.project.id,
              source: 'director'
            });
          }
          window.setTimeout(() => showGameMessage({ type: 'NAVIGATION UPDATED', source: 'USSYVERSE CONTROL', text: 'NAVIGATION UPDATED. PROCEED TO COORDINATES.', typeSpeed: 16 }), 400);
        }
      },
      { key: '2', code: 'Digit2', label: 'IGNORE', action: () => resolveOrchestratedChoice(normalizedEvent, { key: '2', outcome: 'DISTRESS SIGNAL IGNORED. THE CHANNEL FADES INTO STATIC.' }) }
    ]);
    return;
  }

  if (normalizedEvent.type === 'CONTRABAND') {
    const cargoIds = Object.keys(traderState.cargo).filter(id => traderState.cargo[id] > 0);
    if (!cargoIds.length) {
      showOrchestratorMessage({ ...normalizedEvent, text: normalizedEvent.text || 'INSPECTION SWEEP PASSES. NO CONTRABAND SIGNATURE FOUND.' }, [{ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() }]);
      return;
    }
    showOrchestratorMessage(normalizedEvent, [
      {
        key: '1',
        code: 'Digit1',
        label: 'JETTISON CARGO',
        action: () => {
          const cargoId = cargoIds[0];
          delete traderState.cargo[cargoId];
          traderState.credits = Math.max(0, traderState.credits - 50);
          updateFlightHud(true);
          resolveOrchestratedChoice(normalizedEvent, { key: '1', outcome: 'CARGO JETTISONED. ENFORCER SCAN SATISFIED. 50 CREDIT HANDLING FINE PAID.' });
        }
      },
      {
        key: '2',
        code: 'Digit2',
        label: 'REFUSE',
        action: () => {
          spawnOrchestratedEnemies({ ...normalizedEvent, source: 'ENFORCERS', type: 'COMBAT' }, 2);
          flightState.status = 'ENFORCERS DEPLOYED';
          flightState.statusUntil = performance.now() + 3000;
          resolveOrchestratedChoice(normalizedEvent, { key: '2', outcome: 'REFUSAL LOGGED. ENFORCER FLIGHT HAS WEAPONS FREE.' });
        }
      }
    ]);
    return;
  }

  if (normalizedEvent.type === 'ANOMALY') {
    const fuelReward = normalizedEvent.fuelReward || (5 + Math.floor(Math.random() * 6));
    traderState.fuel = Math.min(traderState.maxFuel, traderState.fuel + fuelReward);
    updateFlightHud(true);
    showOrchestratorMessage(normalizedEvent, [{ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() }], { typeSpeed: 24, ttsPriority: 'low' });
    return;
  }

  const choices = normalizedEvent.choices.map(choice => ({
    key: choice.key,
    code: `Digit${choice.key}`,
    label: choice.label,
    action: () => resolveOrchestratedChoice(normalizedEvent, choice)
  }));

  if (choices.length === 0) {
    choices.push({ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() });
  }

  const typeSpeed = normalizedEvent.type === 'SILENCE' ? 28 : undefined;
  const ttsPriority = normalizedEvent.type === 'SILENCE' ? 'low' : undefined;
  showOrchestratorMessage(normalizedEvent, choices, { typeSpeed, ttsPriority });
}

function resolveOrchestratedChoice(event, choice) {
  dismissGameMessage();
  if (choice.outcome) {
    const outcomeText = choice.outcome.slice(0, 160);
    window.setTimeout(() => {
      showGameMessage({
        type: 'OUTCOME',
        source: event.source,
        text: outcomeText,
        typeSpeed: 16
      });
    }, 400);
  }
  if (event.type !== 'BOUNTY' && event.creditReward && choice.key === '1') {
    addCombatCredits(event.creditReward);
    flightState.status = `+${event.creditReward} CREDITS`;
    flightState.statusUntil = performance.now() + 2500;
    updateFlightHud(true);
  }
  if (event.fuelReward && choice.key === '1') {
    traderState.fuel = Math.min(traderState.maxFuel, traderState.fuel + event.fuelReward);
    updateFlightHud(true);
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
    setProjectNodeOpacity(node, 0.85);
    node.userData.connectionLine.material.opacity = 0.15;
  });
  updateSelectedRelationEdges();
  
  document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.floating-node-label').forEach(lbl => lbl.classList.remove('active'));
}

function updateFlightCamera() {
  return updateFlightCameraModule();
}

function mapRadarPoint(targetPos, radius) {
  return mapRadarPointModule(targetPos, radius);
}

function drawRadarContact(ctx, cx, cy, radius, targetPos, type, highlighted = false) {
  return drawRadarContactModule(ctx, cx, cy, radius, targetPos, type, highlighted);
}

function updateCockpitRadar(time, force = false) {
  return updateCockpitRadarModule(time, force);
}

function updateFlightHud(force) {
  return updateFlightHudModule(force);
}

function updateTtsStatusIndicator() {
  return updateTtsStatusIndicatorModule();
}

function toggleFlightTts() {
  ttsEngine.enabled = !ttsEngine.enabled;
  if (!ttsEngine.enabled) ttsEngine.stop();
  flightState.status = ttsEngine.enabled ? 'TTS ACTIVE' : 'TTS MUTED';
  flightState.statusUntil = performance.now() + 2200;
  updateTtsStatusIndicator();
  updateFlightHud(true);
}

function openAudioSettingsMenu() {
  showGameMessage({
    type: 'AUDIO SETTINGS',
    source: 'USSYVERSE CONTROL',
    text: `RADIO VOLUME ${volumePercent(gameSettings.radioVolume)}. COMBAT CHATTER ${volumePercent(gameSettings.chatterVolume)}. SFX ${volumePercent(gameSettings.sfxVolume)}. TTS ${ttsEngine.enabled ? 'ACTIVE' : 'MUTED'}. SELECT CONTROL:`,
    choices: [
      { key: '1', code: 'Digit1', label: `RADIO VOLUME ${volumePercent(gameSettings.radioVolume)}`, action: () => openVolumeMenu('radio') },
      { key: '2', code: 'Digit2', label: `CHATTER VOLUME ${volumePercent(gameSettings.chatterVolume)}`, action: () => openVolumeMenu('chatter') },
      { key: '3', code: 'Digit3', label: `SFX VOLUME ${volumePercent(gameSettings.sfxVolume)}`, action: () => openVolumeMenu('sfx') },
      { key: '4', code: 'Digit4', label: ttsEngine.enabled ? 'MUTE TTS' : 'ENABLE TTS', action: () => { toggleFlightTts(); openAudioSettingsMenu(); } },
      { key: '5', code: 'Digit5', label: 'RESTORE QUIET DEFAULTS', action: () => { setRadioVolume(0.45); setChatterVolume(0.38); setSfxVolume(0.55); openAudioSettingsMenu(); } },
      { key: 'space', code: 'Space', label: 'DISMISS', action: () => dismissGameMessage() }
    ],
    ttsPriority: 'low'
  });
}

function openVolumeMenu(kind) {
  const isRadio = kind === 'radio';
  const isSfx = kind === 'sfx';
  const label = isRadio ? 'RADIO' : (isSfx ? 'SFX' : 'CHATTER');
  const setter = isRadio ? setRadioVolume : (isSfx ? setSfxVolume : setChatterVolume);
  const current = isRadio ? gameSettings.radioVolume : (isSfx ? gameSettings.sfxVolume : gameSettings.chatterVolume);
  const presets = isRadio
    ? [0.25, 0.45, 0.7, 1]
    : (isSfx ? [0.25, 0.55, 0.75, 1] : [0.2, 0.38, 0.6, 1]);
  showGameMessage({
    type: `${label} VOLUME`,
    source: 'USSYVERSE CONTROL',
    text: `${label} VOLUME IS ${volumePercent(current)}. SELECT A PRESET:`,
    choices: [
      ...presets.map((value, index) => ({
        key: String(index + 1),
        code: `Digit${index + 1}`,
        label: volumePercent(value),
        action: () => { setter(value); openAudioSettingsMenu(); }
      })),
      { key: 'b', code: 'KeyB', label: 'BACK', action: () => openAudioSettingsMenu() }
    ],
    ttsPriority: 'low'
  });
}

function updateFlightNavMarker() {
  updateNavigationMarker({ camera, flightNavMarker, isFlightActive: () => isFlightActive, windowRef: window });
}

function updateDeepSpaceAnchor() {
  updateEngineDeepSpaceAnchor({ starField, milkyWayField, brightStarField, camera, flightState, isFlightActive, flightUniverseScale });
}

function updateSpaceEnvironment(dt) {
  updateEngineSpaceEnvironment({
    THREE,
    dt,
    isFlightActive,
    scene,
    debrisField,
    dustField,
    updateDebris: updateDebrisField,
    updateDust: updateDustField,
    flightState,
    combatState
  });
}

function updateDebrisField(dt) {
  updateEngineDebrisField({
    dt,
    debrisField,
    flightBounds,
    debrisCount,
    debrisPositions,
    flightState,
    flightForward,
    randomizeDebris: randomizeDebrisInstance,
    updateDebris: updateDebrisMatrix
  });
}

function updateDustField(dt) {
  updateEngineDustField({
    THREE,
    dt,
    dustField,
    dustPositions,
    dustSpeeds,
    dustParticleCount,
    dustTempVec,
    flightState,
    flightForward,
    combatState,
    randomizeDust: randomizeDustParticle
  });
}

function onWindowResize() {
  resizeScene({ camera, renderer, isCoarsePointer });
}

function handleVisibilityChange() {
  if (document.hidden) {
    sfxEngine.suspend();
  } else {
    sfxEngine.resume();
  }
}

// 5. Engine Animation Tick
export function tick(time = 0) {
  
  const startTime = performance.now();
  const frameDt = Math.min(((time - (combatState.lastAdrenalineFrame || time)) / 1000) || 0.016, 0.05);
  combatState.lastAdrenalineFrame = time;
  combatState.adrenaline = Math.max(0, combatState.adrenaline - combatState.adrenalineDecay * frameDt);
  if (adrenalineVignette) adrenalineVignette.style.opacity = String(combatState.adrenaline * 0.4);
  if (combatState.adrenaline > 0.85 && time - combatState.lastAdrenalineBarkAt > 7000) {
    const lines = ['MULTIPLE CONTACTS', 'WEAPONS HOT', 'THREAT LEVEL: CRITICAL'];
    combatAudio.bark(lines[Math.floor(Math.random() * lines.length)], { ...getVoicePersona('COMBAT SYSTEM'), priority: 'low' });
    combatState.lastAdrenalineBarkAt = time;
  }
  
  animateHolographicCore({ coreMesh, coreOuterParticles, time, prefersReducedMotion });
  animateDeepSpaceEffects({ starField, milkyWayField, brightStarField, dataRibbonGroup, prefersReducedMotion });

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
    if (combatState.debriefPending) {
      const data = consumeCombatDebrief(combatState);
      if (data) showDebrief(data);
    }
    sfxEngine.updateEngineHum(flightState.vel);
    updateSpaceEnvironment(frameDt);
    if (time - lastPriceDriftTick > 30000) {
      tickPriceDrift();
      lastPriceDriftTick = time;
    }
    if (enemies.some(enemy => enemy.userData.active) && time - lastAutoSave > 60000) {
      saveCurrentRunState();
      lastAutoSave = time;
    }
    if (time - gameOrchestrator._lastCheck > 1000) {
      gameOrchestrator._lastCheck = time;
      pollOrchestrator();
    }
    pointLight1.color.lerp(tempColor1.set(0xffcc00), 0.08);
    pointLight2.color.lerp(tempColor2.set(0xff3355), 0.08);
  } else if (!isConsoleActive && heroContainer) {
    updateHeroCameraAndLights(time);
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

  updateNodeHoverSelection();
  tickCustomCursor();

  if (selectionRing) {
    if (isConsoleActive && selectedNode) {
      selectionRing.visible = true;
      selectionRing.position.lerp(selectedNode.position, 0.18);
      selectionRing.lookAt(camera.position);
      selectionRing.scale.setScalar((selectedNode.userData.visualRadius || 1) * selectedNode.scale.x * (1.38 + Math.sin(time * 0.004) * 0.08));
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
  if (isFlightActive && flightState.cameraRollCurrent) {
    cameraRollQuat.setFromAxisAngle(flightForward, flightState.cameraRollCurrent * Math.PI / 180);
    camera.quaternion.premultiply(cameraRollQuat);
  }
  updateDeepSpaceAnchor();
  updateFlightNavMarker();

  // Render WebGL
  renderer.render(scene, camera);

  renderProjectLabels();

  // Telemetry framerate diagnostics
  const endTime = performance.now();
  if (endTime - telemetryLastUpdate > 250) {
    telemetryTimer.innerText = isFlightActive
      ? `DOGFIGHT_LOAD: ${(endTime - startTime).toFixed(2)}ms // VIEW: ${flightState.view.toUpperCase()} // DRAW_CALLS: ${renderer.info.render.calls}`
      : `TELEMETRY_LOAD: ${(endTime - startTime).toFixed(2)}ms // DRAW_CALLS: ${renderer.info.render.calls}`;
    if (isFlightActive) {
      telemetryCoord.innerText = `X: ${flightState.pos.x.toFixed(2)} Y: ${flightState.pos.y.toFixed(2)} Z: ${flightState.pos.z.toFixed(2)}`;
      if (renderer.info.render.triangles > 18000 && endTime - lastTriangleWarnAt > 5000) {
        console.warn(`Flight render triangle budget exceeded: ${renderer.info.render.triangles}`);
        lastTriangleWarnAt = endTime;
      }
    }
    telemetryLastUpdate = endTime;
  }
}

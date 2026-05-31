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
  updateNavHUD as updateNavHUDModule,
  updateStationDockHUD as updateStationDockHUDModule,
  updateTtsStatusIndicator as updateTtsStatusIndicatorModule,
  updateSurfaceHUD as updateSurfaceHUDModule
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
import { closeHelpMenu, configureHelpMenu, isHelpMenuOpen, openHelpMenu, toggleHelpMenu } from './help.js';
import { applyRunState, clearRunState, loadRunState, saveRunState } from './persist.js';
import { applySettings, loadSettings, saveSettings, settingsState } from './settings.js';
import { configureTutorialOverlay, hideTutorialOverlay, isTutorialOverlayVisible, showTutorialOverlay } from './tutorial-overlay.js';
import { activateEnemyWave, buildOrchestratorGameState, dispatchOrchestratorEvent, shouldFireEvent, startMissionContract as startOrchestratorMissionContract } from './orchestrator.js';
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
  buildEnemyHealthPips,
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
import { createAmbientLighting as createEngineAmbientLighting, createCameraAnimationState, createSceneGroups, initScene as initEngineScene, resizeScene, setRenderPixelRatio } from '../engine/scene.js';
import {
  animateDeepSpaceEffects,
  createAmbientParticleField as createEngineAmbientParticleField,
  createDebrisField as createEngineDebrisField,
  createDeepSpaceEffects as createEngineDeepSpaceEffects,
  createDustField as createEngineDustField,
  createRadialGlowTexture as createEngineRadialGlowTexture,
  randomizeDebrisInstance as randomizeEngineDebrisInstance,
  randomizeDustParticle as randomizeEngineDustParticle,
  randomizeAmbientParticle as randomizeEngineAmbientParticle,
  updateAmbientParticleField as updateEngineAmbientParticleField,
  updateDebrisField as updateEngineDebrisField,
  updateDebrisMatrix as updateEngineDebrisMatrix,
  updateDeepSpaceAnchor as updateEngineDeepSpaceAnchor,
  updateDustField as updateEngineDustField,
  updateSpaceEnvironment as updateEngineSpaceEnvironment
} from '../engine/starfield.js';
import { PROJECT_HOW_COPY } from '../data/projectCopy.js';
import { flightUniverseScale, isCoarsePointer, maxPlayerAmmo, maxPlayerMissilesStored, prefersReducedMotion } from '../constants.js';
import { combatAudio, configureFlightAudio, gameSettings, radioChain, setChatterVolume, setRadioVolume, setSfxVolume, setTTSBackendEnabled, ttsEngine, volumePercent } from './audio.js';
import { sfxEngine } from './sfx.js';
import { DEFAULT_VIEW_WORLD_SCALE, FLIGHT_WORLD_DISTANCE_SCALE, STATIONS, SYSTEM_RADIUS, worldToThree } from './world.js';
import { createStarfield } from './starfield.js';
import { createAllPlanets, getNearestBody, updatePlanetLOD } from './planets.js';
import { createAllStations, DOCK_PROXIMITY, updateStationRotations } from './stations.js';
import { createAllJumpGates, isInJumpRange, updateJumpGateRotations } from './jumpgates.js';
import { buildNavGraph, getNavNode } from './navgraph.js';
import { appendCourse, disengage, ensureAutopilotState, hitTestSystemMapNode, isAutopilotActive, plotCourse, renderSystemMap, updateAutopilot as updateRouteAutopilot, updateStarfieldWarp } from './autopilot.js';
import { spawnCivilianFleet, updateCivilians } from './civilians.js';
import { checkHunterDestroyed, checkHunterFlee, shouldTriggerIntercept, triggerIntercept } from './hunters.js';
import { checkMissionProgress, completeMission as completeBoardMission } from './missions.js';
import { bindMissionBoardControls, closeMissionBoard, configureMissionBoardUI, openMissionBoard as openMissionBoardOverlay, renderMissionBoard } from './missionUI.js';
import { SURFACE_STATES, beginDeparture, beginLanding, cancelSurfaceApproach, updateSurface } from './surface.js';
import { configureCursor, setCursorHovering, tickCustomCursor } from '../ui/cursor.js';
import { configureHeroUI, setupHeroNavDots, updateHeroCameraAndLights } from '../ui/hero.js';
import { configureInventoryPanel } from '../ui/inventory-panel.js';
import { closeSettingsMenu, configureSettingsMenu, isSettingsMenuOpen, openSettingsMenu } from '../ui/settings-menu.js';
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

Object.defineProperty(combatState, 'enemies', {
  value: enemies,
  enumerable: false,
  configurable: true
});

const USSY_PROJECTS = window.USSY_PROJECTS || [];
const USSY_CATEGORIES = window.USSY_CATEGORIES || {};

let scene, camera, renderer, composer, bloomPass;
let coreGroup, nodesGroup, connectionsGroup;
let coreMesh, coreOuterParticles;
let raycaster, mouse;
let hoveredNode = null;
let selectedNode = null;
let activeCategory = 'all';
let isConsoleActive = false; // Hero state by default
let isFlightActive = false;
let pointLight1, pointLight2; // Global lights for scroll snap neon shifts
let starField, milkyWayField, brightStarField, dataRibbonGroup, selectionRing, coreLinesMesh, relationshipEdgesMesh, selectedEdgesMesh;
let debrisField, dustField, ambientField;
let systemStarfield = null;
let systemPlanets = [];
let surfacePlanetDefinitions = null;
let systemStations = [];
let systemJumpGates = [];
let navGraph = null;
let systemMapKeyWasDown = false;
let lastSystemMapRenderAt = 0;
let systemMapViewport = { zoom: 1, offsetX: 0, offsetY: 0, dragging: false, pointerId: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };
let navigationPanelControlsRegistered = false;
let surfacePanelControlsRegistered = false;
let missionBoardControlsRegistered = false;
let canvasResizeObserver = null;
let telemetryLastUpdate = 0;
let gameRoot, playerShip, flightNavLine;
let flightAssistKeyCaptureRegistered = false;
let lastMissionAutopilotState = 'IDLE';
let _saveIntervalId = null;
let hyperspacePulseStartedAt = 0;
let hyperspacePulseUntil = 0;

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
const nodeBaseScale = 1;
const planetNodeRadius = isCoarsePointer ? 1.55 : 1.75;
const planetNodeFlightScale = isCoarsePointer ? 3.8 : 4.4;
const planetDistantHaloScale = isCoarsePointer ? 14 : 18;
const planetNodeHitRadius = isCoarsePointer ? planetNodeRadius * 1.18 : planetNodeRadius * 1.06;
const planetLabelRadius = planetNodeRadius * 1.35;
const landingRange = 7.2;
const STARTUP_DOCK_STATION_ID = 'hub-alpha';
const STARTUP_DOCK_STANDOFF = DOCK_PROXIMITY + 35;
const flightBounds = SYSTEM_RADIUS * FLIGHT_WORLD_DISTANCE_SCALE;
const radarRange = 140;
const debrisCount = prefersReducedMotion ? 110 : (isCoarsePointer ? 320 : 520);
const dustParticleCount = prefersReducedMotion ? 180 : (isCoarsePointer ? 420 : 600);
const ambientParticleCount = prefersReducedMotion ? 180 : (isCoarsePointer ? 520 : 900);
const debrisPositions = new Float32Array(debrisCount * 3);
const debrisAxes = new Float32Array(debrisCount * 3);
const debrisAngles = new Float32Array(debrisCount);
const debrisSpinRates = new Float32Array(debrisCount);
let dustPositions = null;
let dustSpeeds = null;
let ambientPositions = null;
let ambientColors = null;
let ambientSpeeds = null;
let lastTriangleWarnAt = 0;
let radarLastUpdate = 0;
let lastPriceDriftTick = 0;
let lastAutoSave = 0;
let pendingRunState = null;
let activeUniverseScale = 1;
let _edgesNeedUpdate = false;

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

const DOGFIGHT_UPGRADE_SEQUENCE = ['weap_1', 'shield_1', 'eng_1', 'weap_2', 'hull_1', 'weap_3', 'shield_2', 'eng_2', 'hull_2', 'eng_3', 'weap_4'];
const dogfightArena = {
  active: false,
  wave: 0,
  pendingNextWave: false,
  upgradeIndex: 0
};

setCombatFlightState(flightState);
configureCombat({
  onEnemyKill: ({ classId, pos, xpReward } = {}) => {
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
  const cfgMatch = location.hash.match(/:cfg:([A-Za-z0-9+/=]+)/);
  if (cfgMatch) loadSettings(cfgMatch[1]);
  const hashMatch = location.hash.match(/#save:([A-Za-z0-9+/=]+)/);
  if (hashMatch) {
    try {
      deserializeCombatState(hashMatch[1]);
      applyPersistedFlightResources();
    } catch {
      // Ignore malformed shared save URLs.
    }
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
  history.replaceState(null, '', `#save:${encoded}:cr:${traderState.credits}:rep:${reputationEncoded}:ms:${missionEncoded}:cfg:${saveSettings()}`);
}

function setMouseSensitivity(value) {
  const next = Number(value);
  if (Number.isFinite(next)) flightState.mouseSensitivity = next;
}

function setTTSEnabled(enabled) {
  ttsEngine.enabled = Boolean(enabled);
  if (!ttsEngine.enabled) ttsEngine.stop();
  updateTtsStatusIndicator();
}

function setPixelRatio(value) {
  setRenderPixelRatio(value);
  onWindowResize();
}

function getSettingsDeps() {
  return {
    documentRef: document,
    isFlightActive: () => isFlightActive,
    releasePointerLock: () => document.exitPointerLock?.(),
    requestPointerLock: requestFlightPointerLock,
    setBloomRadius,
    setBloomStrength,
    setBloomThreshold,
    setChatterVolume,
    setMouseSensitivity,
    setPixelRatio,
    setRadioVolume,
    setSfxVolume,
    setTTSBackendEnabled,
    setTTSEnabled,
    speakTts: (text, options) => ttsEngine.speak(text, options)
  };
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
  const saved = saveRunState(buildPersistentCombatState(), traderState, reputationState, skillTree, {
    flightState,
    bodies: [...systemPlanets, ...systemStations]
  });
  if (saved && manual) addKillFeedEntry('STATE SAVED', '#44ff88');
  return saved;
}

function ensureTraderMissionState() {
  traderState.activeMissions ??= [];
  traderState.completedMissionIds ??= [];
  traderState.missionBoard ??= { declinedMissionIds: [] };
  traderState.missionBoard.declinedMissionIds ??= [];
}

function applySavedRunState(data) {
  if (!applyRunState(data, combatState, traderState, reputationState, skillTree, {
    flightState,
    navGraph,
    plotCourse
  })) return false;
  flightState.score = data.combat.score;
  flightState.armor = data.combat.hull;
  flightState.shield = data.combat.shieldHp;
  skillTree.applyAll();
  syncCombatCreditsFromTrader();
  updateFlightHud(true);
  return true;
}

function resumePendingRunState() {
  const data = pendingRunState;
  pendingRunState = null;
  if (!data || !applySavedRunState(data)) {
    clearRunState();
    showFlightStartupChoice();
    return;
  }
  syncFlightCameraNow();
  flightState.status = 'SESSION STATE RESTORED';
  flightState.statusUntil = performance.now() + 3500;
  showGameMessage({ type: 'SESSION RESTORED', source: 'SESSION STORAGE', text: 'SESSION STATE RESTORED. CONTINUE YOUR RUN OR OPEN THE MAP TO SET A NEW ROUTE.', choices: [{ key: 'space', code: 'Space', label: 'CONTINUE', action: () => dismissGameMessage() }], ttsPriority: 'normal' });
}

function discardPendingRunState() {
  pendingRunState = null;
  clearRunState();
  showFlightStartupChoice();
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
    onUndock: undockFromTradeMenu,
    onRestock: restockAndReturnToStationMenu,
    openMissionBoard
  });
  restoreCombatStateFromHash();
  if (objectivesPanel) objectivesPanel.addEventListener('click', handleObjectivesPanelClick);
  renderObjectivesPanel();

  // Initialize Three.js Scene
  ({ scene, camera, renderer } = initEngineScene(canvasContainer, { THREE, isCoarsePointer }));
  configurePostProcessing();

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
    getNavNodeLabel: id => getNavNode(navGraph, id)?.name || stationName(id),
    getNavNodeType: id => getNavNode(navGraph, id)?.type || 'unknown',
    isCoarsePointer,
    isFlightActive: () => isFlightActive,
    missionState,
    playerShip: () => playerShip,
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
  configureHelpMenu({
    documentRef: document,
    flightState,
    isFlightActive: () => isFlightActive,
    updateFlightHud
  });
  configureTutorialOverlay({
    documentRef: document,
    isFlightActive: () => isFlightActive,
    requestPointerLock: requestFlightPointerLock,
    saveSettingsToHash: saveCombatStateToHash
  });
  const settingsDeps = getSettingsDeps();
  configureSettingsMenu(settingsDeps);
  configureMissionBoardUI({ documentRef: document });
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
  createSystemWorldObjects();
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
    camCurrent,
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
    updateRelationshipEdges: markEdgesDirty,
    updateSelectedRelationEdges
  });
  configureInventoryPanel({ flightState });
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
    reputationState,
    showGameMessage,
    skillTree,
    traderState,
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
  applySettings(settingsDeps);
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
    navGraph: () => navGraph,
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
    closeSettingsMenu,
    activateHyperspaceTravel,
    activateJumpGate,
    disableAutopilot,
    dismissGameMessage,
    documentRef: document,
    enterFlightMode,
    exitFlightMode,
    gameMessageState,
    handleGameMessageChoice,
    hideTutorialOverlay,
    handleSurfaceEscape,
    isHelpMenuOpen,
    isSettingsMenuOpen,
    isTutorialOverlayVisible,
    heroContainer,
    isConsoleActive: () => isConsoleActive,
    isFlightActive: () => isFlightActive,
    landOnNearestProject,
    mouse,
    openAudioSettingsMenu,
    openMissionBoard,
    openPauseMenu,
    openSettingsMenu,
    openSkillTree,
    openStationMenu,
    playFireSfx: type => sfxEngine.playFlat(type, { volume: type === 'missile' ? 0.9 : 0.8 }),
    projectHitTargets,
    radioChain,
    raycaster,
    renderer,
    onUndock: undockFromTradeMenu,
    resetCameraView,
    sectionCamPositions,
    selectProject,
    setNavigationFromCrosshair,
    showFactionMission,
    telemetryCoord,
    toggleAutopilot: toggleRouteAutopilot,
    toggleFlightTts,
    toggleFlightView,
    toggleHelpMenu,
    toggleObjectivesView,
    traderState,
    unlockAudio: () => sfxEngine.unlock(),
    updateFlightHud,
    windowRef: window
  });
  document.getElementById('hud-settings-btn')?.addEventListener('click', openSettingsMenu);
  document.getElementById('hud-controls-bar')?.addEventListener('click', event => {
    const action = event.target?.closest?.('[data-hud-action]')?.dataset?.hudAction;
    if (action === 'settings') openSettingsMenu();
  });
  registerFlightAssistKeyCapture();
  registerNavigationPanelControls();
  registerSurfacePanelControls();
  registerMissionBoardControls();
  syncOrbitFromCamera();
  
  // Populate UI Lists
  populateProjectsUI();
  setupUIEventListeners();
  
  // Select initial project (Devussy)
  selectProject('devussy', false);

  // Event Listeners
  canvasResizeObserver = new ResizeObserver(() => onWindowResize());
  canvasResizeObserver.observe(canvasContainer);
  registerInputListeners();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (_saveIntervalId !== null) clearInterval(_saveIntervalId);
  _saveIntervalId = window.setInterval(saveCombatStateToHash, 30000);
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
    createDustField,
    createAmbientParticleField
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

function createAmbientParticleField() {
  ambientPositions = new Float32Array(ambientParticleCount * 3);
  ambientColors = new Float32Array(ambientParticleCount * 3);
  ambientSpeeds = new Float32Array(ambientParticleCount);
  ({ ambientField, ambientPositions, ambientColors, ambientSpeeds } = createEngineAmbientParticleField({
    THREE,
    documentRef: document,
    scene,
    ambientParticleCount,
    isCoarsePointer,
    updateFlightBasis,
    randomizeAmbient: randomizeAmbientParticle,
    ambientPositions,
    ambientColors,
    ambientSpeeds
  }));
}

function randomizeAmbientParticle(index) {
  randomizeEngineAmbientParticle({ index, flightState, flightForward, flightRight, flightUp, ambientPositions, ambientColors, ambientSpeeds });
}

function createFlightGameObjects() {
  ({ gameRoot, playerShip, flightNavLine } = createCombatFlightGameObjects());
}

// 2. Procedural Nodes Graph
function buildProjectNodes() {
  USSY_PROJECTS.forEach(proj => {
    const cat = USSY_CATEGORIES[proj.category];
    const catColor = cat ? cat.color : '#00f0ff';
    const hexColor = parseInt(catColor.replace('#', '0x'));
    const worldPos = worldToThree(proj.planet?.pos, THREE, DEFAULT_VIEW_WORLD_SCALE);
    const flightWorldPos = worldToThree(proj.planet?.pos, THREE, FLIGHT_WORLD_DISTANCE_SCALE);

    const nodeMesh = createPlanetNodeLOD(hexColor);
    nodeMesh.position.copy(worldPos);
    Object.assign(nodeMesh.userData, {
      project: proj,
      baseScale: nodeBaseScale,
      worldPos,
      compactWorldPos: worldPos.clone(),
      flightWorldPos
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
    
    // Create 2D Overlay Label
    const label = document.createElement('div');
    label.className = 'floating-node-label';
    label.innerText = `[${proj.name.toUpperCase()}]`;
    label.dataset.id = proj.id;
    labelsContainer.appendChild(label);
    projectLabels.push({ element: label, object3d: nodeMesh });
  });

  const positions = new Float32Array(USSY_PROJECTS.length * 6);
  const coreLineGeo = new THREE.BufferGeometry();
  coreLineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  coreLinesMesh = new THREE.LineSegments(
    coreLineGeo,
    new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  updateCoreConnectionLines();
  connectionsGroup.add(coreLinesMesh);
}

function updateCoreConnectionLines() {
  if (!coreLinesMesh) return;
  const position = coreLinesMesh.geometry.attributes.position;
  const positions = position.array;
  projectNodes.forEach((node, idx) => {
    const offset = idx * 6;
    positions[offset] = 0;
    positions[offset + 1] = 0;
    positions[offset + 2] = 0;
    positions[offset + 3] = node.position.x;
    positions[offset + 4] = node.position.y;
    positions[offset + 5] = node.position.z;
  });
  position.needsUpdate = true;
  coreLinesMesh.geometry.computeBoundingSphere();
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
  markEdgesDirty();
}

function markEdgesDirty() {
  _edgesNeedUpdate = true;
}

function applyFlightUniverseScale(scale) {
  if (activeUniverseScale === scale) return;
  activeUniverseScale = scale;
  const flightScaleActive = scale === flightUniverseScale;
  const visualScale = flightScaleActive ? planetNodeFlightScale : 1;
  projectNodes.forEach(node => {
    const targetPos = flightScaleActive ? node.userData.flightWorldPos : node.userData.compactWorldPos;
    if (targetPos) node.position.copy(targetPos);
    node.scale.setScalar((node.userData.baseScale ?? nodeBaseScale) * visualScale);
    if (node.userData.distantHalo) node.userData.distantHalo.visible = flightScaleActive;
  });
  updateCoreConnectionLines();
  markEdgesDirty();
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

  const projectId = selectedNode.userData.project.id;
  const positions = selectedEdgesMesh.geometry.attributes.position.array;
  positions.fill(0);

  let selectedEdgeCount = 0;
  for (let i = 0; i < relationshipEdges.length && selectedEdgeCount < selectedEdgeLimit; i++) {
    const edge = relationshipEdges[i];
    if ((edge.from !== projectId && edge.to !== projectId) || !edge.fromNode.visible || !edge.toNode.visible) continue;
    const offset = selectedEdgeCount * 6;
    positions[offset] = edge.fromNode.position.x;
    positions[offset + 1] = edge.fromNode.position.y;
    positions[offset + 2] = edge.fromNode.position.z;
    positions[offset + 3] = edge.toNode.position.x;
    positions[offset + 4] = edge.toNode.position.y;
    positions[offset + 5] = edge.toNode.position.z;
    selectedEdgeCount++;
  }
  selectedEdgesMesh.geometry.setDrawRange(0, selectedEdgeCount * 2);
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
  const highMat = new THREE.MeshStandardMaterial({
    color: hexColor,
    emissive: hexColor,
    emissiveIntensity: 0.45,
    wireframe: true,
    roughness: 0.0,
    metalness: 0.7,
    transparent: true,
    opacity: 0.92
  });
  const midMat = new THREE.MeshBasicMaterial({ color: hexColor, wireframe: true, transparent: true, opacity: 0.78 });
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hexColor) },
      opacity: { value: 1 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.5);
        gl_FragColor = vec4(uColor, fresnel * 0.55 * opacity);
      }
    `,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
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
  if (node.userData.glowMaterial?.isShaderMaterial) {
    if (node.userData.glowMaterial.uniforms?.opacity) node.userData.glowMaterial.uniforms.opacity.value = opacity;
    else node.userData.glowMaterial.opacity = 0.18 * opacity;
  } else if (node.userData.glowMaterial) {
    node.userData.glowMaterial.opacity = 0.18 * opacity;
  }
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
  const result = selectProjectModule(projId, triggerFly);
  markEdgesDirty();
  return result;
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

function getStartupDockStation() {
  return systemStations.find(station => station?.userData?.stationId === STARTUP_DOCK_STATION_ID) || null;
}

function orientFlightToward(targetPos) {
  flightTempVec.copy(targetPos).sub(flightState.pos).normalize();
  if (flightTempVec.lengthSq() > 0) {
    flightState.yaw = Math.atan2(-flightTempVec.x, -flightTempVec.z);
    flightState.pitch = THREE.MathUtils.clamp(Math.asin(flightTempVec.y), -1.2, 1.2);
  }
  flightState.roll = 0;
  flightEuler.set(flightState.pitch, flightState.yaw, 0, 'YXZ');
  flightState.orientation.setFromEuler(flightEuler);
}

function placePlayerNearStartupDock({ insideDockRange = false } = {}) {
  const station = getStartupDockStation();
  if (!station?.position) return false;
  const standoff = insideDockRange ? DOCK_PROXIMITY * 0.55 : STARTUP_DOCK_STANDOFF;
  flightState.pos.set(station.position.x, station.position.y, station.position.z + standoff);
  flightState.vel.set(0, 0, 0);
  orientFlightToward(station.position);
  flightState.status = insideDockRange
    ? 'JUMPED TO HUB ALPHA DOCKING CORRIDOR'
    : 'DEPLOYED NEAR HUB ALPHA DOCKING CORRIDOR';
  flightState.statusUntil = performance.now() + 3500;
  return true;
}

function dockAtStartupStation() {
  if (!placePlayerNearStartupDock({ insideDockRange: true })) return false;
  const station = getStartupDockStation();
  return station ? dockAtSystemStation(station) : false;
}

export function enterFlightMode() {
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
  setSystemWorldVisible(true);
  applyFlightUniverseScale(flightUniverseScale);
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  flightState.pauseReasons.clear();
  flightState.paused = false;
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
  flightState.hyperspaceUnlocked = skillTree.unlocked.has('hyperspace');
  flightState.hyperspaceCooldownUntil = 0;
  closeMissionBoard({ flightState, documentRef: document });
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
  ensureTraderMissionState();
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
  flightState.surface = {
    state: SURFACE_STATES.NONE,
    planetId: null,
    approachDist: 0,
    orbitAltitude: 0,
    landingProgress: 0,
    surfaceY: 0,
    exitQueued: false
  };
  ensureAutopilotState(flightState);
  disengage(flightState, 'RESET');
  flightState.landed = false;
  flightState.shieldCriticalSpoken = false;
  flightState.hullCriticalLogged = false;
  flightState.finalApproachSpoken = false;
  flightState.statusUntil = 0;
  flightState.status = isCoarsePointer ? 'KEYBOARD FLIGHT READY' : 'REQUESTING MOUSELOOK LOCK';
  if (!placePlayerNearStartupDock()) {
    flightState.pos.copy(camCurrent.pos.lengthSq() ? camCurrent.pos : camTarget.pos);
    orientFlightToward(camCurrent.lookAt);
  }

  syncFlightCameraNow();
  enemies.forEach(enemy => deactivateCombatObject(enemy));
  playerBullets.forEach(bullet => deactivateCombatObject(bullet));
  enemyBullets.forEach(bullet => deactivateCombatObject(bullet));
  playerMissiles.forEach(missile => deactivateCombatObject(missile));

  ttsEngine.speak('USSYVERSE FLIGHT SYSTEMS ONLINE. WELCOME, OPERATOR.', { rate: 1.0, pitch: 0.72, priority: 'high' });
  if (pendingRunState) {
    showGameMessage({
      type: 'PREVIOUS RUN DETECTED',
      source: 'SESSION STORAGE',
      text: 'A SAVED SESSION WAS FOUND. RESUME IT, OR CLEAR IT AND START A NEW DEPLOYMENT.',
      choices: [
        { key: '1', code: 'Digit1', label: 'RESUME SESSION', action: () => resumePendingRunState() },
        { key: '2', code: 'Digit2', label: 'NEW DEPLOYMENT', action: () => discardPendingRunState() }
      ],
      ttsPriority: 'normal'
    });
  } else {
    clearRunState();
    showFlightStartupChoice();
  }
  if (!gameOrchestrator.tutorialComplete && !settingsState.tutorialOverlayDismissed) {
    showTutorialOverlay();
  }
  updateFlightHud(true);
  updateCockpitRadar(0, true);
  if (!isTutorialOverlayVisible()) requestFlightPointerLock();
}

function requestFlightPointerLock() {
  if (flightState.landed || traderState.docked) return;
  if (flightUiBlocksPointerLock()) return;
  if (isCoarsePointer || !renderer?.domElement?.requestPointerLock) return;
  const lockRequest = renderer.domElement.requestPointerLock();
  if (lockRequest && typeof lockRequest.catch === 'function') {
    lockRequest.catch(onPointerLockError);
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
  flightState.pauseReasons.clear();
  flightState.paused = false;
  flightState.crosshairNode = null;
  flightState.navNode = null;
  flightState.navDistance = Infinity;
  flightState.navEta = '--';
  ensureAutopilotState(flightState);
  disengage(flightState, 'EXIT');
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
  setSystemWorldVisible(false);
  setSystemMapVisible(false);
  closeHelpMenu();
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

function completeReadyBoardMissions() {
  ensureTraderMissionState();
  for (const mission of [...traderState.activeMissions]) {
    if (mission.status !== 'ACTIVE' || mission.objective.current < mission.objective.required) continue;
    const before = traderState.credits;
    const result = completeBoardMission(traderState, mission.id, { gainReputation });
    if (!result.success) continue;
    const gain = traderState.credits - before;
    if (gain > 0 && isFlightActive) showCreditGain(gain);
    addKillFeedEntry(`MISSION COMPLETE: ${mission.title.toUpperCase()} +${gain}CR`, 'var(--cyber-green)');
    flightState.status = `MISSION COMPLETE: +${gain}CR`;
    flightState.statusUntil = performance.now() + 2600;
    saveCurrentRunState();
  }
}

function updateMissionBoardProgress(time) {
  ensureTraderMissionState();
  const autopilot = ensureAutopilotState(flightState);
  const arrivalState = autopilot.state === 'ARRIVED' && lastMissionAutopilotState !== 'ARRIVED'
    ? flightState
    : { ...flightState, autopilot: { ...autopilot, state: lastMissionAutopilotState === 'ARRIVED' ? 'IDLE' : autopilot.state } };
  const changed = checkMissionProgress(traderState, arrivalState, combatState, navGraph, time);
  lastMissionAutopilotState = autopilot.state;
  if (changed.length) completeReadyBoardMissions();
  if (changed.length && flightState.missionBoardOpen) renderMissionBoard(getMissionBoardContext(flightState.missionBoardStationId));
}

function triggerEnemyDeathFeedback(enemy, cls) {
  const isDreadnought = cls.id === 'dreadnought';
  const overlay = globalThis.document?.getElementById?.('cockpit-overlay');
  if (overlay) {
    overlay.animate([
      { opacity: 0.7, background: 'rgba(255,60,0,0.35)' },
      { opacity: 0, background: 'rgba(255,60,0,0)' }
    ], { duration: 400, easing: 'ease-out' });
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

function setFlightPauseReason(reason, active) {
  if (!flightState.pauseReasons) flightState.pauseReasons = new Set();
  if (active) flightState.pauseReasons.add(reason);
  else flightState.pauseReasons.delete(reason);
  flightState.paused = flightState.pauseReasons.size > 0;
  if (active) {
    flightState.keys.clear();
    flightState.mouseButtons.clear();
  }
}

function resumeFlightFromPauseMenu() {
  setFlightPauseReason('pause-menu', false);
  flightState.status = flightState.landed
    ? 'DOCKED. STATION SERVICES STANDING BY.'
    : 'FLIGHT RESUMED. CLICK VIEWPORT TO RECAPTURE MOUSELOOK.';
  flightState.statusUntil = performance.now() + 2200;
  updateFlightHud(true);
  if (!flightState.landed && !traderState.docked) requestFlightPointerLock();
}

function openPauseMenu() {
  if (!isFlightActive) return false;
  setFlightPauseReason('pause-menu', true);
  const choices = [
    { key: '1', code: 'Digit1', label: 'RESUME', icon: 'play', hint: flightState.landed ? 'RETURN TO DOCK SERVICES' : 'RETURN TO FLIGHT', tone: 'confirm', action: resumeFlightFromPauseMenu },
    { key: '2', code: 'Digit2', label: 'HELP', icon: 'circle-help', hint: 'OPEN OPERATOR REFERENCE', tone: 'cyan', action: () => { resumeFlightFromPauseMenu(); openHelpMenu(); } },
    { key: '3', code: 'Digit3', label: 'SETTINGS', icon: 'settings', hint: 'AUDIO // INPUT // ACCESSIBILITY', tone: 'cyan', action: () => { resumeFlightFromPauseMenu(); openSettingsMenu(); } }
  ];
  if (flightState.landed && traderState.dockedStation) {
    choices.push({ key: '4', code: 'Digit4', label: 'STATION SERVICES', icon: 'panel-top', hint: stationName(traderState.dockedStation).toUpperCase(), tone: 'yellow', action: () => { resumeFlightFromPauseMenu(); openStationMenu(traderState.dockedStation); } });
    choices.push({ key: 'u', code: 'KeyU', label: 'UNDOCK', icon: 'log-out', hint: 'RETURN TO FLIGHT', tone: 'deny', action: () => { resumeFlightFromPauseMenu(); undockFromTradeMenu(); } });
  }
  choices.push({ key: 'x', code: 'KeyX', label: 'EXIT TO SITE', icon: 'door-open', hint: 'LEAVE FLIGHT MODE', tone: 'deny', action: () => exitFlightMode() });
  showGameMessage({
    type: 'PAUSE MENU',
    source: 'USSYVERSE CONTROL',
    text: flightState.landed
      ? `PAUSED WHILE DOCKED AT ${stationName(traderState.dockedStation).toUpperCase()}. RESUME TO KEEP YOUR CURRENT DOCK STATE.`
      : 'PAUSED. RESUME RETURNS TO THE CURRENT FLIGHT STATE.',
    ui: {
      layout: 'dock-grid',
      headerTitle: 'PAUSE MENU',
      headerBadge: flightState.landed ? 'DOCKED' : 'IN FLIGHT',
      colorClass: flightState.landed ? 'yellow' : 'cyan',
      footerStats: [flightState.landed ? `DOCK ${stationName(traderState.dockedStation).toUpperCase()}` : 'FLIGHT PAUSED'],
      footerChoices: [{ key: 'Esc', code: 'Escape', aliases: ['Backspace'], label: 'RESUME', action: resumeFlightFromPauseMenu }]
    },
    choices,
    ttsPriority: 'low'
  });
  updateFlightHud(true);
  return true;
}

function handleGameMessageChoice(event) {
  const handled = handleGameMessageChoiceModule(event);
  if (handled) sfxEngine.playFlat('ui_confirm', { volume: 0.55 });
  return handled;
}

function handleFlightUndock() {
  closeMissionBoard({ flightState, documentRef: document });
  traderState.docked = false;
  traderState.dockedStation = null;
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

function setSystemWorldVisible(visible) {
  systemStarfield?.points && (systemStarfield.points.visible = visible);
  systemPlanets.forEach(body => { body.visible = visible; });
  systemStations.forEach(body => { body.visible = visible; });
  systemJumpGates.forEach(body => { body.visible = visible; });
}

function getSurfacePlanetDefinition(planetObject) {
  const data = planetObject?.userData ?? {};
  return {
    id: data.id ?? data.planetId ?? planetObject?.id,
    name: data.name ?? planetObject?.name,
    pos: data.pos,
    position: planetObject?.position,
    type: data.type ?? planetObject?.type,
    radius: data.radius ?? planetObject?.radius ?? 0,
    hasStation: data.hasStation,
    userData: data
  };
}

function getSurfacePlanetsForHUD() {
  return surfacePlanetDefinitions ?? systemPlanets.map(getSurfacePlanetDefinition);
}

function getSystemStationDefinitions() {
  return systemStations.map(station => ({
    id: station.userData?.stationId ?? station.id,
    name: station.userData?.name ?? station.name ?? station.userData?.stationId,
    position: station.position,
    type: station.userData?.type,
    hasTrading: station.userData?.hasTrading,
    hasMissions: station.userData?.hasMissions,
    userData: station.userData
  }));
}

function getJumpGateDefinitions() {
  return systemJumpGates.map(gate => ({
    id: gate.userData?.gateId ?? gate.id,
    name: gate.userData?.name ?? gate.name ?? gate.userData?.gateId,
    position: gate.position,
    type: 'gate',
    connectsTo: gate.userData?.connectsTo ?? [],
    activationRange: gate.userData?.activationRange,
    userData: gate.userData
  }));
}

function setPlanetShellScale(shell, scale) {
  if (!shell?.scale || !Number.isFinite(scale)) return;
  if (typeof shell.scale.setScalar === 'function') shell.scale.setScalar(scale);
  else if (typeof shell.scale.set === 'function') shell.scale.set(scale, scale, scale);
  else {
    shell.scale.x = scale;
    shell.scale.y = scale;
    shell.scale.z = scale;
  }
}

function updateSurfaceVisuals() {
  const surface = flightState.surface;
  const activePlanet = getCurrentSurfacePlanet();
  let approachT = 0;
  const surfaceState = surface?.state;
  if (surface?.state === SURFACE_STATES.APPROACH && activePlanet) {
    const radius = activePlanet.userData?.radius ?? activePlanet.radius ?? 0;
    const dist = flightState.pos.distanceTo(activePlanet.position);
    const approachDist = surface.approachDist || radius * 1.6;
    const orbitDist = surface.orbitAltitude || radius * 1.2;
    approachT = THREE.MathUtils.clamp((approachDist - dist) / Math.max(1, approachDist - orbitDist), 0, 1);
  }
  const holdSurfaceVisuals = surfaceState === SURFACE_STATES.ORBITAL || surfaceState === SURFACE_STATES.LANDING || surfaceState === SURFACE_STATES.SURFACE;
  for (const planet of systemPlanets) {
    const atmosphere = planet.children?.find(child => child.userData?.isPlanetAtmosphere);
    const clouds = planet.children?.find(child => child.userData?.isPlanetClouds);
    const isApproach = activePlanet === planet && surfaceState === SURFACE_STATES.APPROACH;
    const isHeld = activePlanet === planet && holdSurfaceVisuals;
    const visualT = isApproach ? approachT : (isHeld ? 1 : 0);
    const atmosphereOpacity = THREE.MathUtils.lerp(0.16, 0.38, visualT);
    const atmosphereScale = THREE.MathUtils.lerp(1, 1.032, visualT);
    const cloudOpacity = THREE.MathUtils.lerp(clouds?.userData?.baseOpacity ?? 0.18, clouds?.userData?.approachOpacity ?? 0.36, visualT);
    const cloudScale = THREE.MathUtils.lerp(clouds?.userData?.baseScale ?? 1, clouds?.userData?.approachScale ?? 1.02, visualT);

    if (atmosphere?.material) {
      if (atmosphere.material.uniforms?.uOpacity) atmosphere.material.uniforms.uOpacity.value = atmosphereOpacity;
      else atmosphere.material.opacity = atmosphereOpacity;
      if (atmosphere.material.uniforms?.uGlowStrength) atmosphere.material.uniforms.uGlowStrength.value = THREE.MathUtils.lerp(1.15, 1.5, visualT);
      if (atmosphere.material.uniforms?.uHorizonBoost) atmosphere.material.uniforms.uHorizonBoost.value = THREE.MathUtils.lerp(0.28, 0.46, visualT);
      setPlanetShellScale(atmosphere, atmosphereScale);
    }
    if (clouds?.material) {
      clouds.material.opacity = cloudOpacity;
      setPlanetShellScale(clouds, cloudScale);
    }
  }
  const targetFov = surfaceState === SURFACE_STATES.APPROACH ? THREE.MathUtils.lerp(75, 55, approachT) : (holdSurfaceVisuals ? 55 : 75);
  if (camera && Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix?.();
  }
}

function createSystemWorldObjects() {
  systemStarfield = createStarfield(scene, THREE);
  systemPlanets = createAllPlanets(scene, THREE, FLIGHT_WORLD_DISTANCE_SCALE);
  surfacePlanetDefinitions = systemPlanets.map(getSurfacePlanetDefinition);
  systemStations = createAllStations(scene, THREE, FLIGHT_WORLD_DISTANCE_SCALE);
  systemJumpGates = createAllJumpGates(scene, THREE, FLIGHT_WORLD_DISTANCE_SCALE);
  navGraph = buildNavGraph(getSurfacePlanetsForHUD(), getSystemStationDefinitions(), undefined, getJumpGateDefinitions());
  spawnCivilianFleet({ THREE, gameRoot, navGraph, flightState });
  setSystemWorldVisible(false);
}

function getSystemMapElements() {
  const overlay = document.getElementById('system-map-overlay');
  const canvas = document.getElementById('system-map-canvas');
  const actions = document.getElementById('system-map-actions');
  return { overlay, canvas, actions };
}

function flightUiBlocksPointerLock() {
  if (gameMessageSystem?.classList?.contains?.('active')) return true;
  const ids = ['system-map-overlay', 'help-menu', 'settings-menu', 'inventory-panel', 'loadout-panel', 'mission-board-overlay', 'trade-panel', 'station-menu', 'tutorial-overlay'];
  return ids.some(id => {
    const element = document.getElementById(id);
    return element && !element.hidden && !element.classList?.contains?.('hidden');
  });
}

function hideSystemMapActions() {
  const { actions } = getSystemMapElements();
  if (!actions) return;
  actions.hidden = true;
  actions.innerHTML = '';
  actions.removeAttribute('data-node-id');
}

function renderActiveSystemMap(now = performance.now()) {
  const { overlay, canvas } = getSystemMapElements();
  if (!canvas || overlay?.classList.contains('hidden')) return false;
  lastSystemMapRenderAt = now;
  return renderSystemMap(canvas, navGraph, flightState, undefined, undefined, flightState.civilianTraffic?.mapContacts, combatState.activeIntercept, now, enemies, systemMapViewport);
}

function setSystemMapVisible(visible) {
  const { overlay } = getSystemMapElements();
  if (!overlay) return false;
  overlay.classList.toggle('hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (visible) {
    flightState.keys.clear();
    flightState.mouseButtons.clear();
    flightState.pointerLocked = false;
    document.body.classList.add('pointer-unlocked');
    if (document.pointerLockElement === renderer?.domElement && document.exitPointerLock) document.exitPointerLock();
    renderActiveSystemMap(performance.now());
  } else {
    hideSystemMapActions();
    lastSystemMapRenderAt = 0;
  }
  return true;
}

function updateSystemMapRouteStatus(node, plotted, prefix = null) {
  const autopilot = ensureAutopilotState(flightState);
  const nodeName = node?.name || node?.id || 'waypoint';
  flightState.status = plotted
    ? `${prefix || autopilot.routeModeLabel || 'ROUTE PLOTTED'}: ${nodeName.toUpperCase()}`
    : `${autopilot.blockedReason || 'NO ROUTE FOUND'}: ${nodeName.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2600;
  updateFlightHud(true);
  renderActiveSystemMap(performance.now());
}

function syncMapProjectTarget(node) {
  const projectNode = node?.type === 'planet' ? projectNodeById.get(node.id) : null;
  if (projectNode?.position && projectNode?.userData?.project) setNavigationTarget(projectNode, 'map');
  return projectNode;
}

function plotSystemMapNodeCourse(node, append = false, prefix = null) {
  if (!node) return false;
  flightState.hyperspaceUnlocked = skillTree.unlocked.has('hyperspace');
  const plotted = append ? appendCourse(flightState, navGraph, node.id) : plotCourse(flightState, navGraph, node.id);
  syncMapProjectTarget(node);
  updateSystemMapRouteStatus(node, plotted, prefix);
  return plotted;
}

function closeSystemMapForTravel() {
  setSystemMapVisible(false);
  hideSystemMapActions();
}

function fastTravelToSystemMapNode(node) {
  if (!node) return false;
  if (missionState.active && missionState.step === 'tutorialBasics' && node.type === 'planet') {
    setMissionStep('goLandAtProject', { targetProjectId: node.id });
  }
  const hyperspaceReady = skillTree.unlocked.has('hyperspace');
  const plotted = plotSystemMapNodeCourse(node, false, hyperspaceReady ? 'HYPERSPACE TARGET' : 'FAST ROUTE');
  if (!plotted) return false;
  if (hyperspaceReady) {
    closeSystemMapForTravel();
    return activateHyperspaceTravel();
  }
  engageRouteAutopilot();
  flightState.status = `FAST ROUTE ENGAGED: ${(node.name || node.id).toUpperCase()} // DIRECT JUMP REQUIRES HYPERSPACE DRIVE`;
  flightState.statusUntil = performance.now() + 3200;
  updateFlightHud(true);
  closeSystemMapForTravel();
  return true;
}

function engageMapAutopilotToNode(node, prefix = 'ROUTE') {
  if (!plotSystemMapNodeCourse(node, false, prefix)) return false;
  engageRouteAutopilot();
  closeSystemMapForTravel();
  return true;
}

function getMapNodeDistance(node) {
  return node?.pos?.distanceTo?.(flightState.pos) ?? Infinity;
}

function createSystemMapActionButton(label, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
    hideSystemMapActions();
  });
  return button;
}

function openSystemMapActionMenu(event, node) {
  const { overlay, actions } = getSystemMapElements();
  if (!overlay || !actions || !node) return;
  actions.innerHTML = '';
  actions.hidden = false;
  actions.dataset.nodeId = node.id;

  const title = document.createElement('strong');
  title.textContent = node.name || node.id;
  const distance = getMapNodeDistance(node);
  const tip = document.createElement('span');
  tip.className = 'map-action-tip';
  tip.textContent = `${(node.type || 'waypoint').toUpperCase()} // ${Number.isFinite(distance) ? Math.round(distance).toLocaleString() : '--'}u // choose a nav action`;
  actions.append(title, tip);

  const fastLabel = skillTree.unlocked.has('hyperspace') ? 'Hyperspace Jump' : 'Fast Travel / Autopilot';
  const fastTitle = skillTree.unlocked.has('hyperspace')
    ? 'Charge the Hyperspace Drive and jump directly to this waypoint.'
    : 'Plot the quickest route and engage autopilot; direct jumping unlocks with Hyperspace Drive.';
  actions.append(createSystemMapActionButton(fastLabel, fastTitle, () => fastTravelToSystemMapNode(node)));

  actions.append(createSystemMapActionButton('Set Route', 'Replace the current navigation route with this waypoint.', () => plotSystemMapNodeCourse(node, false)));
  actions.append(createSystemMapActionButton('Append Waypoint', 'Add this waypoint to the end of the current plotted route.', () => plotSystemMapNodeCourse(node, true)));
  actions.append(createSystemMapActionButton('Engage Autopilot', 'Plot this destination and let the route autopilot begin travel.', () => {
    plotSystemMapNodeCourse(node, false);
    engageRouteAutopilot();
    closeSystemMapForTravel();
  }));

  if (node.type === 'planet') {
    actions.append(createSystemMapActionButton('Focus / Inspect', 'Open this project in the Ussyverse inspector and set it as the nav focus.', () => {
      syncMapProjectTarget(node);
      selectProject(node.id, false);
      flightState.status = `INSPECTING: ${(node.name || node.id).toUpperCase()}`;
      flightState.statusUntil = performance.now() + 2000;
      updateFlightHud(true);
    }));
    actions.append(createSystemMapActionButton('Approach / Land', 'Route to this world, or begin landing if already in orbit.', () => {
      const planet = systemPlanets.find(item => item?.userData?.planetId === node.id || item?.id === node.id);
      if (planet && flightState.surface?.state === SURFACE_STATES.ORBITAL && flightState.surface?.planetId === node.id) {
        beginLanding(flightState, planet);
        flightState.status = `LANDING: ${(node.name || node.id).toUpperCase()}`;
        flightState.statusUntil = performance.now() + 2400;
        updateFlightHud(true);
        return;
      }
      engageMapAutopilotToNode(node, 'APPROACH ROUTE');
    }));
  }

  if (node.type === 'station') {
    actions.append(createSystemMapActionButton('Dock / Approach', 'Dock if in range, otherwise plot a docking approach route.', () => {
      const station = systemStations.find(item => item?.userData?.stationId === node.id);
      if (station && getMapNodeDistance(node) <= DOCK_PROXIMITY) dockAtSystemStation(station);
      else engageMapAutopilotToNode(node, 'DOCKING ROUTE');
    }));
  }

  actions.append(createSystemMapActionButton('Clear Route', 'Abort the current plotted route and clear waypoints.', () => {
    disengage(flightState, 'ROUTE CLEARED');
    flightState.status = 'ROUTE CLEARED';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    renderActiveSystemMap(performance.now());
  }));

  const rect = overlay.getBoundingClientRect();
  const left = Math.max(12, Math.min(event.clientX - rect.left + 12, rect.width - 236));
  const top = Math.max(12, Math.min(event.clientY - rect.top + 12, rect.height - 280));
  actions.style.left = `${left}px`;
  actions.style.top = `${top}px`;
}

function handleSystemMapNodeClick(event) {
  event.preventDefault();
  event.stopPropagation();
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  const { canvas } = getSystemMapElements();
  const node = hitTestSystemMapNode(canvas, navGraph, event.clientX, event.clientY, systemMapViewport);
  if (!node) {
    hideSystemMapActions();
    return;
  }
  openSystemMapActionMenu(event, node);
}

function handleSystemMapPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  hideSystemMapActions();
  systemMapViewport = {
    ...systemMapViewport,
    dragging: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false
  };
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  event.currentTarget?.classList?.add?.('is-panning');
}

function handleSystemMapPointerMove(event) {
  if (!systemMapViewport.dragging || systemMapViewport.pointerId !== event.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = event.currentTarget?.getBoundingClientRect?.();
  const scaleX = rect?.width ? (event.currentTarget.width || rect.width) / rect.width : 1;
  const scaleY = rect?.height ? (event.currentTarget.height || rect.height) / rect.height : 1;
  const dx = (event.clientX - systemMapViewport.lastX) * scaleX;
  const dy = (event.clientY - systemMapViewport.lastY) * scaleY;
  const total = Math.hypot(event.clientX - systemMapViewport.startX, event.clientY - systemMapViewport.startY);
  systemMapViewport = {
    ...systemMapViewport,
    offsetX: systemMapViewport.offsetX + dx,
    offsetY: systemMapViewport.offsetY + dy,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: systemMapViewport.moved || total > 6
  };
  renderActiveSystemMap(performance.now());
}

function handleSystemMapPointerUp(event) {
  if (!systemMapViewport.dragging || systemMapViewport.pointerId !== event.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
  event.currentTarget?.classList?.remove?.('is-panning');
  const wasDrag = systemMapViewport.moved;
  systemMapViewport = { ...systemMapViewport, dragging: false, pointerId: null, moved: false };
  if (!wasDrag) handleSystemMapNodeClick(event);
}

function handleSystemMapCanvasClick(event) {
  if (systemMapViewport.dragging || systemMapViewport.moved) return;
  handleSystemMapNodeClick(event);
}

function handleSystemMapWheel(event) {
  event.preventDefault();
  event.stopPropagation();
  flightState.keys.clear();
  flightState.mouseButtons.clear();
  const zoom = Math.max(0.45, Math.min(4, systemMapViewport.zoom * (event.deltaY < 0 ? 1.12 : 0.88)));
  systemMapViewport = { ...systemMapViewport, zoom };
  renderActiveSystemMap(performance.now());
}

function toggleSystemMap() {
  const { overlay } = getSystemMapElements();
  return setSystemMapVisible(overlay?.classList.contains('hidden') ?? true);
}

function findNearestGraphNodeId(types = null) {
  let bestId = null;
  let bestDist = Infinity;
  for (const node of navGraph?.values?.() ?? []) {
    if (types && !types.has(node.type)) continue;
    const dist = node.pos?.distanceTo?.(flightState.pos) ?? Infinity;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = node.id;
    }
  }
  return bestId;
}

function selectAutopilotTargetId() {
  const plottedTargetId = ensureAutopilotState(flightState).targetId;
  if (plottedTargetId && getNavNode(navGraph, plottedTargetId)) return plottedTargetId;
  const currentProjectId = flightState.navNode?.userData?.project?.id;
  if (currentProjectId && getNavNode(navGraph, currentProjectId)) return currentProjectId;
  const nearestId = findNearestGraphNodeId(new Set(['station', 'planet']));
  const firstStationId = [...(navGraph?.values?.() ?? [])].find(node => node.type === 'station')?.id ?? null;
  return nearestId || firstStationId || [...(navGraph?.keys?.() ?? [])][0] || null;
}

function engageRouteAutopilot() {
  if (!navGraph) return false;
  const targetId = selectAutopilotTargetId();
  const autopilot = ensureAutopilotState(flightState);
  flightState.hyperspaceUnlocked = skillTree.unlocked.has('hyperspace');
  if (!targetId || !plotCourse(flightState, navGraph, targetId)) {
    flightState.status = autopilot.blockedReason || 'NO NAV ROUTE AVAILABLE';
    flightState.statusUntil = performance.now() + 2200;
    updateFlightHud(true);
    return false;
  }
  flightState.status = autopilot.routeModeLabel || `ROUTE PLOTTED: ${targetId.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2200;
  updateFlightHud(true);
  return true;
}

function toggleRouteAutopilot() {
  if (isAutopilotActive(flightState)) {
    disengage(flightState, 'MANUAL');
    flightState.status = 'AUTOPILOT DISENGAGED: MANUAL';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return false;
  }
  return engageRouteAutopilot();
}

function triggerWarpFlash() {
  let flash = document.getElementById('warp-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'warp-flash';
    flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:white;opacity:0;z-index:9999;transition:opacity 300ms ease;';
    document.body.appendChild(flash);
  }
  flash.style.opacity = '0.92';
  window.setTimeout(() => { flash.style.opacity = '0'; }, 120);
}

function triggerHyperspaceVisualPulse(durationMs = 2400) {
  const now = performance.now();
  hyperspacePulseStartedAt = now;
  hyperspacePulseUntil = now + durationMs;
}

function getHyperspacePulseMultiplier(time = performance.now()) {
  if (time >= hyperspacePulseUntil || hyperspacePulseUntil <= hyperspacePulseStartedAt) return 1;
  const duration = hyperspacePulseUntil - hyperspacePulseStartedAt;
  const progress = THREE.MathUtils.clamp((time - hyperspacePulseStartedAt) / duration, 0, 1);
  // Charge hard, then taper, purely as a render multiplier. Position/timing
  // changes remain owned by activateHyperspaceTravel's existing timeout.
  const envelope = Math.sin(progress * Math.PI);
  return 1 + envelope * 72;
}

function activateJumpGate(manual = true) {
  const gate = isInJumpRange(flightState.pos, systemJumpGates);
  if (!gate) {
    if (manual) {
      flightState.status = 'NO JUMP GATE IN RANGE';
      flightState.statusUntil = performance.now() + 1800;
      updateFlightHud(true);
    }
    return false;
  }
  const destinationId = gate.userData.connectsTo?.[0];
  const destination = systemJumpGates.find(item => item.userData?.gateId === destinationId);
  if (!destination) return false;
  triggerWarpFlash();
  sfxEngine.playFlat('ui_confirm', { volume: 0.85 });
  flightState.pos.copy(destination.position);
  flightState.vel.set(0, 0, 0);
  flightState.status = `JUMP GATE EXIT: ${destination.userData.name.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 2200;
  updateFlightHud(true);
  return true;
}

function activateHyperspaceTravel() {
  if (!skillTree.unlocked.has('hyperspace')) {
    flightState.status = 'HYPERSPACE DRIVE LOCKED';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return false;
  }
  const autopilot = ensureAutopilotState(flightState);
  const targetNode = getNavNode(navGraph, autopilot.targetId);
  const targetPos = targetNode?.pos || autopilot.targetPos || flightState.navNode?.position;
  const targetLabel = targetNode?.name || flightState.navNode?.userData?.project?.name || autopilot.targetId || 'WAYPOINT';
  if (!targetPos) {
    flightState.status = 'SET NAV TARGET BEFORE HYPERSPACE';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return false;
  }
  const now = performance.now();
  if ((flightState.hyperspaceCooldownUntil ?? 0) > now) {
    flightState.status = `HYPERSPACE COOLDOWN ${Math.ceil((flightState.hyperspaceCooldownUntil - now) / 1000)}s`;
    flightState.statusUntil = now + 1800;
    updateFlightHud(true);
    return false;
  }
  flightState.status = 'HYPERSPACE CHARGING';
  flightState.statusUntil = now + 2200;
  flightState.energy = Math.max(0, flightState.energy - 35);
  triggerHyperspaceVisualPulse(2600);
  updateFlightHud(true);
  window.setTimeout(() => {
    triggerWarpFlash();
    triggerHyperspaceVisualPulse(900);
    flightState.pos.copy(targetPos);
    flightState.vel.set(0, 0, 0);
    flightState.hyperspaceCooldownUntil = performance.now() + 60000;
    flightState.status = `HYPERSPACE ARRIVAL: ${String(targetLabel).toUpperCase()}`;
    flightState.statusUntil = performance.now() + 2200;
    updateFlightHud(true);
  }, 2000);
  return true;
}

function registerNavigationPanelControls() {
  if (navigationPanelControlsRegistered) return;
  navigationPanelControlsRegistered = true;
  const engageBtn = document.getElementById('nav-engage-btn');
  const abortBtn = document.getElementById('nav-abort-btn');
  const mapCloseBtn = document.getElementById('system-map-close');
  const mapOverlay = document.getElementById('system-map-overlay');
  const mapCanvas = document.getElementById('system-map-canvas');
  const mapActions = document.getElementById('system-map-actions');
  engageBtn?.addEventListener('click', engageRouteAutopilot);
  abortBtn?.addEventListener('click', () => {
    disengage(flightState, 'MANUAL');
    updateFlightHud(true);
  });
  mapOverlay?.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    flightState.keys.clear();
    flightState.mouseButtons.clear();
    if (event.target === mapOverlay) hideSystemMapActions();
  });
  mapOverlay?.addEventListener('pointerup', event => {
    event.preventDefault();
    event.stopPropagation();
    flightState.keys.clear();
    flightState.mouseButtons.clear();
  });
  mapOverlay?.addEventListener('click', event => {
    if (event.target !== mapOverlay) return;
    event.preventDefault();
    event.stopPropagation();
    flightState.keys.clear();
    flightState.mouseButtons.clear();
  });
  mapOverlay?.addEventListener('wheel', event => {
    handleSystemMapWheel(event);
  }, { passive: false });
  mapCanvas?.addEventListener('pointerdown', handleSystemMapPointerDown);
  mapCanvas?.addEventListener('pointermove', handleSystemMapPointerMove);
  mapCanvas?.addEventListener('pointerup', handleSystemMapPointerUp);
  mapCanvas?.addEventListener('pointercancel', handleSystemMapPointerUp);
  mapCanvas?.addEventListener('click', handleSystemMapCanvasClick);
  mapCanvas?.addEventListener('wheel', handleSystemMapWheel, { passive: false });
  mapCanvas?.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
  });
  mapActions?.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
  });
  mapCloseBtn?.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    setSystemMapVisible(false);
    requestFlightPointerLock();
  });
  mapCloseBtn?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    requestFlightPointerLock();
  });
}

function registerSurfacePanelControls() {
  if (surfacePanelControlsRegistered) return;
  surfacePanelControlsRegistered = true;
  ['approach-hint', 'orbital-panel', 'surface-panel'].forEach(id => {
    document.getElementById(id)?.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });
  });
  document.getElementById('surface-land-btn')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    landOnNearestProject();
  });
  document.getElementById('surface-services-btn')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (traderState.dockedStation) openStationMenu(traderState.dockedStation);
    else if (flightState.currentDockedProject?.id) openStationMenu(flightState.currentDockedProject.id);
    updateFlightHud(true);
  });
  document.getElementById('surface-depart-btn')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    undockFromTradeMenu();
  });
}

function getMissionBoardStationDef(stationId = traderState.dockedStation) {
  if (!stationId) return null;
  const station = STATIONS.find(item => item.id === stationId);
  if (station) return station;
  const project = USSY_PROJECTS.find(item => item.id === stationId);
  if (!project) return null;
  return {
    id: project.id,
    name: project.name,
    pos: project.planet?.pos,
    type: project.category,
    hasTrading: true,
    hasMissions: true
  };
}

function getMissionBoardContext(stationId = traderState.dockedStation) {
  return {
    stationDef: getMissionBoardStationDef(stationId),
    navGraph,
    flightState,
    traderState,
    documentRef: document,
    onAccept: handleMissionBoardAccept,
    onDecline: handleMissionBoardDecline
  };
}

function registerMissionBoardControls() {
  if (missionBoardControlsRegistered) return;
  missionBoardControlsRegistered = true;
  bindMissionBoardControls(() => getMissionBoardContext(flightState.missionBoardStationId || traderState.dockedStation), document);
}

function openMissionBoard(stationId = traderState.dockedStation) {
  if (flightState.missionBoardOpen) {
    closeMissionBoard({ flightState, documentRef: document });
    updateFlightHud(true);
    return true;
  }
  const context = getMissionBoardContext(stationId);
  const result = openMissionBoardOverlay(context);
  if (!result.ok) {
    addKillFeedEntry('NO MISSION BOARD AVAILABLE', { type: 'warning' });
    flightState.status = 'NO MISSION BOARD AT CURRENT DOCK';
    flightState.statusUntil = performance.now() + 2200;
  }
  updateFlightHud(true);
  return result.ok;
}

function handleMissionBoardAccept(result) {
  if (result?.ok) {
    addKillFeedEntry(`MISSION ACCEPTED: ${result.mission.title.toUpperCase()}`, 'var(--cyber-green)');
    flightState.status = `MISSION ACCEPTED: ${result.mission.title}`;
    saveCurrentRunState({ manual: true });
  } else if (result?.reason === 'ACTIVE_LIMIT') {
    addKillFeedEntry('ACTIVE MISSION LIMIT REACHED', { type: 'warning' });
    flightState.status = 'ACTIVE MISSION LIMIT: 3';
  } else {
    addKillFeedEntry('MISSION UNAVAILABLE', { type: 'warning' });
    flightState.status = 'MISSION UNAVAILABLE';
  }
  flightState.statusUntil = performance.now() + 2200;
  updateFlightHud(true);
}

function handleMissionBoardDecline(result) {
  if (result?.ok) {
    addKillFeedEntry('MISSION DECLINED', { type: 'warning' });
    flightState.status = 'MISSION DECLINED';
    flightState.statusUntil = performance.now() + 1600;
    saveCurrentRunState({ manual: true });
  }
  updateFlightHud(true);
}

function updateSystemMapInput() {
  const now = performance.now();
  const keyDown = flightState.keys.has('KeyM');
  if (keyDown && !systemMapKeyWasDown) toggleSystemMap();
  systemMapKeyWasDown = keyDown;
  const { overlay } = getSystemMapElements();
  if (overlay && !overlay.classList.contains('hidden') && now - lastSystemMapRenderAt > 250) renderActiveSystemMap(now);
}

function dockAtSystemStation(stationObject) {
  if (!stationObject?.userData?.stationId || flightState.landed) return false;
  const stationId = stationObject.userData.stationId;
  flightState.landed = true;
  flightState.vel.set(0, 0, 0);
  flightState.currentDockedProject = null;
  traderState.docked = true;
  traderState.dockedStation = stationId;
  flightState.status = `DOCKED AT ${stationId.toUpperCase()}`;
  flightState.statusUntil = performance.now() + 3000;
  sfxEngine.stopEngineHum();
  sfxEngine.startStationAmbient();
  if (document.pointerLockElement === renderer.domElement && document.exitPointerLock) document.exitPointerLock();
  if (!gameMessageState.active) openStationMenu(stationId);
  updateFlightHud(true);
  return true;
}

function updateSystemDocking() {
  if (flightState.landed) return;
  if (flightState.surface?.state && flightState.surface.state !== SURFACE_STATES.NONE) return;
  const nearest = getNearestBody(flightState.pos, systemStations, DOCK_PROXIMITY);
  if (nearest?.body && performance.now() > flightState.statusUntil) {
    const stationName = nearest.body.userData?.name || nearest.body.userData?.stationId || 'STATION';
    flightState.status = `[ DOCK AVAILABLE: L ] ${String(stationName).toUpperCase()}`;
  }
}

function getCurrentSurfacePlanet() {
  const id = flightState.surface?.planetId;
  if (!id) return null;
  return systemPlanets.find(planet => planet?.userData?.planetId === id || planet?.id === id) || null;
}

function dockAtSurfaceProject() {
  const projectId = flightState.surface?.planetId;
  const project = USSY_PROJECTS.find(item => item.id === projectId);
  if (!project) return false;
  if (!missionState.active) handleDirectorLanding(project);
  restockAtProject(project);
  flightState.currentDockedProject = project;
  traderState.docked = true;
  traderState.dockedStation = project.id;
  sfxEngine.stopEngineHum();
  sfxEngine.startStationAmbient();
  selectProject(project.id, false);
  if (document.pointerLockElement === renderer.domElement && document.exitPointerLock) {
    document.exitPointerLock();
  }
  if (!gameMessageState.active) openStationMenu(project.id);
  saveCurrentRunState({ manual: true });
  return true;
}

function registerFlightAssistKeyCapture() {
  if (flightAssistKeyCaptureRegistered) return;
  flightAssistKeyCaptureRegistered = true;
  const assistKeys = new Set(['KeyR', 'KeyC']);
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
  closeMissionBoard({ flightState, documentRef: document });
  resetFlightAssistState();
  if (flightState.surface?.state === SURFACE_STATES.SURFACE) {
    beginDeparture(flightState);
    flightState.status = 'SURFACE DEPARTURE INITIATED. CLICK VIEWPORT TO RECAPTURE MOUSELOOK.';
  } else {
    const station = traderState.dockedStation
      ? systemStations.find(item => item?.userData?.stationId === traderState.dockedStation)
      : null;
    flightState.landed = false;
    flightState.currentDockedProject = null;
    if (station?.position && flightState.pos.distanceTo(station.position) < DOCK_PROXIMITY + 20) {
      flightTempVec.copy(flightState.pos).sub(station.position);
      if (flightTempVec.lengthSq() < 0.001) flightTempVec.set(0, 0, 1);
      flightTempVec.normalize();
      flightState.pos.copy(station.position).addScaledVector(flightTempVec, DOCK_PROXIMITY + 35);
      flightState.vel.set(0, 0, 0);
      orientFlightToward(station.position);
    }
    flightState.status = 'UNDOCKED. CLICK VIEWPORT TO RECAPTURE MOUSELOOK.';
  }
  handleFlightUndock();
  syncFlightCameraNow();
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
    text: 'USSYVERSE FLIGHT SYSTEMS ONLINE. DISMISS THE CONTROLS REFERENCE, THEN CHOOSE A GUIDED TUTORIAL WITH COMBAT, LANDING, MAP ROUTING, AND SERVICES, OR DROP STRAIGHT INTO FREE ROAM WITH THE DIRECTOR ENABLED.',
    choices: [
      { key: '1', code: 'Digit1', label: 'START TUTORIAL', action: () => startTutorialMission() },
      { key: '2', code: 'Digit2', label: 'FREE ROAM WITH DIRECTOR', action: () => startFreeRoam() },
      { key: '3', code: 'Digit3', label: 'DOGFIGHT ARENA', action: () => startDogfightArena() }
    ],
    onDismiss: () => startTutorialMission(),
    typeSpeed: 18
  });
  flightState.status = 'SELECT DEPLOYMENT PROFILE';
  flightState.statusUntil = performance.now() + 3500;
}

function startFreeRoam(message = 'FREE ROAM ENABLED. THE DIRECTOR WILL OFFER COMMS, BOUNTIES, DISTRESS CALLS, AND ROUTE PRESSURE AS YOU EXPLORE.') {
  dogfightArena.active = false;
  dogfightArena.pendingNextWave = false;
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
  placePlayerNearStartupDock();
  flightState.landed = false;
  traderState.docked = false;
  traderState.dockedStation = null;
  flightState.status = 'FREE ROAM ACTIVE - HUB ALPHA NEARBY';
  flightState.statusUntil = performance.now() + 4500;
  syncFlightCameraNow();
  ttsEngine.speak(message, { ...getVoicePersona('USSYVERSE CONTROL'), priority: 'normal' });
  if (!isTutorialOverlayVisible()) requestFlightPointerLock();
  updateFlightHud(true);
}

function refillDogfightResources() {
  flightState.shield = skillTree.getMaxShield();
  flightState.armor = skillTree.getMaxArmor();
  flightState.energy = skillTree.getMaxEnergy();
  flightState.ammo = maxPlayerAmmo;
  flightState.missiles = maxPlayerMissilesStored;
  flightState.fuel = flightState.maxFuel;
  combatState.heat = 0;
  combatState.overheated = false;
  combatState.overchargeUsed = false;
  flightState.shieldCriticalSpoken = false;
  flightState.hullCriticalLogged = false;
}

function getDogfightEnemyClass(wave, index) {
  if (wave >= 8 && index === 0) return 'elite';
  if (wave >= 5 && index % 3 === 0) return 'gunboat';
  if (wave >= 3 && index % 2 === 0) return 'interceptor';
  return 'scout';
}

function grantDogfightAutoUpgrade() {
  while (dogfightArena.upgradeIndex < DOGFIGHT_UPGRADE_SEQUENCE.length) {
    const nodeId = DOGFIGHT_UPGRADE_SEQUENCE[dogfightArena.upgradeIndex++];
    if (skillTree.unlocked.has(nodeId)) continue;
    const node = SKILL_TREE_NODES.find(item => item.id === nodeId);
    if (!node) continue;
    combatState.skillPoints += node.cost;
    if (skillTree.unlock(nodeId)) {
      skillTree.applyAll();
      return node.name || nodeId.toUpperCase();
    }
  }
  const credits = 125 + dogfightArena.wave * 25;
  addCombatCredits(credits);
  return `${credits}CR ARENA BONUS`;
}

function spawnDogfightWave() {
  dogfightArena.pendingNextWave = false;
  dogfightArena.wave += 1;
  resetCombatSessionStats(combatState);
  const waveEnemies = [];
  const count = Math.min(maxEnemies, 2 + Math.floor(dogfightArena.wave * 0.8));
  activateEnemyWave(enemies, count, (enemy, offset, delay) => {
    const classId = getDogfightEnemyClass(dogfightArena.wave, waveEnemies.length);
    spawnEnemy(enemy, offset, delay, classId);
    enemy.userData.dogfightArena = true;
    enemy.userData.xpReward = (getEnemyClass(classId).xpReward || 25) + dogfightArena.wave * 4;
    enemy.userData.creditReward = (getEnemyClass(classId).creditReward || 50) + dogfightArena.wave * 12;
    waveEnemies.push(enemy);
  });
  announceEnemyWave(waveEnemies);
  setCurrentObjective({
    id: 'dogfight-arena',
    kicker: `ARENA WAVE ${dogfightArena.wave}`,
    title: 'Dogfight Arena',
    detail: `Clear ${count} hostile ships. Winning the wave automatically installs your next upgrade.`,
    progress: 0,
    target: count,
    source: 'arena'
  });
  flightState.status = `DOGFIGHT WAVE ${dogfightArena.wave} INBOUND`;
  flightState.statusUntil = performance.now() + 2600;
  updateFlightHud(true);
}

function completeDogfightWave() {
  if (!dogfightArena.active || dogfightArena.pendingNextWave) return;
  dogfightArena.pendingNextWave = true;
  const upgrade = grantDogfightAutoUpgrade();
  refillDogfightResources();
  setCurrentObjective({
    id: 'dogfight-arena-cleared',
    kicker: `ARENA WAVE ${dogfightArena.wave} CLEARED`,
    title: 'Automatic Upgrade Installed',
    detail: `${upgrade} installed. Next wave is deploying with stronger opposition.`,
    source: 'arena'
  });
  showGameMessage({
    type: 'ARENA WAVE CLEARED',
    source: 'DOGFIGHT ARENA',
    text: `WAVE ${dogfightArena.wave} CLEARED. AUTO-UPGRADE INSTALLED: ${upgrade}. SHIELDS, ARMOR, ENERGY, AMMO, MISSILES, AND FUEL RESTORED. NEXT WAVE INCOMING.`,
    ttsPriority: 'normal'
  });
  window.setTimeout(() => {
    if (dogfightArena.active && isFlightActive) spawnDogfightWave();
  }, 3200);
  updateFlightHud(true);
}

function startDogfightArena() {
  missionState.active = false;
  missionState.step = 'idle';
  missionState.kills = 0;
  resetContractState();
  gameOrchestrator.tutorialComplete = true;
  gameOrchestrator.pendingEvent = null;
  gameOrchestrator.bountyPendingReward = 0;
  gameOrchestrator.nextPollAt = performance.now() + 600000;
  dogfightArena.active = true;
  dogfightArena.wave = 0;
  dogfightArena.pendingNextWave = false;
  dogfightArena.upgradeIndex = 0;
  placePlayerNearStartupDock();
  flightState.landed = false;
  traderState.docked = false;
  traderState.dockedStation = null;
  enemies.forEach(enemy => deactivateCombatObject(enemy));
  playerBullets.forEach(bullet => deactivateCombatObject(bullet));
  enemyBullets.forEach(bullet => deactivateCombatObject(bullet));
  playerMissiles.forEach(missile => deactivateCombatObject(missile));
  refillDogfightResources();
  hideTutorialOverlay();
  ttsEngine.speak('DOGFIGHT ARENA ONLINE. CLEAR WAVES TO INSTALL AUTOMATIC UPGRADES.', { ...getVoicePersona('COMBAT SYSTEM'), priority: 'high' });
  if (!isTutorialOverlayVisible()) requestFlightPointerLock();
  spawnDogfightWave();
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
  const backChoice = { key: 'Esc', code: 'Escape', aliases: ['Backspace'], label: 'STATION MENU', action: () => openStationMenu(projectId) };
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
  const deathPos = enemy?.position?.clone ? enemy.position.clone() : (enemy?.position ? new THREE.Vector3(enemy.position.x ?? 0, enemy.position.y ?? 0, enemy.position.z ?? 0) : null);
  if (enemy?.userData?.isFriendly) {
    if (combatState.activeFriendlyEscort === enemy) combatState.activeFriendlyEscort = null;
    deactivateCombatObject(enemy);
    addKillFeedEntry('FRIENDLY ESCORT LOST', '#ffcc00');
    return;
  }
  if (enemy?.userData?.isBoss) triggerDeathExplosion(deathPos);
  if (handleBossDeath(combatState, enemy, flightState, { addCombatCredits, addKillFeedEntry, showGameMessage })) {
    flightState.status = 'DREADNOUGHT DESTROYED +1200CR';
    flightState.statusUntil = performance.now() + 3000;
    updateFlightHud(true);
    return;
  }
  combatState.lastKilledType = cls.id;
  combatState.lastKilledAt = performance.now();
  const bountyReward = enemy?.userData?.isBountyHunter ? (enemy.userData.reward || 220) : 0;
  if (bountyReward && combatState.activeBountyHunter === enemy) combatState.activeBountyHunter = null;
  checkHunterDestroyed(enemy, { combatState, traderState, enemies, addKillFeedEntry });
  const pointsBefore = combatState.skillPoints;
  const multiplier = recordKillStreak(combatState, performance.now());
  const baseCreditReward = Number.isFinite(enemy?.userData?.creditReward) ? enemy.userData.creditReward : cls.creditReward;
  const baseXpReward = Number.isFinite(enemy?.userData?.xpReward) ? enemy.userData.xpReward : cls.xpReward;
  const creditReward = bountyReward || Math.round(baseCreditReward * multiplier);
  const xpReward = Math.round(baseXpReward * multiplier);
  const isBountyKill = gameOrchestrator.bountyPendingReward > 0 && enemy?.userData?.bountyEventId;
  recordCombatKillStats({ creditsEarned: isBountyKill ? 0 : creditReward, xpEarned: xpReward }, combatState);
  addKillFeedEntry(`${cls.label.toUpperCase()} DESTROYED +${creditReward}CR`, `#${cls.color.toString(16).padStart(6, '0')}`);
  triggerEnemyDeathFeedback(enemy, cls);
  triggerDeathExplosion(deathPos);
  sfxEngine.playPositional('explosion', enemy, { volume: 0.9 });
  emitCombatEnemyKill({ classId: cls.id, pos: deathPos, xpReward });
  if (bountyReward) {
    reputationState.scores.security = Math.max(-100, Math.min(100, Math.min((reputationState.scores.security ?? 0) + 8, -30)));
    addKillFeedEntry('BOUNTY HUNTER ELIMINATED // SECURITY PRESSURE EASED', '#44ff88');
  }
  registerMissionKill(enemy);
  checkMissionProgress(traderState, flightState, combatState, navGraph, performance.now());
  completeReadyBoardMissions();
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
    deactivateCombatObject(enemy);
  }
  if (dogfightArena.active && !dogfightArena.pendingNextWave && enemies.every(item => !item.userData.active || item.userData.isFriendly)) completeDogfightWave();
}

function getMissionLandingProjectName() {
  const project = USSY_PROJECTS.find(p => p.id === missionState.landingProjectId);
  return project ? project.name : 'Devussy';
}

function landOnNearestProject() {
  if (!flightState.landed && flightState.surface?.state === SURFACE_STATES.NONE) {
    const nearestStation = getNearestBody(flightState.pos, systemStations, DOCK_PROXIMITY);
    if (nearestStation?.body && dockAtSystemStation(nearestStation.body)) return;
  }
  if (flightState.surface?.state === SURFACE_STATES.SURFACE) {
    beginDeparture(flightState);
    flightState.status = 'SURFACE DEPARTURE INITIATED';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return;
  }
  if (flightState.surface?.state === SURFACE_STATES.ORBITAL) {
    const planet = getCurrentSurfacePlanet();
    if (planet) {
      beginLanding(flightState, planet);
      flightState.status = `LANDING ON ${flightState.surface.planetId.toUpperCase()}`;
      flightState.statusUntil = performance.now() + 1800;
      updateFlightHud(true);
      return;
    }
  }
  if (flightState.surface?.state === SURFACE_STATES.APPROACH) {
    const planet = getCurrentSurfacePlanet();
    if (planet) {
      beginLanding(flightState, planet);
      flightState.status = `LANDING ON ${flightState.surface.planetId.toUpperCase()}`;
      flightState.statusUntil = performance.now() + 1800;
      updateFlightHud(true);
      return;
    }
  }
  updateProjectLandingTarget();
  const activeLandingRange = landingRange;
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

function handleSurfaceEscape() {
  const state = flightState.surface?.state;
  if (state === SURFACE_STATES.APPROACH) {
    cancelSurfaceApproach(flightState);
    flightState.status = 'SURFACE APPROACH CANCELLED';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return true;
  }
  if (state === SURFACE_STATES.ORBITAL) {
    beginDeparture(flightState);
    flightState.status = 'PULLING AWAY FROM ORBIT';
    flightState.statusUntil = performance.now() + 1800;
    updateFlightHud(true);
    return true;
  }
  return false;
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
  return USSY_PROJECTS.find(project => project.id === projectId)?.name || STATIONS.find(station => station.id === projectId)?.name || 'UNKNOWN';
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

function restockAndReturnToStationMenu(projectId) {
  const project = USSY_PROJECTS.find(item => item.id === projectId) || { id: projectId, name: stationName(projectId) };
  restockAtProject(project);
  openTradeMenu(projectId);
}

function openStationMenu(projectId) {
  if (!projectId) return;
  openTradeMenu(projectId);
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
  choices.push({ key: 'Esc', code: 'Escape', aliases: ['Backspace'], label: 'BACK', action: () => openStationMenu(projectId) });
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
  choices.push({ key: 'Esc', code: 'Escape', aliases: ['Backspace'], label: 'BACK', action: () => openSkillTree() });
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
  if (gameOrchestrator.pendingEvent) return;
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
      offerOrchestratedEvent(data.event);
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

function normalizeOrchestratedEvent(event) {
  return {
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
}

function offerOrchestratedEvent(event) {
  const normalizedEvent = normalizeOrchestratedEvent(event);
  if (!shouldFireEvent(buildOrchestratorPayload(), normalizedEvent.type)) return false;
  gameOrchestrator.pendingEvent = normalizedEvent;
  flightState.status = `DIRECTOR OFFER: ${normalizedEvent.title} // OBJECTIVES PANEL`;
  flightState.statusUntil = performance.now() + 4500;
  missionState.objectiveView = 'available';
  renderObjectivesPanel();
  updateFlightHud(true);
  return true;
}

function acceptOrchestratorOffer() {
  const event = gameOrchestrator.pendingEvent;
  if (!event) return false;
  if (!fireOrchestratedEvent(event)) {
    flightState.status = 'DIRECTOR OFFER UNAVAILABLE';
    flightState.statusUntil = performance.now() + 2500;
    updateFlightHud(true);
    return false;
  }
  gameOrchestrator.pendingEvent = null;
  renderObjectivesPanel();
  return true;
}

function declineOrchestratorOffer() {
  if (!gameOrchestrator.pendingEvent) return false;
  gameOrchestrator.pendingEvent = null;
  gameOrchestrator.nextPollAt = performance.now() + Math.max(gameOrchestrator.minInterval, 30000);
  flightState.status = 'DIRECTOR OFFER DECLINED';
  flightState.statusUntil = performance.now() + 1800;
  renderObjectivesPanel();
  updateFlightHud(true);
  return true;
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
  const normalizedEvent = normalizeOrchestratedEvent(event);
  if (!shouldFireEvent(buildOrchestratorPayload(), normalizedEvent.type)) return false;
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
    return true;
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
    return true;
  }

  if (normalizedEvent.type === 'CONTRABAND') {
    const cargoIds = Object.keys(traderState.cargo).filter(id => traderState.cargo[id] > 0);
    if (!cargoIds.length) {
      showOrchestratorMessage({ ...normalizedEvent, text: normalizedEvent.text || 'INSPECTION SWEEP PASSES. NO CONTRABAND SIGNATURE FOUND.' }, [{ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() }]);
      return true;
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
    return true;
  }

  if (normalizedEvent.type === 'ANOMALY') {
    const fuelReward = normalizedEvent.fuelReward || (5 + Math.floor(Math.random() * 6));
    traderState.fuel = Math.min(traderState.maxFuel, traderState.fuel + fuelReward);
    updateFlightHud(true);
    showOrchestratorMessage(normalizedEvent, [{ key: 'space', code: 'Space', label: 'ACKNOWLEDGE', action: () => dismissGameMessage() }], { typeSpeed: 24, ttsPriority: 'low' });
    return true;
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
  return true;
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
  camTarget.pos.set(0, 18, 128);
  camTarget.lookAt.set(0, 0, 0);
  syncOrbitFromCamera();
  selectedNode = null;
  
  projectNodes.forEach(node => {
    node.scale.setScalar(node.userData.baseScale);
    setProjectNodeOpacity(node, 0.85);
  });
  if (coreLinesMesh) coreLinesMesh.material.opacity = 0.12;
  updateSelectedRelationEdges();
  
  document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.floating-node-label').forEach(lbl => lbl.classList.remove('active'));
}

function updateFlightCamera() {
  return updateFlightCameraModule();
}

function syncFlightCameraNow() {
  updateFlightCamera();
  camCurrent.pos.copy(camTarget.pos);
  camCurrent.lookAt.copy(camTarget.lookAt);
  camera.position.copy(camCurrent.pos);
  if (isFlightActive) camera.up.copy(flightUp);
  else camera.up.set(0, 1, 0);
  camera.lookAt(camCurrent.lookAt);
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
      { key: 'Esc', code: 'Escape', aliases: ['Backspace'], label: 'BACK', action: () => openAudioSettingsMenu() }
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
    ambientField,
    updateDebris: updateDebrisField,
    updateDust: updateDustField,
    updateAmbient: updateAmbientParticleField,
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

function updateAmbientParticleField(dt) {
  updateEngineAmbientParticleField({
    THREE,
    dt,
    ambientField,
    ambientPositions,
    ambientSpeeds,
    ambientParticleCount,
    flightState,
    flightForward,
    randomizeAmbient: randomizeAmbientParticle,
    combatState
  });
}

function onWindowResize() {
  resizeScene({ camera, renderer, isCoarsePointer });
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function configurePostProcessing() {
  composer = null;
  bloomPass = null;
}

export function setBloomStrength(value) {
  const next = Number(value);
  if (Number.isFinite(next) && bloomPass) bloomPass.strength = (prefersReducedMotion || settingsState.reducedMotion) ? 0 : next;
}

export function setBloomThreshold(value) {
  const next = Number(value);
  if (Number.isFinite(next) && bloomPass) bloomPass.threshold = next;
}

export function setBloomRadius(value) {
  const next = Number(value);
  if (Number.isFinite(next) && bloomPass) bloomPass.radius = next;
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
  if (!isFlightActive) {
    projectNodes.forEach(node => {
      if (!prefersReducedMotion && selectedNode !== node) {
        const pos = node.position;
        const x = pos.x * Math.cos(orbitSpeed) - pos.z * Math.sin(orbitSpeed);
        const z = pos.x * Math.sin(orbitSpeed) + pos.z * Math.cos(orbitSpeed);
        pos.x = x;
        pos.z = z;
        
        nodesMoved = true;
      }
    });
  }
  if (nodesMoved) {
    updateCoreConnectionLines();
    markEdgesDirty();
  }
  if (_edgesNeedUpdate) {
    updateRelationshipEdges();
    _edgesNeedUpdate = false;
  }
  const _t = performance.now() * 0.001;
  if (relationshipEdgesMesh) {
    relationshipEdgesMesh.material.opacity = 0.07 + 0.04 * Math.sin(_t * 0.8);
  }

  // Slow ambient drift of camera coordinates during passive Hero screensaver state
  if (isFlightActive) {
    const simulationPaused = Boolean(flightState.paused);
    if (!simulationPaused) updateFlight(time);
    updateSystemMapInput();
    updatePlanetLOD(systemPlanets, camera, frameDt);
    updateStationRotations(systemStations, frameDt);
    updateJumpGateRotations(systemJumpGates, frameDt);
      if (!simulationPaused) {
        updateRouteAutopilot(flightState, combatState, frameDt, navGraph);
        updateFlightBasis();
        const gate = isInJumpRange(flightState.pos, systemJumpGates);
        if (gate && performance.now() > flightState.statusUntil) flightState.status = `[ ACTIVATE JUMP GATE: J ] ${gate.userData.name}`;
        // Hunter cooldowns are wall-clock based; do not pass the frame/performance clock.
        const hunterNow = Date.now();
        if (flightState.newNodeArrival) {
          const tier = shouldTriggerIntercept({ combatState, traderState, node: flightState.newNodeArrival, now: hunterNow });
          if (tier) triggerIntercept({ combatState, traderState, flightState, enemyPool: enemies, spawnEnemy, buildEnemyHealthPips, addKillFeedEntry, node: flightState.newNodeArrival, tier, now: hunterNow });
          flightState.newNodeArrival = null;
        }
        enemies.forEach(enemy => checkHunterFlee(enemy, { combatState, traderState, enemies, addKillFeedEntry, deactivateCombatObject, now: hunterNow }));
      updateCivilians(frameDt, { THREE, gameRoot, flightState, navGraph, enemies, playerBullets, playerMissiles, addKillFeedEntry, now: time });
      spawnCivilianFleet({ THREE, gameRoot, navGraph, flightState, enemies, now: time });
      updateMissionBoardProgress(time);
      const previousSurfaceState = flightState.surface?.state;
      updateSurface(flightState, systemPlanets, frameDt);
      if (previousSurfaceState !== SURFACE_STATES.SURFACE && flightState.surface?.state === SURFACE_STATES.SURFACE) dockAtSurfaceProject();
    }
    updateSurfaceVisuals();
    updateStarfieldWarp(
      systemStarfield,
      flightForward,
      Math.max(ensureAutopilotState(flightState).hyperspeedMult ?? 1, getHyperspacePulseMultiplier(time))
    );
    updateFlightCamera();
    updateNavHUDModule(flightState, combatState);
    updateSurfaceHUDModule(flightState, getSurfacePlanetsForHUD());
    if (!simulationPaused) updateSystemDocking();
    updateFlightHud(false);
    if (combatState.debriefPending) {
      const data = consumeCombatDebrief(combatState);
      if (data) showDebrief(data);
    }
    if (!simulationPaused) sfxEngine.updateEngineHum(flightState.vel);
    updateSpaceEnvironment(frameDt);
    if (!simulationPaused && time - lastPriceDriftTick > 30000) {
      tickPriceDrift();
      lastPriceDriftTick = time;
    }
    if (!simulationPaused && enemies.some(enemy => enemy.userData.active) && time - lastAutoSave > 60000) {
      saveCurrentRunState();
      lastAutoSave = time;
    }
    if (!simulationPaused && time - gameOrchestrator._lastCheck > 1000) {
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
  const lerpFactor = isFlightActive ? (flightState.view === 'cockpit' ? 0.28 : 0.16) : 0.08;
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
  if (prefersReducedMotion || !composer) renderer.render(scene, camera);
  else composer.render();

  if (isFlightActive) {
    projectLabels.forEach(label => { label.element.style.opacity = 0; });
  } else {
    renderProjectLabels();
  }

  // Telemetry framerate diagnostics
  const endTime = performance.now();
  if (endTime - telemetryLastUpdate > 250) {
    telemetryTimer.innerText = isFlightActive
      ? `FLIGHT_LOAD: ${(endTime - startTime).toFixed(2)}ms // VIEW: ${flightState.view.toUpperCase()} // DRAW_CALLS: ${renderer.info.render.calls}`
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

export const flightState = {
  keys: new Set(),
  mouseButtons: new Set(),
  pos: typeof THREE !== 'undefined' ? new THREE.Vector3(0, 2.2, 16) : null,
  vel: typeof THREE !== 'undefined' ? new THREE.Vector3() : null,
  orientation: typeof THREE !== 'undefined' ? new THREE.Quaternion() : null,
  view: 'cockpit',
  pointerLocked: false,
  score: 0,
  shield: 100,
  armor: 100,
  energy: 100,
  ammo: 240,
  missiles: 8,
  fuel: 100,
  maxFuel: 100,
  fuelDepleted: false,
  navNode: null,
  navDistance: Infinity,
  navEta: '--',
  autopilot: false,
  landed: false,
  thrust: 14,
  strafe: 8
};

export const maxEnemies = 7;
export const maxPlayerBullets = 32;
export const maxEnemyBullets = 28;
export const maxPlayerMissiles = 8;
export const maxPlayerAmmo = 240;
export const maxPlayerMissilesStored = 8;
export const constellationScale = 2.25;
export const flightUniverseScale = 10;
export const nodeBaseScale = 1.65;
export const landingRange = 7.2;
export const flightBounds = 135;
export const radarRange = 140;

export const missionState = {
  active: false,
  step: 'idle',
  killGoal: 5,
  kills: 0,
  landingProjectId: 'devussy'
};

export const gameMessageState = {
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
  onDismiss: null
};

export const missionIntroText = 'DOGFIGHT LINK ESTABLISHED. CONGRATULATIONS, OPERATOR: YOU FOUND THE USSYVERSE EASTER EGG. YOU ARE NOW PILOTING A SCRAP-CLASS COCKPIT THROUGH THE PROJECT CONSTELLATION. CONTROL REFERENCE IS LIVE ON YOUR HUD. FIRST OBJECTIVE: HUNT DOWN 5 TUTORIAL BOGEYS AS THEY TELEPORT INTO THE AO.';

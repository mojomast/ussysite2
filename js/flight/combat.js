export const enemies = [];
export const playerBullets = [];
export const enemyBullets = [];
export const playerMissiles = [];
export function spawnEnemy() {}
export function fireBullet() { return false; }
export function fireMissile() { return false; }
export function findNearestEnemy() { return null; }
export function deactivateCombatObject(object) { if (object?.userData) object.userData.active = false; }
export function handleEnemyDestroyed() {}
export function updateCombatObjects() {}
export function applyPlayerDamage() {}
export function updateBullet() {}
export function updateMissile() {}
export function createFlightGameObjects() {}

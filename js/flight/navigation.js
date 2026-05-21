export let flightNavLine = null;
export const navTempVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const navTempVec2 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const navScreenVec = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
export const flightNavQuat = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
export const flightNavMatrix = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null;
export function updateFlightNavigation() {}
export function setNavigationTarget() { return false; }
export function setNavigationFromCrosshair() {}
export function toggleAutopilot() {}
export function disableAutopilot() {}
export function updateAutopilot() {}
export function updateFlightNavLine() {}
export function updateCrosshairProjectTarget() {}

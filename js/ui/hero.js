export const heroContainer = document.getElementById('hero-container');
export const sectionCamPositions = typeof THREE !== 'undefined' ? [new THREE.Vector3(0, 6, 22)] : [];
export const sectionColors = typeof THREE !== 'undefined' ? [{ light1: new THREE.Color(0x00f0ff), light2: new THREE.Color(0xff0055) }] : [];
export function onHeroScroll() {}
export function onHeroWheel() {}
export function onHeroTouchStart() {}
export function onHeroTouchEnd() {}
export function isOnFinalHeroCard() { return false; }
export function resetCameraView() {}
export function updateDeepSpaceAnchor() {}

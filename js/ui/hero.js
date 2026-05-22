const THREE = globalThis.THREE;

let deps = null;
let heroTouchStartY = 0;

const tempCamBase = THREE ? new THREE.Vector3() : null;
const tempCamDrift = THREE ? new THREE.Vector3() : null;
const tempColor1 = typeof THREE?.Color === 'function' ? new THREE.Color() : null;
const tempColor2 = typeof THREE?.Color === 'function' ? new THREE.Color() : null;

export function configureHeroUI(options) {
  deps = options;
}

function requireDeps() {
  if (!deps) throw new Error('Hero UI module not configured');
  return deps;
}

export function onHeroScroll() {
  const { coreOuterParticles, documentRef = document, heroContainer, isConsoleActive, sectionCamPositions, windowRef = window } = requireDeps();
  if (isConsoleActive()) return;

  const scrollTop = heroContainer.scrollTop;
  const clientHeight = heroContainer.clientHeight || windowRef.innerHeight;
  const maxScroll = heroContainer.scrollHeight - clientHeight;
  const scrollRatio = Math.min(scrollTop / maxScroll, 1);
  const sectionIdx = Math.min(Math.round(scrollTop / clientHeight), sectionCamPositions.length - 1);

  documentRef.querySelectorAll('.nav-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === sectionIdx);
    dot.setAttribute('aria-current', idx === sectionIdx ? 'step' : 'false');
  });

  if (coreOuterParticles) coreOuterParticles.rotation.y -= scrollRatio * 0.005;
}

export function isOnFinalHeroCard() {
  const { heroContainer, windowRef = window } = requireDeps();
  if (!heroContainer) return false;
  const clientHeight = heroContainer.clientHeight || windowRef.innerHeight;
  return heroContainer.scrollTop + clientHeight >= heroContainer.scrollHeight - 32;
}

export function onHeroWheel(event) {
  const { activateConsoleMode, isConsoleActive } = requireDeps();
  if (isConsoleActive()) return;
  if (event.deltaY > 18 && isOnFinalHeroCard()) {
    event.preventDefault();
    activateConsoleMode();
  }
}

export function onHeroTouchStart(event) {
  if (event.touches.length > 0) heroTouchStartY = event.touches[0].clientY;
}

export function onHeroTouchEnd(event) {
  const { activateConsoleMode, isConsoleActive } = requireDeps();
  if (isConsoleActive() || !isOnFinalHeroCard() || event.changedTouches.length === 0) return;
  if (heroTouchStartY - event.changedTouches[0].clientY > 32) activateConsoleMode();
}

export function registerHeroListeners() {
  const { heroContainer } = requireDeps();
  if (!heroContainer) return;
  heroContainer.addEventListener('scroll', onHeroScroll, { passive: true });
  heroContainer.addEventListener('wheel', onHeroWheel, { passive: false });
  heroContainer.addEventListener('touchstart', onHeroTouchStart, { passive: true });
  heroContainer.addEventListener('touchend', onHeroTouchEnd, { passive: true });
}

export function setupHeroNavDots() {
  const { documentRef = document, heroContainer, windowRef = window } = requireDeps();
  documentRef.querySelectorAll('.nav-dot').forEach(dot => {
    dot.tabIndex = 0;
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', `Scroll to ${dot.innerText || 'section'}`);
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index);
      if (!heroContainer) return;
      const clientHeight = heroContainer.clientHeight || windowRef.innerHeight;
      heroContainer.scrollTo({ top: idx * clientHeight, behavior: 'smooth' });
    });
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dot.click();
      }
    });
  });
}

export function updateHeroCameraAndLights(time) {
  const { camTarget, heroContainer, pointLight1, pointLight2, sectionCamPositions, sectionColors, windowRef = window } = requireDeps();
  if (!heroContainer) return;
  const scrollTop = heroContainer.scrollTop;
  const clientHeight = heroContainer.clientHeight || windowRef.innerHeight;
  const sectionFloat = scrollTop / clientHeight;
  const lastSectionIdx = sectionCamPositions.length - 1;
  const sectionIdx = Math.min(Math.floor(sectionFloat), lastSectionIdx);
  const nextSectionIdx = Math.min(sectionIdx + 1, lastSectionIdx);
  const t = sectionFloat - sectionIdx;

  tempCamBase.lerpVectors(sectionCamPositions[sectionIdx], sectionCamPositions[nextSectionIdx], t);
  tempCamDrift.set(
    Math.sin(time * 0.0005) * 1.5,
    Math.cos(time * 0.0003) * 0.8,
    Math.sin(time * 0.0004) * 1.2
  );
  camTarget.pos.copy(tempCamBase).add(tempCamDrift);
  camTarget.lookAt.set(0, 0, 0);

  const targetColor1 = tempColor1.copy(sectionColors[sectionIdx].light1).lerp(sectionColors[nextSectionIdx].light1, t);
  const targetColor2 = tempColor2.copy(sectionColors[sectionIdx].light2).lerp(sectionColors[nextSectionIdx].light2, t);
  pointLight1.color.lerp(targetColor1, 0.05);
  pointLight2.color.lerp(targetColor2, 0.05);
}

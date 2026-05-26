import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('main lazily imports flight runtime after launch code', async () => {
  const source = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /^import\s+.*['"]\.\/flight\/runtime\.js['"]/m);
  assert.match(html, /js\/main\.js\?v=runtime-stability-fix-20260526/);
  assert.match(source, /FLIGHT_RUNTIME_URL = '\.\/flight\/runtime\.js\?v=runtime-stability-fix-20260526'/);
  assert.match(source, /DOMContentLoaded/);
});

test('flight runtime cache-busts state and audio module re-exports', async () => {
  const source = await readFile(new URL('../js/flight/runtime.js', import.meta.url), 'utf8');

  assert.match(source, /\.\/state\.js\?v=runtime-stability-fix-20260526/);
  assert.match(source, /\.\/sfx\.js\?v=runtime-stability-fix-20260526/);
});

test('moving space ambience fields are not frustum culled at distant travel', async () => {
  const source = await readFile(new URL('../js/engine/starfield.js', import.meta.url), 'utf8');
  assert.match(source, /debrisField\.frustumCulled = false/);
  assert.match(source, /dustField\.frustumCulled = false/);
  assert.match(source, /ambientField\.frustumCulled = false/);
});

test('docked surface controls sit above cockpit and block mouselock bubbling', async () => {
  const css = await readFile(new URL('../index.css', import.meta.url), 'utf8');
  const stateSource = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  assert.match(css, /\.surface-panel[\s\S]*?z-index: 9650/);
  assert.match(css, /\.surface-approach-hint\.active \{ pointer-events: none; \}/);
  assert.match(css, /\.station-dock-hint\.active \{ pointer-events: none; \}/);
  assert.match(css, /\.cockpit-overlay\.hud-docked[\s\S]*?opacity: 0 !important/);
  assert.match(stateSource, /\['approach-hint', 'orbital-panel', 'surface-panel'\]/);
  assert.match(stateSource, /event\.stopPropagation\(\)/);
});

test('optional Lucide icon boot cannot crash app startup', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /window\.lucide\?\.createIcons\?\.\(\)/);
  assert.doesNotMatch(html, /\blucide\.createIcons\(\)/);
});

test('gate routes expose right-side itinerary HUD', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../index.css', import.meta.url), 'utf8');
  const hud = await readFile(new URL('../js/flight/hud.js', import.meta.url), 'utf8');
  assert.match(html, /id="nav-route-list"/);
  assert.match(css, /\.nav-panel\.gate-route/);
  assert.match(hud, /panel\.classList\.toggle\('gate-route', autopilot\.routeType === 'GATE'\)/);
  assert.match(hud, /nav-route-list/);
});

test('station services expose consistent undock dock-grid controls', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  assert.match(source, /layout: 'dock-grid'/);
  assert.match(source, /label: 'UNDOCK'/);
  assert.match(source, /code: 'KeyU'/);
  assert.match(source, /beginDeparture\(flightState\)/);
  assert.match(source, /function openStationMenu\(projectId\) \{[\s\S]*?openTradeMenu\(projectId\)/);
  assert.match(source, /function openPauseMenu\(\)/);
  assert.match(source, /label: 'STATION SERVICES'/);
  assert.match(source, /label: 'EXIT TO SITE'/);
  assert.match(source, /resumeFlightFromPauseMenu/);
  assert.match(source, /surface-depart-btn[\s\S]*?undockFromTradeMenu\(\)/);
});

test('fresh flight startup deploys beside a dockable station', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');

  assert.match(source, /STARTUP_DOCK_STATION_ID = 'hub-alpha'/);
  assert.match(source, /STARTUP_DOCK_STANDOFF = DOCK_PROXIMITY \+ 35/);
  assert.match(source, /function placePlayerNearStartupDock/);
  assert.match(source, /function dockAtStartupStation/);
  assert.match(source, /placePlayerNearStartupDock\(\)/);
});

test('free roam starts controllable instead of auto-docking', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  const body = source.match(/function startFreeRoam\([^)]*\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(body, /placePlayerNearStartupDock\(\)/);
  assert.match(body, /flightState\.landed = false/);
  assert.match(body, /traderState\.docked = false/);
  assert.match(body, /syncFlightCameraNow\(\)/);
  assert.match(body, /requestFlightPointerLock\(\)/);
  assert.doesNotMatch(body, /dockAtStartupStation\(\)/);
  assert.doesNotMatch(body, /openStationMenu\(/);
});

test('station proximity prompts instead of auto-docking', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  const dockingBody = source.match(/function updateSystemDocking\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  const landBody = source.match(/function landOnNearestProject\(\) \{[\s\S]*?if \(flightState\.surface\?\.state === SURFACE_STATES\.SURFACE\)/)?.[0] || '';
  const undockBody = source.match(/function undockFromTradeMenu\(\) \{[\s\S]*?handleFlightUndock\(\);/)?.[0] || '';

  assert.match(dockingBody, /DOCK AVAILABLE: L/);
  assert.doesNotMatch(dockingBody, /dockAtSystemStation\(nearest\.body\)/);
  assert.match(landBody, /getNearestBody\(flightState\.pos, systemStations, DOCK_PROXIMITY\)/);
  assert.match(landBody, /dockAtSystemStation\(nearestStation\.body\)/);
  assert.match(undockBody, /DOCK_PROXIMITY \+ 35/);
  assert.match(undockBody, /orientFlightToward\(station\.position\)/);
});

test('saved sessions require explicit resume or new deployment', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  const enterBody = source.match(/export function enterFlightMode\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(source, /function resumePendingRunState\(\)/);
  assert.match(source, /function discardPendingRunState\(\)/);
  assert.match(enterBody, /RESUME SESSION/);
  assert.match(enterBody, /NEW DEPLOYMENT/);
  assert.doesNotMatch(enterBody, /applySavedRunState\(pendingRunState\)/);
});

test('map approach actions engage travel and hyperspace uses plotted node target', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');

  assert.match(source, /function engageMapAutopilotToNode/);
  assert.match(source, /engageMapAutopilotToNode\(node, 'APPROACH ROUTE'\)/);
  assert.match(source, /engageMapAutopilotToNode\(node, 'DOCKING ROUTE'\)/);
  assert.match(source, /const targetNode = getNavNode\(navGraph, autopilot\.targetId\)/);
  assert.match(source, /const targetPos = targetNode\?\.pos \|\| autopilot\.targetPos \|\| flightState\.navNode\?\.position/);
});

test('index uses classic Three runtime without addon imports', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /three\.min\.js/);
  assert.doesNotMatch(html, /three\/addons/);
  assert.match(html, /id="flight-loading-overlay"/);
});

test('system map exposes fast travel and zoom-pan handlers', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');

  assert.match(source, /Fast Travel \/ Autopilot/);
  assert.match(source, /Hyperspace Jump/);
  assert.match(source, /handleSystemMapWheel/);
  assert.match(source, /handleSystemMapCanvasClick/);
  assert.match(source, /handleSystemMapPointerMove/);
});

test('hyperspace and main-view nav cues expose visual contracts', async () => {
  const starfield = await readFile(new URL('../js/flight/starfield.js', import.meta.url), 'utf8');
  const autopilot = await readFile(new URL('../js/flight/autopilot.js', import.meta.url), 'utf8');
  const navigation = await readFile(new URL('../js/flight/navigation.js', import.meta.url), 'utf8');
  const state = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../index.css', import.meta.url), 'utf8');

  assert.match(starfield, /uWarp/);
  assert.match(autopilot, /uniforms\.uWarp\.value = warp/);
  assert.match(state, /triggerHyperspaceVisualPulse/);
  assert.match(state, /getHyperspacePulseMultiplier\(time\)/);
  assert.match(navigation, /resolveFlightNavTarget/);
  assert.match(navigation, /classList\.toggle\('hyperspace'/);
  assert.match(css, /--nav-arrow-rotation/);
  assert.match(css, /\.flight-nav-marker\.gate/);
});

test('flight input blocks pointer capture while UI panels are open', async () => {
  const source = await readFile(new URL('../js/input.js', import.meta.url), 'utf8');

  assert.match(source, /function isFlightUiOpen/);
  assert.match(source, /releasePointerLockForUi/);
  assert.match(source, /game-message-system/);
  assert.match(source, /messageRoot\?\.classList\?\.contains\?\.\('active'\)/);
  assert.match(source, /openPauseMenu/);
  assert.doesNotMatch(source, /event\.code === 'Escape'[\s\S]{0,160}?exitFlightMode\(\)/);
  assert.match(source, /system-map-overlay/);
  assert.match(source, /settings-menu/);
  assert.doesNotMatch(source, /'objectives-panel'/);
});

test('tutorial overlay hides before requesting mouselook capture', async () => {
  const source = await readFile(new URL('../js/flight/tutorial-overlay.js', import.meta.url), 'utf8');
  const hideBody = source.match(/export function hideTutorialOverlay\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(hideBody, /overlay\.hidden = true/);
  assert.match(hideBody, /deps\.requestPointerLock\?\.\(\)/);
  assert.ok(hideBody.indexOf('overlay.hidden = true') < hideBody.indexOf('deps.requestPointerLock?.()'));
  assert.doesNotMatch(hideBody, /animateOverlay\(/);
});

test('flight camera target is synchronized outside physics-only updates', async () => {
  const source = await readFile(new URL('../js/flight/state.js', import.meta.url), 'utf8');

  assert.match(source, /function syncFlightCameraNow\(\)/);
  assert.match(source, /camCurrent\.pos\.copy\(camTarget\.pos\)/);
  assert.match(source, /camera\.position\.copy\(camCurrent\.pos\)/);
  assert.match(source, /syncFlightCameraNow\(\);[\s\S]*?enemies\.forEach/);
  assert.match(source, /handleFlightUndock\(\);\n\s*syncFlightCameraNow\(\);/);
  assert.match(source, /updateStarfieldWarp\([\s\S]*?\);\n\s*updateFlightCamera\(\);\n\s*updateNavHUDModule/);
});

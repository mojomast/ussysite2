import { acceptMission, declineMission, generateMissionsForStation } from './missions.js';

const ACTIVE_LIMIT = 3;

let deps = {};
let selectedMissionId = null;

export function configureMissionBoardUI(options = {}) {
  deps = { ...deps, ...options };
}

export function canOpenMissionBoard(flightState, traderState, stationDef) {
  return Boolean(flightState?.landed && traderState?.dockedStation && stationDef?.hasMissions === true);
}

export function missionProgressText(mission) {
  const objective = mission?.objective;
  if (!objective || typeof objective !== 'object') return 'NO OBJECTIVE';
  return `${objective.current ?? 0}/${objective.required ?? 0} ${String(objective.action ?? 'objective').toUpperCase()}`;
}

export function formatMissionTimeLimit(seconds) {
  if (seconds === null || seconds === undefined) return 'NONE';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function renderMissionDetail(mission, documentRef = deps.documentRef || document) {
  const detail = documentRef.getElementById('mission-board-detail');
  if (!detail) return false;
  if (!mission) {
    detail.replaceChildren();
    const empty = documentRef.createElement('div');
    empty.className = 'mission-board-empty';
    empty.textContent = 'SELECT A CONTRACT FROM THE FEED.';
    detail.appendChild(empty);
    return true;
  }

  detail.replaceChildren();
  const title = documentRef.createElement('h3');
  title.textContent = mission.title;
  const meta = documentRef.createElement('div');
  meta.className = 'mission-board-detail-meta';
  meta.textContent = `TYPE: ${mission.type} // ISSUER: ${mission.issuer} // TARGET: ${mission.objective?.targetName ?? mission.targetId}`;
  const desc = documentRef.createElement('p');
  desc.textContent = mission.description;
  const stats = documentRef.createElement('div');
  stats.className = 'mission-board-detail-stats';
  stats.innerHTML = `<span>OBJECTIVE ${missionProgressText(mission)}</span><span>REWARD ${mission.reward}CR</span><span>REPUTATION ${mission.reputationReward?.faction ?? '--'} +${mission.reputationReward?.amount ?? 0}</span><span>TIME LIMIT ${formatMissionTimeLimit(mission.timeLimit)}</span>`;
  detail.append(title, meta, desc, stats);
  return true;
}

export function renderActiveSidebar(activeMissions = [], documentRef = deps.documentRef || document) {
  const sidebar = documentRef.getElementById('mission-active-sidebar');
  if (!sidebar) return false;
  sidebar.replaceChildren();
  const visible = activeMissions.filter(mission => mission.status === 'ACTIVE').slice(0, ACTIVE_LIMIT);
  for (let index = 0; index < ACTIVE_LIMIT; index += 1) {
    const row = documentRef.createElement('div');
    row.className = 'mission-active-row';
    const mission = visible[index];
    row.textContent = mission ? `${index + 1}. ${mission.title} // ${missionProgressText(mission)}` : `${index + 1}. EMPTY SLOT`;
    sidebar.appendChild(row);
  }
  return true;
}

function boardSeed(now = Date.now()) {
  return Math.floor(now / 86400000);
}

function getBoardMissions(stationDef, navGraph, traderState, now = Date.now()) {
  traderState.missionBoard ??= {};
  traderState.missionBoard.boardCache ??= {};
  const seed = boardSeed(now);
  const key = `${stationDef.id}:${seed}`;
  if (!Array.isArray(traderState.missionBoard.boardCache[key])) {
    traderState.missionBoard.boardCache[key] = generateMissionsForStation(stationDef, navGraph, seed, traderState);
  }
  return traderState.missionBoard.boardCache[key];
}

function missionById(missions, id) {
  return missions.find(mission => mission.id === id) ?? missions[0] ?? null;
}

export function renderMissionBoard({ stationDef, navGraph, flightState, traderState, now = Date.now(), documentRef = deps.documentRef || document } = {}) {
  const overlay = documentRef.getElementById('mission-board-overlay');
  if (!overlay || !stationDef || !navGraph || !traderState) return false;
  const missions = getBoardMissions(stationDef, navGraph, traderState, now);
  selectedMissionId = missionById(missions, selectedMissionId)?.id ?? null;
  if (flightState) flightState.selectedMissionId = selectedMissionId;

  const list = documentRef.getElementById('mission-board-list');
  const title = documentRef.getElementById('mission-board-station');
  const credits = documentRef.getElementById('mission-board-credits');
  if (title) title.textContent = stationDef.name ?? stationDef.id;
  if (credits) credits.textContent = `${traderState.credits ?? 0}CR`;
  if (list) {
    list.replaceChildren();
    for (const mission of missions) {
      const card = documentRef.createElement('button');
      card.type = 'button';
      card.className = 'mission-card available-objective-card';
      card.dataset.missionId = mission.id;
      card.classList.toggle('selected', mission.id === selectedMissionId);
      card.innerHTML = `<span class="mission-card-type">${mission.type}</span><strong>${mission.title}</strong><small>${mission.issuer} -> ${mission.objective?.targetName ?? mission.targetId} // ${mission.reward}CR +${mission.reputationReward?.amount ?? 0}</small>`;
      card.addEventListener('click', () => {
        selectedMissionId = mission.id;
        renderMissionBoard({ stationDef, navGraph, flightState, traderState, now, documentRef });
      });
      list.appendChild(card);
    }
  }
  renderMissionDetail(missionById(missions, selectedMissionId), documentRef);
  renderActiveSidebar(traderState.activeMissions ?? [], documentRef);
  return true;
}

export function openMissionBoard({ stationDef, navGraph, flightState, traderState, now = Date.now(), documentRef = deps.documentRef || document } = {}) {
  if (!canOpenMissionBoard(flightState, traderState, stationDef)) return { ok: false, reason: 'NO_BOARD' };
  const overlay = documentRef.getElementById('mission-board-overlay');
  if (!overlay) return { ok: false, reason: 'NO_DOM' };
  flightState.missionBoardOpen = true;
  flightState.missionBoardStationId = stationDef.id;
  if ('paused' in flightState) flightState.paused = true;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  renderMissionBoard({ stationDef, navGraph, flightState, traderState, now, documentRef });
  return { ok: true };
}

export function closeMissionBoard({ flightState, documentRef = deps.documentRef || document } = {}) {
  const overlay = documentRef.getElementById('mission-board-overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }
  if (flightState) {
    flightState.missionBoardOpen = false;
    flightState.missionBoardStationId = null;
    flightState.selectedMissionId = null;
    if ('paused' in flightState) flightState.paused = false;
  }
  selectedMissionId = null;
  return true;
}

export function acceptSelectedMission({ stationDef, navGraph, flightState, traderState, now = performance.now(), documentRef = deps.documentRef || document } = {}) {
  const missions = getBoardMissions(stationDef, navGraph, traderState);
  const mission = missionById(missions, selectedMissionId);
  const result = acceptMission(traderState, mission, now);
  renderMissionBoard({ stationDef, navGraph, flightState, traderState, documentRef });
  return result;
}

export function declineSelectedMission({ stationDef, navGraph, flightState, traderState, documentRef = deps.documentRef || document } = {}) {
  const missions = getBoardMissions(stationDef, navGraph, traderState);
  const mission = missionById(missions, selectedMissionId);
  const result = declineMission(traderState, mission);
  if (result.ok) {
    const index = missions.findIndex(item => item.id === result.id);
    if (index >= 0) missions.splice(index, 1);
    selectedMissionId = missions[0]?.id ?? null;
  }
  renderMissionBoard({ stationDef, navGraph, flightState, traderState, documentRef });
  return result;
}

export function bindMissionBoardControls(getContext, documentRef = deps.documentRef || document) {
  const overlay = documentRef.getElementById('mission-board-overlay');
  if (!overlay || overlay.dataset.bound === 'true') return false;
  overlay.dataset.bound = 'true';
  documentRef.getElementById('mission-board-close')?.addEventListener('click', () => closeMissionBoard(getContext()));
  documentRef.getElementById('mission-board-accept')?.addEventListener('click', () => {
    const context = getContext();
    const result = acceptSelectedMission(context);
    context.onAccept?.(result);
  });
  documentRef.getElementById('mission-board-decline')?.addEventListener('click', () => {
    const context = getContext();
    const result = declineSelectedMission(context);
    context.onDecline?.(result);
  });
  return true;
}

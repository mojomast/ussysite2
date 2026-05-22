import { JUMP_POINTS, PLANETS, STATIONS } from './world.js';

export const NAVGRAPH_LOCAL_RANGE = 15000;
export const JUMP_POINT_NEAREST_CONNECTIONS = 2;

function createVector3(pos = [0, 0, 0]) {
  const THREE = globalThis.THREE;
  if (!THREE?.Vector3) throw new Error('buildNavGraph requires globalThis.THREE.Vector3');

  const [x = 0, y = 0, z = 0] = pos;
  return new THREE.Vector3(x, y, z);
}

function distanceBetweenPositions(posA, posB) {
  if (!posA || !posB) return Infinity;
  if (typeof posA.distanceTo === 'function') return posA.distanceTo(posB);

  const dx = (posA.x ?? 0) - (posB.x ?? 0);
  const dy = (posA.y ?? 0) - (posB.y ?? 0);
  const dz = (posA.z ?? 0) - (posB.z ?? 0);
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

function addNode(graph, definition, type) {
  if (!definition?.id) return;
  graph.set(definition.id, {
    id: definition.id,
    name: definition.name ?? definition.id,
    pos: createVector3(definition.pos),
    type,
    edges: []
  });
}

function addBidirectionalEdge(graph, idA, idB) {
  if (idA === idB) return;

  const nodeA = graph.get(idA);
  const nodeB = graph.get(idB);
  if (!nodeA || !nodeB) return;

  const dist = distanceBetweenPositions(nodeA.pos, nodeB.pos);
  if (!Number.isFinite(dist)) return;

  if (!nodeA.edges.some(edge => edge.targetId === idB)) {
    nodeA.edges.push({ targetId: idB, dist });
  }
  if (!nodeB.edges.some(edge => edge.targetId === idA)) {
    nodeB.edges.push({ targetId: idA, dist });
  }
}

function sortedNodesByDistance(graph, origin) {
  return [...graph.values()]
    .filter(node => node.id !== origin.id)
    .map(node => ({ node, dist: distanceBetweenPositions(origin.pos, node.pos) }))
    .filter(entry => Number.isFinite(entry.dist))
    .sort((a, b) => a.dist - b.dist);
}

export function buildNavGraph(planets = PLANETS, stations = STATIONS, jumpPoints = JUMP_POINTS) {
  const graph = new Map();

  for (const planet of planets ?? []) addNode(graph, planet, 'planet');
  for (const station of stations ?? []) addNode(graph, station, 'station');
  for (const jumpPoint of jumpPoints ?? []) addNode(graph, jumpPoint, 'jump');

  const nodes = [...graph.values()];
  for (let index = 0; index < nodes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      if (distanceBetweenPositions(nodes[index].pos, nodes[otherIndex].pos) <= NAVGRAPH_LOCAL_RANGE) {
        addBidirectionalEdge(graph, nodes[index].id, nodes[otherIndex].id);
      }
    }
  }

  for (const jumpPoint of jumpPoints ?? []) {
    const jumpNode = graph.get(jumpPoint?.id);
    if (!jumpNode) continue;

    for (const { node } of sortedNodesByDistance(graph, jumpNode).slice(0, JUMP_POINT_NEAREST_CONNECTIONS)) {
      addBidirectionalEdge(graph, jumpNode.id, node.id);
    }
  }

  return graph;
}

export function getNavNode(graph, id) {
  return graph?.get?.(id);
}

export function distanceBetweenNodes(graph, idA, idB) {
  const nodeA = getNavNode(graph, idA);
  const nodeB = getNavNode(graph, idB);
  if (!nodeA || !nodeB) return Infinity;
  return distanceBetweenPositions(nodeA.pos, nodeB.pos);
}

function lowestScoreNode(openSet, fScore) {
  let bestId = null;
  let bestScore = Infinity;
  for (const id of openSet) {
    const score = fScore.get(id) ?? Infinity;
    if (score < bestScore) {
      bestId = id;
      bestScore = score;
    }
  }
  return bestId;
}

function reconstructPath(cameFrom, currentId) {
  const path = [currentId];
  while (cameFrom.has(currentId)) {
    currentId = cameFrom.get(currentId);
    path.unshift(currentId);
  }
  return path;
}

export function findRoute(graph, fromId, toId) {
  if (!getNavNode(graph, fromId) || !getNavNode(graph, toId)) return null;
  if (fromId === toId) return [fromId];

  const openSet = new Set([fromId]);
  const cameFrom = new Map();
  const gScore = new Map([[fromId, 0]]);
  const fScore = new Map([[fromId, distanceBetweenNodes(graph, fromId, toId)]]);

  while (openSet.size > 0) {
    const currentId = lowestScoreNode(openSet, fScore);
    if (currentId === null) break;
    if (currentId === toId) return reconstructPath(cameFrom, currentId);

    openSet.delete(currentId);
    const current = getNavNode(graph, currentId);
    for (const edge of current?.edges ?? []) {
      if (!getNavNode(graph, edge.targetId)) continue;

      const tentativeScore = (gScore.get(currentId) ?? Infinity) + edge.dist;
      if (tentativeScore >= (gScore.get(edge.targetId) ?? Infinity)) continue;

      cameFrom.set(edge.targetId, currentId);
      gScore.set(edge.targetId, tentativeScore);
      fScore.set(edge.targetId, tentativeScore + distanceBetweenNodes(graph, edge.targetId, toId));
      openSet.add(edge.targetId);
    }
  }

  return null;
}

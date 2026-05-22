import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { JUMP_POINTS, PLANETS, STATIONS } from '../js/flight/world.js';
import { buildNavGraph, distanceBetweenNodes, findRoute } from '../js/flight/navgraph.js';

class TestVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
  }
}

globalThis.THREE = { Vector3: TestVector3 };

function assertRouteIsConnected(graph, route) {
  assert.ok(Array.isArray(route));
  for (let index = 0; index < route.length - 1; index += 1) {
    const node = graph.get(route[index]);
    assert.ok(node.edges.some(edge => edge.targetId === route[index + 1]), `${route[index]} should connect to ${route[index + 1]}`);
  }
}

describe('flight navgraph', () => {
  it('buildNavGraph returns a Map with all world nodes', () => {
    const graph = buildNavGraph();

    assert.ok(graph instanceof Map);
    assert.equal(graph.size, PLANETS.length + STATIONS.length + JUMP_POINTS.length);
  });

  it('creates an edges array on each node', () => {
    const graph = buildNavGraph();

    for (const node of graph.values()) assert.ok(Array.isArray(node.edges), `${node.id} should have edges`);
  });

  it('connects jump points to at least two nodes', () => {
    const graph = buildNavGraph();

    for (const jumpPoint of JUMP_POINTS) {
      assert.ok(graph.get(jumpPoint.id).edges.length >= 2, `${jumpPoint.id} should have at least two edges`);
    }
  });

  it('findRoute returns null for an unreachable node pair', () => {
    const graph = buildNavGraph(
      [{ id: 'a', name: 'A', pos: [0, 0, 0] }, { id: 'b', name: 'B', pos: [20000, 0, 0] }],
      [],
      []
    );

    assert.equal(findRoute(graph, 'a', 'b'), null);
  });

  it('findRoute returns a two-node route for directly connected nodes', () => {
    const graph = buildNavGraph();

    assert.deepEqual(findRoute(graph, 'nexus-prime', 'cinder'), ['nexus-prime', 'cinder']);
  });

  it('findRoute returns a valid path array for a multi-hop route', () => {
    const graph = buildNavGraph(
      [{ id: 'start', name: 'Start', pos: [0, 0, 0] }, { id: 'middle', name: 'Middle', pos: [10000, 0, 0] }, { id: 'end', name: 'End', pos: [20000, 0, 0] }],
      [],
      []
    );

    const route = findRoute(graph, 'start', 'end');

    assert.deepEqual(route, ['start', 'middle', 'end']);
    assertRouteIsConnected(graph, route);
  });

  it('distanceBetweenNodes returns Infinity for unknown ids', () => {
    const graph = buildNavGraph();

    assert.equal(distanceBetweenNodes(graph, 'nexus-prime', 'unknown'), Infinity);
  });
});

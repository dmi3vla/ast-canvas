import { describe, it, expect } from 'vitest';
import {
  createDepGraph,
  addNode,
  addEdge,
  incoming,
  outgoing,
  egoNetwork,
  createFixtureGraph,
} from '../src/dep-graph';

describe('DepGraph', () => {
  describe('Fixture graph A→B→C + X', () => {
    const g = createFixtureGraph();

    it('has 4 nodes and 3 edges', () => {
      expect(Object.keys(g.nodes)).toHaveLength(4);
      expect(g.edges).toHaveLength(3);
    });

    it('incoming for B returns [A] (A imports B)', () => {
      const ins = incoming(g, 'B');
      expect(ins).toHaveLength(1);
      expect(ins[0].from).toBe('A');
    });

    it('outgoing for B returns [C, X] (B imports C and X)', () => {
      const outs = outgoing(g, 'B');
      expect(outs).toHaveLength(2);
      expect(outs.map(e => e.to).sort()).toEqual(['C', 'X']);
    });

    it('egoNetwork depth 1 from B', () => {
      const ego = egoNetwork(g, 'B', 1);
      expect(ego.nodes.has('A')).toBe(true);  // A imports B
      expect(ego.nodes.has('B')).toBe(true);
      expect(ego.nodes.has('C')).toBe(true);  // B imports C
      expect(ego.nodes.has('X')).toBe(true);  // B imports X
      expect(ego.edges.length).toBeGreaterThanOrEqual(3);
    });

    it('egoNetwork depth 2 from A reaches all nodes', () => {
      const ego = egoNetwork(g, 'A', 2);
      expect(ego.nodes.size).toBe(4);
      expect(ego.nodes.has('X')).toBe(true);
    });

    it('egoNetwork depth 0 returns only center', () => {
      const ego = egoNetwork(g, 'A', 0);
      expect(ego.nodes.size).toBe(1);
      expect(ego.nodes.has('A')).toBe(true);
      expect(ego.edges).toHaveLength(0);
    });
  });

  describe('Empty graph', () => {
    it('createDepGraph returns empty', () => {
      const g = createDepGraph();
      expect(Object.keys(g.nodes)).toHaveLength(0);
      expect(g.edges).toHaveLength(0);
    });

    it('incoming/outgoing on empty are safe', () => {
      const g = createDepGraph();
      expect(incoming(g, 'nope')).toEqual([]);
      expect(outgoing(g, 'nope')).toEqual([]);
    });

    it('egoNetwork on empty returns only center', () => {
      const g = createDepGraph();
      const ego = egoNetwork(g, 'X', 1);
      expect(ego.nodes.has('X')).toBe(true);
      expect(ego.nodes.size).toBe(1);
    });
  });

  describe('Node/Edge building', () => {
    it('addNode and addEdge work', () => {
      const g = createDepGraph();
      addNode(g, { id: '1', path: 'a.ts', kind: 'file' });
      addNode(g, { id: '2', path: 'b.ts', kind: 'file' });
      addEdge(g, { from: '1', to: '2', kind: 'import' });

      expect(Object.keys(g.nodes)).toHaveLength(2);
      expect(g.edges).toHaveLength(1);
      expect(outgoing(g, '1')).toHaveLength(1);
    });
  });
});

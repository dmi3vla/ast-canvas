import { describe, it, expect } from 'vitest';
import { CanvasState } from '../src/CanvasState';

describe('CanvasState', () => {
  describe('Node operations', () => {
    it('creates a node with auto-incremented ID', () => {
      const state = new CanvasState();
      const node = state.createNode('Test', 100, 200);
      expect(node.id).toMatch(/^node_\d+$/);
      expect(node.text).toBe('Test');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(state.nodes).toHaveLength(1);
    });

    it('deletes a node and its edges', () => {
      const state = new CanvasState();
      const a = state.createNode('A', 0, 0);
      const b = state.createNode('B', 100, 0);
      state.createEdge(a.id, b.id);

      state.deleteNode(a.id);
      expect(state.nodes).toHaveLength(1);
      expect(state.edges).toHaveLength(0);
    });

    it('getNodeAt returns correct node', () => {
      const state = new CanvasState();
      const node = state.createNode('Target', 100, 100);
      node.width = 200;
      node.height = 100;

      expect(state.getNodeAt(150, 150)).toBe(node);
      expect(state.getNodeAt(0, 0)).toBeNull();
    });
  });

  describe('Selection', () => {
    it('selects and clears selection', () => {
      const state = new CanvasState();
      const node = state.createNode('Test', 0, 0);

      state.selectNode(node.id);
      expect(node.isSelected).toBe(true);
      expect(state.selectedCount).toBe(1);
      expect(state.firstSelectedId).toBe(node.id);

      state.clearSelection();
      expect(node.isSelected).toBe(false);
      expect(state.selectedCount).toBe(0);
      expect(state.firstSelectedId).toBeNull();
    });

    it('toggles selection', () => {
      const state = new CanvasState();
      const a = state.createNode('A', 0, 0);
      const b = state.createNode('B', 100, 0);

      state.toggleSelection(a.id);
      expect(state.selectedCount).toBe(1);

      state.toggleSelection(b.id);
      expect(state.selectedCount).toBe(2);

      state.toggleSelection(a.id);
      expect(state.selectedCount).toBe(1);
      expect(state.firstSelectedId).toBe(b.id);
    });

    it('fires onSelectionChange callback', () => {
      const state = new CanvasState();
      const calls: (string | null)[] = [];
      state.onSelectionChange = (id) => calls.push(id);

      const node = state.createNode('Test', 0, 0);
      state.selectNode(node.id);
      state.clearSelection();

      expect(calls).toEqual([node.id, null]);
    });
  });

  describe('Viewport', () => {
    it('pans correctly', () => {
      const state = new CanvasState();
      state.pan(10, 20);
      expect(state.offsetX).toBe(10);
      expect(state.offsetY).toBe(20);
    });

    it('zooms towards cursor', () => {
      const state = new CanvasState();
      state.zoom(2, 400, 300); // zoom in at center-ish
      expect(state.scale).toBe(2);
      // offset should have shifted to keep cursor position stable
      expect(state.offsetX).not.toBe(0);
    });

    it('clamps zoom to 0.1–10', () => {
      const state = new CanvasState();
      state.zoom(100, 0, 0);
      expect(state.scale).toBe(10);
      state.zoom(0.001, 0, 0);
      expect(state.scale).toBe(0.1);
    });
  });

  describe('Serialization roundtrip', () => {
    it('serializes and deserializes to Obsidian .canvas format', () => {
      const state = new CanvasState();

      // Create a mini canvas
      const n1 = state.createNode('# Title', -200, -100);
      n1.width = 300;
      n1.height = 100;

      const n2 = state.createNode('Child node', 200, -100);
      state.createEdge(n1.id, n2.id, 'right', 'left');

      const n3 = state.createNode('Another', 0, 200);
      state.createEdge(n1.id, n3.id, 'bottom', 'top');

      // Export
      const exported = state.exportCanvasData();
      expect(exported.nodes).toHaveLength(3);
      expect(exported.edges).toHaveLength(2);

      // Verify edge format
      expect(exported.edges[0].fromNode).toBe(n1.id);
      expect(exported.edges[0].toNode).toBe(n2.id);
      expect(exported.edges[0].fromSide).toBe('right');
      expect(exported.edges[0].toSide).toBe('left');

      // Import into a new state
      const state2 = new CanvasState();
      state2.loadCanvasData(exported);

      expect(state2.nodes).toHaveLength(3);
      expect(state2.edges).toHaveLength(2);

      // Verify node data
      const loadedN1 = state2.getNodeById(n1.id);
      expect(loadedN1).toBeDefined();
      expect(loadedN1!.text).toBe('# Title');
      expect(loadedN1!.width).toBe(300);

      // Re-export should match
      const reexported = state2.exportCanvasData();
      expect(reexported.nodes).toHaveLength(3);
      expect(reexported.edges).toHaveLength(2);
    });

    it('handles empty data gracefully', () => {
      const state = new CanvasState();
      state.loadCanvasData({});
      expect(state.nodes).toHaveLength(0);
      expect(state.edges).toHaveLength(0);
    });

    it('preserves viewport of target state during load', () => {
      const state = new CanvasState();
      state.createNode('Test', 0, 0);
      const exported = state.exportCanvasData();

      // State2 has a custom viewport — should be preserved after load
      const state2 = new CanvasState();
      state2.pan(100, 200);
      state2.zoom(1.5, 400, 300);

      const vpBefore = state2.getViewport();
      state2.loadCanvasData(exported);

      expect(state2.offsetX).toBe(vpBefore.offsetX);
      expect(state2.offsetY).toBe(vpBefore.offsetY);
      expect(state2.scale).toBe(vpBefore.scale);
      // Data was loaded
      expect(state2.nodes).toHaveLength(1);
    });

    it('skips edges referencing missing nodes', () => {
      const state = new CanvasState();
      const n = state.createNode('Only', 0, 0);
      const exported = state.exportCanvasData();

      // Tamper: add edge to non-existent node
      exported.edges!.push({
        id: 'ghost',
        fromNode: n.id,
        toNode: 'nonexistent',
        fromSide: 'right',
        toSide: 'left',
      });

      const state2 = new CanvasState();
      state2.loadCanvasData(exported);
      expect(state2.edges).toHaveLength(0); // ghost edge skipped
    });
  });

  describe('Edge operations', () => {
    it('creates an edge between two nodes', () => {
      const state = new CanvasState();
      const a = state.createNode('A', 0, 0);
      const b = state.createNode('B', 100, 0);

      const edge = state.createEdge(a.id, b.id);
      expect(edge).not.toBeNull();
      expect(state.edges).toHaveLength(1);
      expect(state.edges[0].fromNode).toBe(a.id);
    });

    it('returns null for edge to non-existent node', () => {
      const state = new CanvasState();
      const a = state.createNode('A', 0, 0);
      expect(state.createEdge(a.id, 'nope')).toBeNull();
    });

    it('deletes an edge by ID', () => {
      const state = new CanvasState();
      const a = state.createNode('A', 0, 0);
      const b = state.createNode('B', 100, 0);
      const edge = state.createEdge(a.id, b.id)!;

      state.deleteEdge(edge.id);
      expect(state.edges).toHaveLength(0);
    });
  });

  describe('Highlight', () => {
    it('matches relative and absolute-style paths via fileAnchors', () => {
      const state = new CanvasState();
      const n = state.createNode('Semantic', 0, 0);
      n.semantic = { fileAnchors: ['packages/foo/src/bar.ts', 'src/index.js'] };

      state.setHighlight(['/home/u/proj/packages/foo/src/bar.ts']);
      expect(state.highlightNodeIds.has(n.id)).toBe(true);

      state.clearHighlight();
      expect(state.highlightNodeIds.size).toBe(0);

      state.setHighlight(['src/index.js']);
      expect(state.highlightNodeIds.has(n.id)).toBe(true);
    });

    it('matches by basename when needed', () => {
      const state = new CanvasState();
      const n = state.createNode('X', 0, 0);
      n.semantic = { fileAnchors: ['deep/nested/helpers.ts'] };
      state.setHighlight(['helpers.ts']);
      expect(state.highlightNodeIds.has(n.id)).toBe(true);
    });
  });
});

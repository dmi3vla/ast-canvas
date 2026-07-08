import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCanvas,
  safeParseCanvas,
  CanvasDocumentSchema,
  serializeDocument,
  stripRuntime,
  migrateLegacy,
} from '../src/canvas';

const FIXTURE_PATH = resolve(__dirname, '../../../cremniy_canvas.canvas');

describe('CanvasDocument schema', () => {
  describe('Golden test: cremniy_canvas.canvas', () => {
    it('parses successfully', () => {
      const raw = readFileSync(FIXTURE_PATH, 'utf-8');
      const doc = parseCanvas(raw);

      expect(doc.nodes.length).toBeGreaterThan(0);
      expect(doc.edges.length).toBeGreaterThan(0);

      // Verify a known node
      const titleNode = doc.nodes.find(n => n.id === 'title');
      expect(titleNode).toBeDefined();
      expect(titleNode!.type).toBe('text');
      expect(titleNode!.text).toContain('Cremniy IDE');
    });

    it('roundtrips through serialize/deserialize', () => {
      const raw = readFileSync(FIXTURE_PATH, 'utf-8');
      const doc = parseCanvas(raw);
      const serialized = serializeDocument(doc);

      // Re-parse
      const reparsed = parseCanvas(JSON.stringify(serialized));
      expect(reparsed.nodes.length).toBe(doc.nodes.length);
      expect(reparsed.edges.length).toBe(doc.edges.length);

      // Edge IDs preserved
      const edgeIds = doc.edges.map(e => e.id).sort();
      const reEdgeIds = reparsed.edges.map(e => e.id).sort();
      expect(reEdgeIds).toEqual(edgeIds);
    });
  });

  describe('Extensions roundtrip', () => {
    it('preserves semantic and graph extensions', () => {
      const doc = {
        nodes: [{
          id: 'n1',
          type: 'semantic' as const,
          x: 0, y: 0, width: 200, height: 100,
          text: 'Test node',
          semantic: {
            kind: 'architecture',
            summary: 'System overview',
            traceIds: ['t1', 't2'],
            fileAnchors: ['src/main.ts'],
          },
          graph: {
            path: 'src/main.ts',
            symbol: 'App',
            role: 'module' as const,
          },
        }],
        edges: [{
          id: 'e1',
          fromNode: 'n1',
          toNode: 'n2',
          kind: 'import' as const,
          label: 'uses',
        }, {
          id: 'e2',
          fromNode: 'n2',
          toNode: 'n1',
          fromSide: 'bottom' as const,
          toSide: 'top' as const,
        }],
      };

      const parsed = CanvasDocumentSchema.parse(doc);
      expect(parsed.nodes[0].semantic?.kind).toBe('architecture');
      expect(parsed.nodes[0].semantic?.traceIds).toEqual(['t1', 't2']);
      expect(parsed.nodes[0].graph?.role).toBe('module');
      expect(parsed.edges[0].kind).toBe('import');
      expect(parsed.edges[1].fromSide).toBe('bottom');
    });

    it('omits optional extensions gracefully', () => {
      const doc = {
        nodes: [{
          id: 'n1',
          type: 'text' as const,
          x: 0, y: 0, width: 100, height: 50,
          text: 'Plain node',
        }],
      };

      const parsed = CanvasDocumentSchema.parse(doc);
      expect(parsed.nodes[0].semantic).toBeUndefined();
      expect(parsed.nodes[0].graph).toBeUndefined();
      expect(parsed.nodes[0].color).toBeUndefined();
    });
  });

  describe('Validation errors', () => {
    it('rejects missing id', () => {
      const result = safeParseCanvas({
        nodes: [{ type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'no id' }],
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects negative dimensions', () => {
      const result = safeParseCanvas({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: -1, height: 50, text: 'bad' }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts empty nodes array', () => {
      const doc = parseCanvas({});
      expect(doc.nodes).toEqual([]);
      expect(doc.edges).toEqual([]);
    });

    it('accepts empty document JSON string', () => {
      const doc = parseCanvas('{}');
      expect(doc.nodes).toEqual([]);
    });
  });

  describe('stripRuntime', () => {
    it('removes runtime fields', () => {
      const node = {
        id: 'n1',
        type: 'text' as const,
        x: 0, y: 0, width: 100, height: 50,
        text: 'hello',
      };
      const stripped = stripRuntime(node);
      expect(stripped).toEqual({
        id: 'n1',
        type: 'text',
        x: 0, y: 0,
        width: 100, height: 50,
        text: 'hello',
      });
      // No runtime fields
      expect((stripped as any).isSelected).toBeUndefined();
      expect((stripped as any).semantic).toBeUndefined();
    });

    it('handles file nodes', () => {
      const node = {
        id: 'f1',
        type: 'file' as const,
        x: 0, y: 0, width: 300, height: 200,
        file: 'src/index.ts',
      };
      const stripped = stripRuntime(node);
      expect(stripped.file).toBe('src/index.ts');
      expect(stripped.text).toBeUndefined();
    });
  });

  describe('migrateLegacy', () => {
    it('passes valid data through', () => {
      const data = { nodes: [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'ok' }] };
      const result = migrateLegacy(data);
      expect(result.nodes.length).toBe(1);
    });
  });
});

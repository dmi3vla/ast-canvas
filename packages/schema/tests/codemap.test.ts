import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCodemap,
  safeParseCodemap,
  listTraces,
  flattenLocations,
  traceToContentSummary,
} from '../src/codemap';

const FIXTURE_PATH = resolve(__dirname, '../../../langgraph.codemap');

describe('Codemap schema', () => {
  describe('Golden test: langgraph.codemap', () => {
    it('parses successfully', () => {
      const raw = readFileSync(FIXTURE_PATH, 'utf-8');
      const codemap = parseCodemap(raw);

      expect(codemap.schemaVersion).toBe(1);
      expect(codemap.traces.length).toBe(6);
      expect(codemap.title).toContain('ast-grep');
    });

    it('has valid traces with locations', () => {
      const raw = readFileSync(FIXTURE_PATH, 'utf-8');
      const codemap = parseCodemap(raw);

      for (const trace of codemap.traces) {
        expect(trace.id).toBeTruthy();
        expect(trace.title).toBeTruthy();
        expect(trace.locations.length).toBeGreaterThan(0);

        for (const loc of trace.locations) {
          expect(loc.id).toBeTruthy();
          expect(loc.path).toBeTruthy();
          expect(loc.lineNumber).toBeGreaterThan(0);
        }
      }
    });

    it('first trace has 7 locations', () => {
      const raw = readFileSync(FIXTURE_PATH, 'utf-8');
      const codemap = parseCodemap(raw);
      expect(codemap.traces[0].locations).toHaveLength(7);
    });
  });

  describe('Optional fields (LLM-friendly)', () => {
    it('accepts location without lineContent/title/description', () => {
      const data = {
        schemaVersion: 1,
        id: 'test-id',
        stableId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        metadata: {
          cascadeId: 'x',
          generationSource: 'test',
          generationTimestamp: '2026-01-01',
          mode: 'TEST',
          originalPrompt: 'test',
        },
        title: 'Test',
        traces: [{
          id: '1',
          title: 'T',
          description: 'D',
          locations: [{
            id: '1a',
            path: '/test.ts',
            lineNumber: 1,
            // lineContent, title, description all optional — not provided
          }],
        }],
      };

      const codemap = parseCodemap(data);
      const loc = codemap.traces[0].locations[0];
      expect(loc.lineContent).toBeUndefined();
      expect(loc.title).toBeUndefined();
      expect(loc.description).toBeUndefined();
    });

    it('accepts minimal valid codemap', () => {
      const minimal = {
        schemaVersion: 1,
        id: 'm',
        stableId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        metadata: {
          cascadeId: 'x',
          generationSource: 'test',
          generationTimestamp: '2026-01-01',
          mode: 'TEST',
          originalPrompt: '',
        },
        title: 'Minimal',
        traces: [{
          id: '1',
          title: 'T1',
          description: 'D1',
          locations: [{ id: '1a', path: '/f.ts', lineNumber: 1 }],
        }],
      };
      expect(() => parseCodemap(minimal)).not.toThrow();
    });
  });

  describe('Helpers', () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf-8');
    const codemap = parseCodemap(raw);

    it('listTraces returns all traces with counts', () => {
      const list = listTraces(codemap);
      expect(list).toHaveLength(6);
      expect(list[0].locationCount).toBe(7);
    });

    it('flattenLocations returns all locations with trace info', () => {
      const flat = flattenLocations(codemap);
      expect(flat.length).toBeGreaterThan(6); // at least one per trace
      expect(flat[0].traceId).toBeTruthy();
      expect(flat[0].traceTitle).toBeTruthy();
    });

    it('traceToContentSummary returns structured data for RIGHT panel', () => {
      const trace = codemap.traces[0];
      const summary = traceToContentSummary(trace);
      expect(summary.title).toBe(trace.title);
      expect(summary.locations).toHaveLength(trace.locations.length);
      expect(summary.locations[0].path).toBeTruthy();
      expect(summary.locations[0].line).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('rejects missing traces', () => {
      const result = safeParseCodemap({
        schemaVersion: 1,
        id: 'x',
        stableId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        metadata: {
          cascadeId: 'x', generationSource: 't',
          generationTimestamp: '2026-01-01',
          mode: 'T', originalPrompt: '',
        },
        title: 'No traces',
        traces: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects trace with zero locations', () => {
      const result = safeParseCodemap({
        schemaVersion: 1,
        id: 'x',
        stableId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        metadata: {
          cascadeId: 'x', generationSource: 't',
          generationTimestamp: '2026-01-01',
          mode: 'T', originalPrompt: '',
        },
        title: 'Empty trace',
        traces: [{ id: '1', title: 'T', description: 'D', locations: [] }],
      });
      expect(result.success).toBe(false);
    });
  });
});

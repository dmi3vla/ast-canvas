import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildDepGraph } from '../src/depGraphBuilder';
import { indexWorkspace } from '../src/WorkspaceIndexer';
import { buildNodeCodemap, saveNodeCodemap, loadNodeCodemap } from '../src/CodemapBuilder';
import { parseCodemap } from '@infinity-canvas/schema';

const FIXTURES_DIR = join(__dirname, '../../../fixtures/mini-project');

describe('CodemapBuilder', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codemap-builder-'));
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('builds codemap with per-trace location ids 1a, 2a, 3a', async () => {
    const files = await indexWorkspace(FIXTURES_DIR);
    const g = await buildDepGraph(files, { workspaceRoot: FIXTURES_DIR });

    const cm = buildNodeCodemap(
      {
        id: 'n1',
        text: '## Entry\nindex',
        semantic: {
          fileAnchors: ['src/index.js'],
          summary: 'Entry module',
        },
      },
      g,
      FIXTURES_DIR,
    );

    expect(cm.traces.length).toBeGreaterThanOrEqual(1);
    // Location ids restart letter per trace
    for (const t of cm.traces) {
      expect(t.locations.length).toBeGreaterThanOrEqual(1);
      expect(t.locations[0].id).toBe(`${t.id}a`);
    }
    // Valid against Zod
    expect(() => parseCodemap(cm)).not.toThrow();
  });

  it('always has ≥1 location (parseCodemap safe)', () => {
    const g = { nodes: {}, edges: [] };
    const cm = buildNodeCodemap({ id: 'empty' }, g, tmpDir);
    expect(cm.traces[0].locations.length).toBeGreaterThanOrEqual(1);
    expect(() => parseCodemap(cm)).not.toThrow();
  });

  it('save and load roundtrip', async () => {
    const g = { nodes: {}, edges: [] };
    const cm = buildNodeCodemap(
      { id: 'x1', text: 'Test', semantic: { fileAnchors: ['a.ts'] } },
      g,
      tmpDir,
    );
    await saveNodeCodemap(tmpDir, 'x1', cm);
    expect(existsSync(join(tmpDir, '.infinity-canvas', 'codemaps', 'x1.codemap'))).toBe(true);

    const loaded = await loadNodeCodemap(tmpDir, 'x1');
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe(cm.title);
    expect(loaded!.traces.length).toBe(cm.traces.length);
  });

  it('writes valid JSON file', async () => {
    const files = await indexWorkspace(FIXTURES_DIR);
    const g = await buildDepGraph(files, { workspaceRoot: FIXTURES_DIR });
    const cm = buildNodeCodemap(
      { id: 'entry', semantic: { fileAnchors: ['src/index.js', 'src/config.js'] } },
      g,
      tmpDir,
    );
    await saveNodeCodemap(tmpDir, 'entry', cm);
    const raw = readFileSync(join(tmpDir, '.infinity-canvas', 'codemaps', 'entry.codemap'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.traces.length).toBeGreaterThan(0);
  });
});

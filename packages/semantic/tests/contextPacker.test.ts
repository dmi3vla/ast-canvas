import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { contextPacker } from '../src/contextPacker';
import { indexWorkspace } from '@infinity-canvas/ast-graph';

const FIXTURES_DIR = resolve(__dirname, '../../../fixtures/mini-project');

describe('ContextPacker', () => {
  it('packs mini-project within budget', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    expect(files.length).toBeGreaterThanOrEqual(3);

    const pack = await contextPacker(files, async (path) => readFile(path, 'utf-8'), {
      budgetChars: 80_000,
    });

    // Tree
    expect(pack.tree).toContain('📄');
    expect(pack.tree.length).toBeGreaterThan(0);

    // Manifests (package.json, README.md)
    expect(pack.manifests.length).toBeGreaterThanOrEqual(1);
    expect(pack.manifests.some(m => m.path.includes('package.json'))).toBe(true);

    // Samples
    expect(pack.samples.length).toBeGreaterThanOrEqual(1);

    // Stats
    expect(pack.stats.totalChars).toBeLessThanOrEqual(pack.stats.budgetChars + 5000); // tolerance
    expect(pack.stats.fileCount).toBeGreaterThanOrEqual(3);
  });

  it('respects hard budget', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });

    const pack = await contextPacker(files, async (path) => readFile(path, 'utf-8'), {
      budgetChars: 500, // very small
    });

    expect(pack.stats.totalChars).toBeLessThanOrEqual(2000); // some tolerance for manifest loading
    expect(pack.manifests.length).toBeGreaterThan(0); // manifests always loaded
  });

  it('prioritizes README and package.json', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });

    const pack = await contextPacker(files, async (path) => readFile(path, 'utf-8'));

    const manifestPaths = pack.manifests.map(m => m.path);
    expect(manifestPaths.some(p => p.includes('README'))).toBe(true);
    expect(manifestPaths.some(p => p.includes('package.json'))).toBe(true);
  });

  it('handles empty file list gracefully', async () => {
    const pack = await contextPacker([], async () => '', {});
    expect(pack.tree).toBe('.');
    expect(pack.manifests).toEqual([]);
    expect(pack.samples).toEqual([]);
    expect(pack.stats.totalChars).toBe(0);
  });

  it('stats are accurate', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js'] });
    const pack = await contextPacker(files, async (path) => readFile(path, 'utf-8'), {
      budgetChars: 10_000,
      maxSampleFiles: 5,
    });

    expect(pack.stats.fileCount).toBe(files.length);
    expect(pack.stats.totalChars).toBeGreaterThan(0);
    expect(pack.samples.length).toBeLessThanOrEqual(5);
  });
});

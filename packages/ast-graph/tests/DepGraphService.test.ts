import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DepGraphService } from '../src/DepGraphService';

const FIXTURES_DIR = join(__dirname, '../../../fixtures/mini-project');

describe('DepGraphService', () => {
  let tmpDir: string;
  let service: DepGraphService;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'depgraph-test-'));
    service = new DepGraphService();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('builds graph from fixtures', async () => {
    const g = await service.getGraph(FIXTURES_DIR, { maxFiles: 50 });
    expect(Object.keys(g.nodes).length).toBeGreaterThanOrEqual(3);
    expect(g.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('second getGraph returns cached (memory)', async () => {
    const g1 = await service.getGraph(FIXTURES_DIR, { maxFiles: 50 });
    const g2 = await service.getGraph(FIXTURES_DIR);
    // Same graph instance (memory cache)
    expect(g1).toBe(g2);
  });

  it('writes disk cache', async () => {
    await service.getGraph(FIXTURES_DIR, { maxFiles: 50 });
    // Disk cache written after build
    expect(existsSync(join(FIXTURES_DIR, '.infinity-canvas', 'dep-graph.json'))).toBe(true);
  });

  it('getEgo returns center and edges', async () => {
    const ego = await service.getEgo(FIXTURES_DIR, ['src/index.js'], 1);
    expect(ego).not.toBeNull();
    expect(ego!.center).toBeTruthy();
    expect(ego!.nodes.size).toBeGreaterThan(0);
    expect(ego!.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('getEgo depth 0 returns only center', async () => {
    const ego = await service.getEgo(FIXTURES_DIR, ['src/index.js'], 0);
    expect(ego).not.toBeNull();
    expect(ego!.nodes.size).toBe(1);
    expect(ego!.edges).toHaveLength(0);
  });

  it('invalidate forces rebuild', async () => {
    const g1 = await service.getGraph(FIXTURES_DIR, { maxFiles: 50 });
    service.invalidate(FIXTURES_DIR);
    const g2 = await service.getGraph(FIXTURES_DIR, { maxFiles: 50 });
    // Different instance after invalidate
    expect(g1).not.toBe(g2);
    expect(Object.keys(g2.nodes).length).toBeGreaterThanOrEqual(3);
  });

  it('returns null ego for unknown center', async () => {
    const ego = await service.getEgo(FIXTURES_DIR, ['nonexistent/file.ts']);
    expect(ego).toBeNull();
  });

  it('handles empty workspace gracefully', async () => {
    const g = await service.getGraph(tmpDir, { maxFiles: 50 });
    expect(Object.keys(g.nodes)).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });
});

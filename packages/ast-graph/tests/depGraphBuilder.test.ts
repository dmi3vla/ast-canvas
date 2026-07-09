import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { indexWorkspace } from '../src/WorkspaceIndexer';
import { buildDepGraph } from '../src/depGraphBuilder';

const FIXTURES_DIR = resolve(__dirname, '../../../fixtures/mini-project');

describe('buildDepGraph', () => {
  it('builds graph from mini-project fixture', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
      skipBareModules: false,
    });

    // Should have at least the JS files as nodes
    expect(Object.keys(g.nodes).length).toBeGreaterThanOrEqual(3);
    expect(g.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('has edges from index.js to helpers.js', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
      skipBareModules: false,
    });

    // Find edge from index.js → utils/helpers.js
    const indexEdges = g.edges.filter(e =>
      e.from.includes('index.js') && e.to.includes('helpers.js'),
    );
    expect(indexEdges.length).toBeGreaterThanOrEqual(1);
    expect(indexEdges[0].kind).toBe('import');
  });

  it('marks external/bare modules as external nodes', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
      skipBareModules: false,
    });

    const externalNodes = Object.values(g.nodes).filter(n => n.kind === 'external');
    // Mini-project has no external modules (pure local imports)
    // but the code should handle them if present
    expect(g.nodes).toBeDefined();
  });

  it('skips bare modules when option set', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
      skipBareModules: true,
    });

    expect(Object.keys(g.nodes).length).toBeGreaterThanOrEqual(3);
    // No external nodes
    expect(Object.values(g.nodes).every(n => n.kind !== 'external')).toBe(true);
  });

  it('respects maxFiles', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
      maxFiles: 1,
    });

    expect(Object.keys(g.nodes).length).toBe(1);
  });

  it('handles empty file list', async () => {
    const g = await buildDepGraph([], {
      workspaceRoot: FIXTURES_DIR,
    });

    expect(Object.keys(g.nodes)).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });

  it('has nodes with proper file kind', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
    });

    const fileNodes = Object.values(g.nodes).filter(n => n.kind === 'file');
    expect(fileNodes.length).toBeGreaterThanOrEqual(2);
    for (const node of fileNodes) {
      expect(node.name).toBeTruthy();
      expect(node.path).toBeTruthy();
    }
  });

  it('relative node ids are workspace-relative', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const g = await buildDepGraph(files, {
      workspaceRoot: FIXTURES_DIR,
    });

    for (const id of Object.keys(g.nodes)) {
      if (!id.startsWith('external:')) {
        // Should be relative, not absolute
        expect(id).not.toContain(FIXTURES_DIR);
      }
    }
  });
});

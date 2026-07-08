import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SessionStore } from '../src/SessionStore';
import { createDefaultSession } from '../src/types';

describe('SessionStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'infinity-canvas-session-test-'));
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates with default session', () => {
    const store = new SessionStore();
    const session = store.get();

    expect(session.workspaceRoot).toBeNull();
    expect(session.semanticMap).toBeNull();
    expect(session.ui.rightMode).toBe('empty');
    expect(session.ui.leftRatio).toBe(0.6);
    expect(session.ui.selectedNodeId).toBeNull();
  });

  it('patches session values', () => {
    const store = new SessionStore();

    store.patchUI({ rightMode: 'content', selectedNodeId: 'node-1' });

    expect(store.get().ui.rightMode).toBe('content');
    expect(store.get().ui.selectedNodeId).toBe('node-1');
    // unchanged
    expect(store.get().ui.leftRatio).toBe(0.6);
  });

  it('saves and loads from workspace', async () => {
    const store = new SessionStore();

    store.patchUI({ rightMode: 'codemap', selectedNodeId: 'node-2', leftRatio: 0.55 });
    store.patch({ workspaceRoot: tmpDir, cacheKey: 'test-key-123' });

    // Set a minimal semantic map
    store.patch({
      semanticMap: {
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Hello' }],
        edges: [],
      },
    });

    await store.saveToWorkspace(tmpDir);

    // Verify cache dir created
    const cacheDir = join(tmpDir, '.infinity-canvas');
    expect(existsSync(cacheDir)).toBe(true);
    expect(existsSync(join(cacheDir, 'session.json'))).toBe(true);
    expect(existsSync(join(cacheDir, 'semantic-map.canvas'))).toBe(true);

    // Load into new store
    const store2 = new SessionStore();
    const loaded = await store2.loadFromWorkspace(tmpDir);

    expect(loaded).toBe(true);
    expect(store2.get().ui.rightMode).toBe('codemap');
    expect(store2.get().ui.selectedNodeId).toBe('node-2');
    expect(store2.get().ui.leftRatio).toBe(0.55);
    expect(store2.get().cacheKey).toBe('test-key-123');
    expect(store2.get().semanticMap).not.toBeNull();
    expect(store2.get().semanticMap!.nodes).toHaveLength(1);
    expect(store2.get().semanticMap!.nodes[0].text).toBe('Hello');
  });

  it('preserves semantic map node ids on roundtrip', async () => {
    const store = new SessionStore();
    store.patch({
      semanticMap: {
        nodes: [
          { id: 'abc-123', type: 'text', x: 10, y: 20, width: 200, height: 100, text: 'Node A' },
          { id: 'def-456', type: 'text', x: 300, y: 40, width: 150, height: 80, text: 'Node B' },
        ],
        edges: [{ id: 'e1', fromNode: 'abc-123', toNode: 'def-456' }],
      },
    });

    await store.saveToWorkspace(tmpDir);

    const store2 = new SessionStore();
    await store2.loadFromWorkspace(tmpDir);

    expect(store2.get().semanticMap).not.toBeNull();
    const nodes = store2.get().semanticMap!.nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes.map(n => n.id).sort()).toEqual(['abc-123', 'def-456']);
  });

  it('returns false loading from non-existent workspace', async () => {
    const store = new SessionStore();
    const loaded = await store.loadFromWorkspace('/nonexistent/path');
    expect(loaded).toBe(false);
  });

  it('handles missing semantic map gracefully', async () => {
    const store = new SessionStore();
    store.patchUI({ rightMode: 'content' });
    // Set a semantic map so it gets saved
    store.patch({
      semanticMap: {
        nodes: [{ id: 'x', type: 'text', x: 0, y: 0, width: 50, height: 30, text: 'X' }],
        edges: [],
      },
    });

    await store.saveToWorkspace(tmpDir);

    // Delete the semantic map file to simulate missing
    rmSync(join(tmpDir, '.infinity-canvas', 'semantic-map.canvas'));

    const store2 = new SessionStore();
    const loaded = await store2.loadFromWorkspace(tmpDir);
    expect(loaded).toBe(true);
    expect(store2.get().semanticMap).toBeNull();
    expect(store2.get().ui.rightMode).toBe('content');
  });

  it('default session has consistent structure', () => {
    const def = createDefaultSession();
    const store = new SessionStore();
    const stored = store.get();

    // All keys present
    expect(stored.workspaceRoot).toBeNull();
    expect(stored.semanticMap).toBeNull();
    expect(stored.codemaps).toEqual({});
    expect(stored.depGraph).toBeNull();
    expect(stored.fileIndex).toBeNull();
    expect(stored.cacheKey).toBeNull();
    expect(stored.ui.selectedNodeId).toBeNull();
    expect(stored.ui.rightMode).toBe('empty');
    expect(stored.ui.leftRatio).toBe(0.6);
    expect(stored.ui.source).toBeUndefined();
  });
});

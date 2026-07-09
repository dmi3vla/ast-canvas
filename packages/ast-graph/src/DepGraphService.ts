import type { DepGraph, DepNode, DepEdge } from '@infinity-canvas/schema';
import { createDepGraph } from '@infinity-canvas/schema';
import { indexWorkspace } from './WorkspaceIndexer';
import { buildDepGraph } from './depGraphBuilder';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────

interface CacheEntry {
  graph: DepGraph;
  builtAt: number;
  fileCount: number;
  fingerprint: string;
}

interface DiskCacheData {
  version: 1;
  builtAt: number;
  fileCount: number;
  fingerprint: string;
  nodes: Record<string, DepNode>;
  edges: DepEdge[];
}

const CACHE_DIR = '.infinity-canvas';
const CACHE_FILE = 'dep-graph.json';

// ── Fingerprint ────────────────────────────────────────

function computeFingerprint(files: { relativePath: string; mtime: string }[]): string {
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  // Simple hash: fileCount + max mtime
  let maxMtime = '';
  for (const f of sorted) {
    if (f.mtime > maxMtime) maxMtime = f.mtime;
  }
  return `${sorted.length}:${maxMtime}`;
}

// ── Service ────────────────────────────────────────────

export class DepGraphService {
  private cache = new Map<string, CacheEntry>();
  private building = new Map<string, Promise<DepGraph>>();

  /**
   * Get or build dep graph for workspace.
   * Uses memory cache then disk cache, rebuilds if stale.
   */
  async getGraph(workspaceRoot: string, options?: { force?: boolean; maxFiles?: number }): Promise<DepGraph> {
    // Memory cache hit (not forced)
    if (!options?.force) {
      const mem = this.cache.get(workspaceRoot);
      if (mem) return mem.graph;
    }

    // Avoid concurrent builds for same root
    const pending = this.building.get(workspaceRoot);
    if (pending) return pending;

    const build = this.doBuild(workspaceRoot, options);
    this.building.set(workspaceRoot, build);

    try {
      return await build;
    } finally {
      this.building.delete(workspaceRoot);
    }
  }

  /** Invalidate memory + disk cache for a workspace */
  invalidate(workspaceRoot: string): void {
    this.cache.delete(workspaceRoot);
    // Delete stale disk cache so next getGraph rebuilds
    const cachePath = join(workspaceRoot, CACHE_DIR, CACHE_FILE);
    void unlink(cachePath).catch(() => { /* file may not exist */ });
  }

  /**
   * Ego network for one or more anchors (depth 1 = union of each center's ego).
   * `center` is the first matched anchor id (primary).
   */
  async getEgo(
    workspaceRoot: string,
    centerPaths: string[],
    depth = 1,
  ): Promise<{ nodes: Set<string>; edges: DepEdge[]; center: string } | null> {
    const g = await this.getGraph(workspaceRoot);
    const { egoNetwork } = await import('@infinity-canvas/schema');

    const matched: string[] = [];
    for (const cp of centerPaths) {
      let candidate = cp;
      if (!g.nodes[candidate]) {
        candidate = Object.keys(g.nodes).find(id =>
          id.endsWith(cp) || cp.endsWith(id),
        ) || '';
      }
      if (candidate && g.nodes[candidate] && !matched.includes(candidate)) {
        matched.push(candidate);
      }
    }

    if (matched.length === 0) return null;

    const nodes = new Set<string>();
    const edgeMap = new Map<string, DepEdge>();
    for (const id of matched) {
      const ego = egoNetwork(g, id, depth);
      for (const n of ego.nodes) nodes.add(n);
      for (const e of ego.edges) {
        const key = `${e.from}->${e.to}:${e.kind}`;
        edgeMap.set(key, e);
      }
    }

    return {
      nodes,
      edges: [...edgeMap.values()],
      center: matched[0],
    };
  }

  // ── Internal ────────────────────────────────────────

  private async doBuild(
    workspaceRoot: string,
    options?: { force?: boolean; maxFiles?: number },
  ): Promise<DepGraph> {
    // Quick index for fingerprint (skip if forced)
    const files = !options?.force ? await indexWorkspace(workspaceRoot) : null;
    const fp = files ? computeFingerprint(files) : '';

    // Try disk cache with freshness check
    if (!options?.force && files) {
      const disk = await this.loadDiskCache(workspaceRoot);
      if (disk && disk.fingerprint === fp && disk.fileCount === files.length) {
        const g: DepGraph = { nodes: disk.nodes, edges: disk.edges };
        this.cache.set(workspaceRoot, { graph: g, builtAt: disk.builtAt, fileCount: disk.fileCount, fingerprint: fp });
        return g;
      }
    }

    // Full build
    const allFiles = files || await indexWorkspace(workspaceRoot);
    const g = await buildDepGraph(allFiles, {
      workspaceRoot,
      skipBareModules: false,
      maxFiles: options?.maxFiles ?? 0,
    });

    // Save to disk + memory
    const finalFp = computeFingerprint(allFiles);
    const entry = { graph: g, builtAt: Date.now(), fileCount: allFiles.length, fingerprint: finalFp };
    this.cache.set(workspaceRoot, entry);
    await this.saveDiskCache(workspaceRoot, g, allFiles.length, finalFp);

    return g;
  }

  private async loadDiskCache(workspaceRoot: string): Promise<DiskCacheData | null> {
    const cachePath = join(workspaceRoot, CACHE_DIR, CACHE_FILE);
    if (!existsSync(cachePath)) return null;

    try {
      const raw = await readFile(cachePath, 'utf-8');
      const data: DiskCacheData = JSON.parse(raw);
      if (data.version !== 1) return null;
      return data;
    } catch {
      return null;
    }
  }

  private async saveDiskCache(workspaceRoot: string, g: DepGraph, fileCount: number, fingerprint: string): Promise<void> {
    const dir = join(workspaceRoot, CACHE_DIR);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const data: DiskCacheData = {
      version: 1,
      builtAt: Date.now(),
      fileCount,
      fingerprint,
      nodes: g.nodes,
      edges: g.edges,
    };

    await writeFile(join(dir, CACHE_FILE), JSON.stringify(data), 'utf-8');
  }
}

/** Singleton */
export const depGraphService = new DepGraphService();

import type { Codemap, Trace, Location, DepGraph } from '@infinity-canvas/schema';
import { join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const CACHE_DIR = '.infinity-canvas';
const CODEMAPS_DIR = 'codemaps';

/** Inline node subset — avoids circular dep on canvas-core */
export interface NodeInfo {
  id: string;
  text?: string;
  semantic?: { kind?: string; summary?: string; traceIds?: string[]; fileAnchors?: string[] };
}

function locId(traceId: string, index: number): string {
  // 1a, 1b, … 1z, 1aa (simple: a–z only, cap 26)
  const letter = String.fromCharCode(97 + Math.min(index, 25));
  return `${traceId}${letter}`;
}

function resolveCenterIds(depGraph: DepGraph, anchors: string[]): string[] {
  const matched: string[] = [];
  for (const a of anchors) {
    let candidate = a;
    if (!depGraph.nodes[candidate]) {
      candidate = Object.keys(depGraph.nodes).find(id =>
        id.endsWith(a) || a.endsWith(id),
      ) || '';
    }
    if (candidate && depGraph.nodes[candidate] && !matched.includes(candidate)) {
      matched.push(candidate);
    }
  }
  return matched;
}

/** Build a structural codemap from a semantic node + dep graph */
export function buildNodeCodemap(
  node: NodeInfo,
  depGraph: DepGraph,
  _workspaceRoot: string,
): Codemap {
  const anchors = node.semantic?.fileAnchors || [];
  const traces: Trace[] = [];
  const centers = resolveCenterIds(depGraph, anchors);

  // Trace 1: Depends on (outgoing from any center)
  if (centers.length > 0) {
    const depsOut = depGraph.edges.filter(e => centers.includes(e.from));
    if (depsOut.length > 0) {
      const locs: Location[] = depsOut.slice(0, 20).map((e, i) => ({
        id: locId('1', i),
        path: e.to.startsWith('external:') ? e.to.replace('external:', '') : e.to,
        lineNumber: e.loc?.line || 1,
        title: e.to,
        description: `${e.kind} dependency`,
      }));
      traces.push({
        id: '1',
        title: 'Depends on',
        description: `${depsOut.length} outgoing dependencies`,
        locations: locs,
      });
    }

    // Trace 2: Used by (incoming)
    const depsIn = depGraph.edges.filter(e => centers.includes(e.to));
    if (depsIn.length > 0) {
      const locs: Location[] = depsIn.slice(0, 20).map((e, i) => ({
        id: locId('2', i),
        path: e.from,
        lineNumber: e.loc?.line || 1,
        title: e.from,
        description: `${e.kind} dependent`,
      }));
      traces.push({
        id: '2',
        title: 'Used by',
        description: `${depsIn.length} incoming dependents`,
        locations: locs,
      });
    }
  }

  // Trace 3: File anchors from semantic node
  if (anchors.length > 0) {
    traces.push({
      id: '3',
      title: 'File anchors',
      description: `${anchors.length} anchored files`,
      locations: anchors.map((a, i) => ({
        id: locId('3', i),
        path: a,
        lineNumber: 1,
        title: a,
        description: 'Semantic file anchor',
      })),
    });
  }

  const now = new Date().toISOString();
  const title = node.text?.split('\n')[0]?.replace(/^#+\s*/, '') || node.id;

  // parseCodemap requires locations.min(1) — never empty locations
  if (traces.length === 0) {
    traces.push({
      id: '1',
      title: 'No structural data',
      description: 'No dependencies or anchors for this node',
      locations: [{
        id: '1a',
        path: node.id,
        lineNumber: 1,
        title: node.id,
        description: 'Placeholder — open workspace with file anchors',
      }],
    });
  }

  return {
    schemaVersion: 1,
    id: `node-${node.id}___${now}`,
    stableId: node.id,
    metadata: {
      cascadeId: node.id,
      generationSource: 'structural',
      generationTimestamp: now,
      mode: 'AUTO',
      originalPrompt: `depgraph for ${node.id}`,
    },
    title,
    traces,
  };
}

/** Safe filename from node id */
function safeNodeId(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Save codemap to cache */
export async function saveNodeCodemap(
  workspaceRoot: string,
  nodeId: string,
  codemap: Codemap,
): Promise<void> {
  const dir = join(workspaceRoot, CACHE_DIR, CODEMAPS_DIR);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const path = join(dir, `${safeNodeId(nodeId)}.codemap`);
  await writeFile(path, JSON.stringify(codemap, null, 2), 'utf-8');
}

/** Load codemap from cache — returns null if not found */
export async function loadNodeCodemap(
  workspaceRoot: string,
  nodeId: string,
): Promise<Codemap | null> {
  const path = join(workspaceRoot, CACHE_DIR, CODEMAPS_DIR, `${safeNodeId(nodeId)}.codemap`);
  if (!existsSync(path)) return null;

  try {
    const raw = await readFile(path, 'utf-8');
    const { parseCodemap } = await import('@infinity-canvas/schema');
    return parseCodemap(raw);
  } catch {
    return null;
  }
}

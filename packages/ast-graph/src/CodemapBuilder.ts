import type { Codemap, Trace, Location, DepGraph } from '@infinity-canvas/schema';
import { join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const CACHE_DIR = '.infinity-canvas';
const CODEMAPS_DIR = 'codemaps';

/** Inline ICNode subset — avoids circular dep on canvas-core */
interface NodeInfo {
  id: string;
  text?: string;
  semantic?: { kind?: string; summary?: string; traceIds?: string[]; fileAnchors?: string[] };
}

/** Build a structural codemap from a semantic node + dep graph */
export function buildNodeCodemap(
  node: NodeInfo,
  depGraph: DepGraph,
  _workspaceRoot: string,
): Codemap {
  const anchors = node.semantic?.fileAnchors || [];
  const traces: Trace[] = [];
  let locCounter = 0;

  // Find center in graph
  const centerId = anchors.length > 0
    ? Object.keys(depGraph.nodes).find(id => anchors.some((a: string) => id.endsWith(a) || a.endsWith(id))) || ''
    : '';

  // Trace 1: Depends on (outgoing)
  if (centerId) {
    const depsOut = depGraph.edges.filter(e => e.from === centerId);
    if (depsOut.length > 0) {
      const locs: Location[] = depsOut.map(e => ({
        id: `1${String.fromCharCode(97 + locCounter++)}`,
        path: e.to.startsWith('external:') ? e.to.replace('external:', '') : e.to,
        lineNumber: e.loc?.line || 1,
        title: e.to,
        description: `${e.kind} dependency`,
      }));
      traces.push({
        id: '1',
        title: 'Depends on',
        description: `${depsOut.length} outgoing dependencies`,
        locations: locs.slice(0, 20),
      });
    }

    // Trace 2: Used by (incoming)
    const depsIn = depGraph.edges.filter(e => e.to === centerId);
    if (depsIn.length > 0) {
      const locs: Location[] = depsIn.map(e => ({
        id: `2${String.fromCharCode(97 + locCounter++)}`,
        path: e.from,
        lineNumber: e.loc?.line || 1,
        title: e.from,
        description: `${e.kind} dependent`,
      }));
      traces.push({
        id: '2',
        title: 'Used by',
        description: `${depsIn.length} incoming dependents`,
        locations: locs.slice(0, 20),
      });
    }
  }

  // Trace 3: File anchors from semantic node
  if (anchors.length > 0) {
    traces.push({
      id: '3',
      title: 'File anchors',
      description: `${anchors.length} anchored files`,
      locations: anchors.map((a: string, i: number) => ({
        id: `3${String.fromCharCode(97 + i)}`,
        path: a,
        lineNumber: 1,
        title: a,
      })),
    });
  }

  const now = new Date().toISOString();
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
    title: node.text?.split('\n')[0]?.replace(/^#+\s*/, '') || node.id,
    traces: traces.length > 0 ? traces : [{
      id: '1',
      title: 'No structural data',
      description: 'No dependencies found for this node',
      locations: [],
    }],
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

import type { RightMode } from '@infinity-canvas/detail-pane';
import type { CanvasDocument, Codemap } from '@infinity-canvas/schema';
import type { FileMeta } from '@infinity-canvas/ast-graph';

/** Complete session state */
export interface Session {
  /** Workspace root path */
  workspaceRoot: string | null;

  /** Semantic map — the main canvas document (LEFT) */
  semanticMap: CanvasDocument | null;

  /** Per-node codemaps (keyed by nodeId from semanticMap) */
  codemaps: Record<string, Codemap>;

  /** Dependency graph */
  depGraph: any | null; // DepGraph from schema — use any to avoid circular dep

  /** File index from WorkspaceIndexer (optional cache) */
  fileIndex: FileMeta[] | null;

  /** Cache key — placeholder for content hash */
  cacheKey: string | null;

  /** UI state (split, selection, mode) */
  ui: {
    selectedNodeId: string | null;
    rightMode: RightMode;
    leftRatio: number;
    source?: { path: string; line: number };
  };
}

/** Default session */
export function createDefaultSession(): Session {
  return {
    workspaceRoot: null,
    semanticMap: null,
    codemaps: {},
    depGraph: null,
    fileIndex: null,
    cacheKey: null,
    ui: {
      selectedNodeId: null,
      rightMode: 'empty',
      leftRatio: 0.6,
    },
  };
}

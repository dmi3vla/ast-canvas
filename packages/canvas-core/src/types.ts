// ── Canvas Document Types (Obsidian .canvas format + extensions) ──
// Runtime types for canvas-core. Canonical validation: @infinity-canvas/schema.

/** Side of a node where an edge attaches */
export type NodeSide = 'top' | 'bottom' | 'left' | 'right';

/** Node type in Obsidian canvas format */
export type NodeType = 'text' | 'file' | 'semantic' | 'group';

export interface SemanticExt {
  kind?: string;
  summary?: string;
  traceIds?: string[];
  fileAnchors?: string[];
}

export interface GraphExt {
  path?: string;
  symbol?: string;
  role?: string;
}

/** A single node on the canvas */
export interface ICNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  semantic?: SemanticExt;
  graph?: GraphExt;
  // runtime state (not serialized to .canvas)
  isSelected: boolean;
}

/** An edge connecting two nodes */
export interface ICEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: NodeSide;
  toSide?: NodeSide;
  label?: string;
  kind?: 'semantic' | 'import' | 'call' | 'inherit' | 'derives';
}

/** The full canvas document (Obsidian .canvas JSON) */
export interface CanvasDocument {
  nodes: ICNode[];
  edges: ICEdge[];
}

/** Serialized node format (Obsidian-compatible + extensions) */
export interface SerializedNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  semantic?: SemanticExt;
  graph?: GraphExt;
}

/** Serialized edge format (Obsidian-compatible) */
export interface SerializedEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
  kind?: string;
}

/** Viewport state */
export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

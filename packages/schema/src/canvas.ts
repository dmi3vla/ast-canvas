import { z } from 'zod';

// ── Obsidian Canvas Document — Zod Schemas ─────────────

/** Valid node types */
export const NodeTypeSchema = z.enum(['text', 'file', 'semantic', 'group']);

/** Valid edge sides */
export const NodeSideSchema = z.enum(['top', 'bottom', 'left', 'right']);

/** Valid edge kinds (our extensions) */
export const EdgeKindSchema = z.enum(['semantic', 'import', 'call', 'inherit', 'derives']);

// ── Node ───────────────────────────────────────────────

/** Semantic extension on a node */
export const SemanticExtSchema = z.object({
  kind: z.string().optional(),
  summary: z.string().optional(),
  traceIds: z.array(z.string()).optional(),
  fileAnchors: z.array(z.string()).optional(),
}).optional();

/** Graph extension (AST symbol info) */
export const GraphExtSchema = z.object({
  path: z.string().optional(),
  symbol: z.string().optional(),
  role: z.enum(['module', 'fn', 'class']).optional(),
}).optional();

/** A single node on the canvas */
export const ICNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().optional(),

  // Content (at least one of text/file expected, but LLM may omit)
  text: z.string().optional(),
  file: z.string().optional(),

  // Extensions (not in standard Obsidian format)
  semantic: SemanticExtSchema,
  graph: GraphExtSchema,
});

// ── Edge ───────────────────────────────────────────────

export const ICEdgeSchema = z.object({
  id: z.string().min(1),
  fromNode: z.string().min(1),
  toNode: z.string().min(1),
  fromSide: NodeSideSchema.optional(),
  toSide: NodeSideSchema.optional(),
  label: z.string().optional(),
  kind: EdgeKindSchema.optional(),
});

// ── Canvas Document ────────────────────────────────────

export const CanvasDocumentSchema = z.object({
  nodes: z.array(ICNodeSchema).default([]),
  edges: z.array(ICEdgeSchema).default([]),
});

// ── Inferred Types ─────────────────────────────────────

export type ICNode = z.infer<typeof ICNodeSchema>;
export type ICEdge = z.infer<typeof ICEdgeSchema>;
export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type NodeSide = z.infer<typeof NodeSideSchema>;
export type EdgeKind = z.infer<typeof EdgeKindSchema>;
export type SemanticExt = z.infer<typeof SemanticExtSchema>;
export type GraphExt = z.infer<typeof GraphExtSchema>;

// ── Parse / Validate ───────────────────────────────────

/** Parse and validate canvas JSON. Returns parsed document or throws. */
export function parseCanvas(json: string | unknown): CanvasDocument {
  if (typeof json === 'string') {
    return CanvasDocumentSchema.parse(JSON.parse(json));
  }
  return CanvasDocumentSchema.parse(json);
}

/** Safe parse — returns result object (never throws) */
export function safeParseCanvas(json: string | unknown): { success: true; data: CanvasDocument } | { success: false; error: string } {
  try {
    const data = parseCanvas(json);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Migrate ─────────────────────────────────

/** Migrate legacy canvas formats to current schema (noop for now) */
export function migrateLegacy(data: unknown): CanvasDocument {
  return CanvasDocumentSchema.parse(data);
}

// ── Serialize (strip runtime fields) ───────────────────

/** Serialized node — only what goes into .canvas JSON */
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
}

/** Serialized edge */
export interface SerializedEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
  kind?: string;
}

/** Strip runtime fields (isSelected etc.) for .canvas export */
export function stripRuntime(node: ICNode): SerializedNode {
  const out: SerializedNode = {
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  if (node.color) out.color = node.color;
  if (node.type === 'file' && node.file) out.file = node.file;
  else if (node.text) out.text = node.text;
  return out;
}

/** Serialize full document for .canvas export */
export function serializeDocument(doc: CanvasDocument): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  return {
    nodes: doc.nodes.map(stripRuntime),
    edges: doc.edges.map(e => ({
      id: e.id,
      fromNode: e.fromNode,
      toNode: e.toNode,
      fromSide: e.fromSide,
      toSide: e.toSide,
      label: e.label,
      kind: e.kind,
    })),
  };
}

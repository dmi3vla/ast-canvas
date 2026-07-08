// @infinity-canvas/schema
// Zod schemas + TypeScript types for:
// - CanvasDocument (Obsidian .canvas + extensions)
// - Codemap (langgraph.codemap format)
// - DepGraph (dependency graph model)

export {
  CanvasDocumentSchema,
  ICNodeSchema,
  ICEdgeSchema,
  NodeTypeSchema,
  NodeSideSchema,
  EdgeKindSchema,
  SemanticExtSchema,
  GraphExtSchema,
  parseCanvas,
  safeParseCanvas,
  migrateLegacy,
  serializeDocument,
  stripRuntime,
} from './canvas';

export type {
  ICNode,
  ICEdge,
  CanvasDocument,
  NodeType,
  NodeSide,
  EdgeKind,
  SemanticExt,
  GraphExt,
  SerializedNode,
  SerializedEdge,
} from './canvas';

// ── Codemap ────────────────────────────────────────────

export {
  LocationSchema,
  TraceSchema,
  CodemapMetadataSchema,
  CodemapSchema,
  parseCodemap,
  safeParseCodemap,
  listTraces,
  flattenLocations,
  traceToContentSummary,
} from './codemap';

export type {
  Location,
  Trace,
  CodemapMetadata,
  Codemap,
} from './codemap';

// ── DepGraph ───────────────────────────────────────────

export {
  createDepGraph,
  addNode,
  addEdge,
  incoming,
  outgoing,
  egoNetwork,
  createFixtureGraph,
} from './dep-graph';

export type {
  DepNode,
  DepEdge,
  DepGraph,
} from './dep-graph';

// @infinity-canvas/ast-graph
// Workspace indexer (walk + ignore rules) + dependency graph builder.
// ADR-5a: file-level imports first (regex), ast-grep deferred to Phase 6+.

export { indexWorkspace, countFiles } from './WorkspaceIndexer';
export type { FileMeta, IndexOptions } from './WorkspaceIndexer';

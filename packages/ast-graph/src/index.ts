// @infinity-canvas/ast-graph
// Workspace indexer (walk + ignore rules) + import resolver + DepGraph builder.
// ADR-5a: file-level imports first (regex), ast-grep deferred to Phase 6+.

export { indexWorkspace, countFiles } from './WorkspaceIndexer';
export type { FileMeta, IndexOptions } from './WorkspaceIndexer';

export { extractImports, extractFileImports, isRelativePath, isBareModule } from './import-resolver';
export type { ImportInfo, FileImports } from './import-resolver';

export { buildDepGraph } from './depGraphBuilder';
export type { BuildOptions } from './depGraphBuilder';

export { DepGraphService, depGraphService } from './DepGraphService';

export { buildNodeCodemap, saveNodeCodemap, loadNodeCodemap, saveEnrichedCodemap, loadEnrichedCodemap } from './CodemapBuilder';
export type { NodeInfo } from './CodemapBuilder';

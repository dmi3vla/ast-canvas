import { resolve, relative, dirname, join } from 'path';
import type { DepGraph, DepNode, DepEdge } from '@infinity-canvas/schema';
import { createDepGraph, addNode, addEdge } from '@infinity-canvas/schema';
import type { FileMeta } from './WorkspaceIndexer';
import { extractFileImports, isRelativePath, isBareModule } from './import-resolver';

export interface BuildOptions {
  /** Workspace root for path resolution */
  workspaceRoot: string;
  /** Skip bare modules (node_modules)? Default: false (include as external nodes) */
  skipBareModules?: boolean;
  /** Max files to process (0 = unlimited) */
  maxFiles?: number;
}

/**
 * Build a DepGraph from workspace files.
 * Resolves relative imports to workspace paths.
 * Bare module imports become external nodes.
 */
export async function buildDepGraph(
  files: FileMeta[],
  options: BuildOptions,
): Promise<DepGraph> {
  const g = createDepGraph();
  const { workspaceRoot, skipBareModules = false, maxFiles = 0 } = options;

  // Process each file
  const toProcess = maxFiles > 0 ? files.slice(0, maxFiles) : files;

  for (const file of toProcess) {
    const nodeId = relative(workspaceRoot, file.path) || file.name;

    // Add file node
    addNode(g, {
      id: nodeId,
      path: file.path,
      name: file.name,
      kind: 'file',
    });

    // Extract imports
    try {
      const { imports } = await extractFileImports(file.path);

      for (const imp of imports) {
        if (isRelativePath(imp.path)) {
          // Resolve relative import to workspace path
          const dir = dirname(file.path);
          const resolved = resolve(dir, imp.path);

          // Try with extensions
          for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '']) {
            const candidate = resolved + ext;
            if (files.some(f => f.path === candidate)) {
              const targetId = relative(workspaceRoot, candidate) || candidate;
              addEdge(g, {
                from: nodeId,
                to: targetId,
                kind: imp.isType ? 'type' : 'import',
                loc: { line: imp.line },
              });
              break;
            }
          }
        } else if (isBareModule(imp.path) && !skipBareModules) {
          // External module node
          const extId = `external:${imp.path}`;
          if (!g.nodes[extId]) {
            addNode(g, {
              id: extId,
              path: imp.path,
              name: imp.path,
              kind: 'external',
            });
          }
          addEdge(g, {
            from: nodeId,
            to: extId,
            kind: imp.isType ? 'type' : 'import',
            loc: { line: imp.line },
          });
        }
      }
    } catch {
      // Skip files we can't read
    }
  }

  return g;
}

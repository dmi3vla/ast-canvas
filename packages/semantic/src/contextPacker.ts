import type { FileMeta } from '@infinity-canvas/ast-graph';

// ── Context Packer ─────────────────────────────────────

export interface ContextPack {
  /** ASCII tree of the workspace (depth-limited) */
  tree: string;
  /** Manifest files (README, package.json, etc.) */
  manifests: { path: string; content: string }[];
  /** Sample source files (top-N by priority) */
  samples: { path: string; content: string }[];
  /** Budget stats */
  stats: {
    totalChars: number;
    budgetChars: number;
    fileCount: number;
    skippedCount: number;
  };
}

export interface ContextPackerOptions {
  /** Hard character budget (default 80_000) */
  budgetChars?: number;
  /** Max files to sample (default 20) */
  maxSampleFiles?: number;
  /** Max tree depth (default 3) */
  treeDepth?: number;
}

/** File reader function (injected for testability) */
export type FileReader = (path: string) => Promise<string>;

/** Priority file patterns — loaded first */
const PRIORITY_PATTERNS = [
  /^README/i,
  /^package\.json$/,
  /^src\/index\./,
  /^src\/main\./,
  /^index\.(ts|js|tsx)$/,
  /^main\.(ts|js|tsx)$/,
  /^src\/app\./,
];

/** Manifest patterns — always loaded (small files) */
const MANIFEST_PATTERNS = [
  /^package\.json$/,
  /^tsconfig.*\.json$/,
  /^README/i,
  /^\.gitignore$/,
];

function isPriority(path: string): boolean {
  const name = path.split('/').pop() || '';
  const rel = path;
  return PRIORITY_PATTERNS.some(p => p.test(name) || p.test(rel));
}

function isManifest(path: string): boolean {
  const name = path.split('/').pop() || '';
  return MANIFEST_PATTERNS.some(p => p.test(name));
}

/** Build ASCII tree from file list */
function buildTree(files: FileMeta[], depth: number): string {
  const lines: string[] = ['.'];
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  for (const f of sorted) {
    const parts = f.relativePath.split('/');
    if (parts.length > depth + 1) continue; // depth-limited

    const indent = '  '.repeat(Math.min(parts.length - 1, depth));
    const prefix = f.isDirectory ? '📁 ' : '📄 ';
    lines.push(`${indent}${prefix}${parts[parts.length - 1]}`);
  }

  return lines.join('\n');
}

/**
 * Pack workspace context for LLM prompt.
 * Priority: README, package.json, src/index*, main* → then top-N by size desc.
 * Hard budget: stops adding files when totalChars ≥ budgetChars.
 */
export async function contextPacker(
  files: FileMeta[],
  reader: FileReader,
  options: ContextPackerOptions = {},
): Promise<ContextPack> {
  const budget = options.budgetChars ?? 80_000;
  const maxSamples = options.maxSampleFiles ?? 20;
  const depth = options.treeDepth ?? 3;

  const manifests: ContextPack['manifests'] = [];
  const samples: ContextPack['samples'] = [];
  let totalChars = 0;
  let skippedCount = 0;

  const sourceFiles = files.filter(f => !f.isDirectory);

  // Pass 1: manifests (always load, small files)
  for (const f of sourceFiles) {
    if (isManifest(f.relativePath)) {
      try {
        const content = await reader(f.path);
        manifests.push({ path: f.relativePath, content });
        totalChars += content.length;
      } catch {
        skippedCount++;
      }
    }
  }

  // Pass 2: priority source files
  const priorityFiles = sourceFiles.filter(f => isPriority(f.relativePath) && !isManifest(f.relativePath));
  for (const f of priorityFiles) {
    if (totalChars >= budget || samples.length >= maxSamples) break;
    try {
      const content = await reader(f.path);
      samples.push({ path: f.relativePath, content });
      totalChars += content.length;
    } catch {
      skippedCount++;
    }
  }

  // Pass 3: remaining files by size descending (up to budget)
  const remaining = sourceFiles
    .filter(f => !isManifest(f.relativePath) && !isPriority(f.relativePath))
    .sort((a, b) => b.size - a.size);

  for (const f of remaining) {
    if (totalChars >= budget || samples.length >= maxSamples) break;
    try {
      const content = await reader(f.path);
      samples.push({ path: f.relativePath, content });
      totalChars += content.length;
    } catch {
      skippedCount++;
    }
  }

  const tree = buildTree(files, depth);

  return {
    tree,
    manifests,
    samples,
    stats: {
      totalChars,
      budgetChars: budget,
      fileCount: sourceFiles.length,
      skippedCount,
    },
  };
}

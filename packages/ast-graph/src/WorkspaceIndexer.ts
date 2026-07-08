import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

export interface FileMeta {
  name: string;
  path: string;        // absolute
  relativePath: string; // relative to root
  isDirectory: boolean;
  size: number;
  mtime: string;
  extension: string;
}

export interface IndexOptions {
  /** Directories/files to skip (exact name match) */
  skipNames?: string[];
  /** Extensions to include (e.g. ['.ts', '.tsx']). Empty = all */
  includeExtensions?: string[];
  /** Regex patterns to skip (matched against relative path) */
  skipPatterns?: RegExp[];
  /** Max depth (0 = unlimited) */
  maxDepth?: number;
}

const DEFAULT_SKIP = [
  'node_modules', '.git', 'dist', 'out', 'build',
  '.next', '.turbo', 'coverage', '__pycache__', '.DS_Store',
];

const DEFAULT_SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.map', '.lock',
];

async function walk(
  dirPath: string,
  rootPath: string,
  options: IndexOptions,
  depth: number,
): Promise<FileMeta[]> {
  const result: FileMeta[] = [];
  const skipNames = options.skipNames || DEFAULT_SKIP;

  if (options.maxDepth !== undefined && depth > options.maxDepth) {
    return result;
  }

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return result; // permission errors, etc.
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relPath = relative(rootPath, fullPath);

    // Skip hidden files/dirs (except .gitignore)
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;

    // Skip by name
    if (skipNames.includes(entry.name)) continue;

    // Skip by regex
    if (options.skipPatterns) {
      const matched = options.skipPatterns.some(p => p.test(relPath));
      if (matched) continue;
    }

    try {
      const stats = await stat(fullPath);

      if (entry.isDirectory()) {
        // Recurse
        const children = await walk(fullPath, rootPath, options, depth + 1);
        result.push(...children);
      } else {
        const ext = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : '';

        // Skip binary/media extensions
        if (DEFAULT_SKIP_EXTENSIONS.includes(ext.toLowerCase())) continue;

        // Filter by extension
        if (options.includeExtensions && options.includeExtensions.length > 0) {
          if (!options.includeExtensions.includes(ext)) continue;
        }

        result.push({
          name: entry.name,
          path: fullPath,
          relativePath: relPath,
          isDirectory: false,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          extension: ext,
        });
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return result;
}

/**
 * Walk a directory tree and return file metadata.
 * Skips node_modules, .git, dist, binary files by default.
 */
export async function indexWorkspace(
  rootPath: string,
  options: IndexOptions = {},
): Promise<FileMeta[]> {
  const files = await walk(rootPath, rootPath, options, 0);
  // Sort by relative path
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Count files (fast, no full metadata) — useful for smoke tests.
 */
export async function countFiles(rootPath: string, options: IndexOptions = {}): Promise<number> {
  const files = await indexWorkspace(rootPath, options);
  return files.length;
}

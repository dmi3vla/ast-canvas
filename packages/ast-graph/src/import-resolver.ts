import { readFile } from 'fs/promises';

// ── Import Resolver (file-level, regex-based) ──────────

export interface ImportInfo {
  /** Import path string (e.g. './utils', 'react', '../config') */
  path: string;
  /** Imported symbols, if named imports */
  symbols: string[];
  /** Is this a default import? */
  isDefault: boolean;
  /** Is this a type-only import? */
  isType: boolean;
  /** Line number where import appears */
  line: number;
  /** Kind of import */
  kind: 'es6' | 'require' | 'dynamic';
}

/** All imports from a single file */
export interface FileImports {
  filePath: string;
  imports: ImportInfo[];
}

// ── Regex Patterns ─────────────────────────────────────

// ES6 named: import { a, b } from '...'
const RE_ES6_NAMED = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

// ES6 default: import X from '...'
const RE_ES6_DEFAULT = /import\s+(?:type\s+)?(\w+)\s+from\s+['"]([^'"]+)['"]/g;

// ES6 namespace: import * as X from '...'
const RE_ES6_NAMESPACE = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;

// ES6 side-effect: import '...'
const RE_ES6_SIDE_EFFECT = /import\s+['"]([^'"]+)['"]/g;

// CJS require: const x = require('...') or require('...')
const RE_CJS_REQUIRE = /(?:const|let|var)\s+\{?([^}=]*)\}?\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// CJS bare require
const RE_CJS_BARE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Dynamic import: import('...')
const RE_DYNAMIC = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Extract line number from match position in source */
function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Parse named import specifiers: "{ a, b, c as d }" → ["a", "b", "c"] */
function parseNamedSpecs(specs: string): string[] {
  return specs
    .split(',')
    .map(s => s.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

/** Extract all imports from source code */
export function extractImports(source: string, filePath: string): ImportInfo[] {
  const results: ImportInfo[] = [];
  const seen = new Set<string>(); // dedup

  const add = (path: string, symbols: string[], isDefault: boolean, isType: boolean, kind: ImportInfo['kind'], index: number) => {
    const key = `${path}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      path: path.startsWith('#') ? path : path, // keep internal anchors
      symbols: [...new Set(symbols)],
      isDefault,
      isType,
      line: lineAt(source, index),
      kind,
    });
  };

  // ES6 named
  for (const m of source.matchAll(RE_ES6_NAMED)) {
    const fullMatch = m[0]; // full matched text includes 'import type'
    const isType = fullMatch.includes('type ');
    add(m[2], parseNamedSpecs(m[1]), false, isType, 'es6', m.index!);
  }

  // ES6 default
  for (const m of source.matchAll(RE_ES6_DEFAULT)) {
    const fullMatch = m[0];
    const isType = fullMatch.includes('type ');
    add(m[2], [m[1]], true, isType, 'es6', m.index!);
  }

  // ES6 namespace
  for (const m of source.matchAll(RE_ES6_NAMESPACE)) {
    add(m[2], [m[1]], false, false, 'es6', m.index!);
  }

  // ES6 side-effect
  for (const m of source.matchAll(RE_ES6_SIDE_EFFECT)) {
    add(m[1], [], false, false, 'es6', m.index!);
  }

  // CJS require with destructuring
  for (const m of source.matchAll(RE_CJS_REQUIRE)) {
    const syms = m[1].trim() ? parseNamedSpecs(m[1]) : [];
    add(m[2], syms, false, false, 'require', m.index!);
  }

  // CJS bare require (skip if already caught by destructuring)
  for (const m of source.matchAll(RE_CJS_BARE)) {
    add(m[1], [], false, false, 'require', m.index!);
  }

  // Dynamic import
  for (const m of source.matchAll(RE_DYNAMIC)) {
    add(m[1], [], false, false, 'dynamic', m.index!);
  }

  return results;
}

/** Extract imports from a file on disk */
export async function extractFileImports(filePath: string): Promise<FileImports> {
  const source = await readFile(filePath, 'utf-8');
  return {
    filePath,
    imports: extractImports(source, filePath),
  };
}

// ── Path Resolution ────────────────────────────────────

/** Check if an import path is a relative local path */
export function isRelativePath(p: string): boolean {
  return p.startsWith('./') || p.startsWith('../');
}

/** Check if an import path is a bare module (not relative) */
export function isBareModule(p: string): boolean {
  return !isRelativePath(p) && !p.startsWith('/') && !p.startsWith('#');
}

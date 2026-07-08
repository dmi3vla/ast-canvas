import { describe, it, expect } from 'vitest';
import { indexWorkspace, countFiles } from '../src/WorkspaceIndexer';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(__dirname, '../../../fixtures/mini-project');

describe('WorkspaceIndexer', () => {
  it('indexes the mini-project fixture', async () => {
    const files = await indexWorkspace(FIXTURES_DIR);

    expect(files.length).toBeGreaterThanOrEqual(3); // index.js, helpers.js, config.js
    expect(files.some(f => f.name === 'index.js')).toBe(true);
    expect(files.some(f => f.name === 'helpers.js')).toBe(true);
    expect(files.some(f => f.name === 'config.js')).toBe(true);
  });

  it('counts files in mini-project', async () => {
    const count = await countFiles(FIXTURES_DIR);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('filters by extension', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, {
      includeExtensions: ['.js'],
    });
    expect(files.every(f => f.extension === '.js')).toBe(true);
  });

  it('skips directories by name', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, {
      skipNames: ['src'],
    });
    // Only root-level files remain (README.md, package.json)
    expect(files.length).toBe(2);
    expect(files.every(f => !f.relativePath.startsWith('src/'))).toBe(true);
  });

  it('respects maxDepth', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, {
      maxDepth: 0,
    });
    // Only files in root (README, package.json)
    expect(files.every(f => !f.relativePath.includes('/'))).toBe(true);
  });

  it('returns relative paths', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, {
      includeExtensions: ['.js'],
    });
    for (const f of files) {
      expect(f.relativePath).not.toContain('..');
      expect(f.relativePath).not.toBe(f.path);
    }
  });

  it('includes file metadata', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, {
      includeExtensions: ['.js'],
    });
    for (const f of files) {
      expect(f.name).toBeTruthy();
      expect(f.path).toBeTruthy();
      expect(f.relativePath).toBeTruthy();
      expect(f.isDirectory).toBe(false);
      expect(f.size).toBeGreaterThan(0);
      expect(f.mtime).toBeTruthy();
      expect(f.extension).toBe('.js');
    }
  });
});

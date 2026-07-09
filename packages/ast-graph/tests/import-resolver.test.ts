import { describe, it, expect } from 'vitest';
import { extractImports, extractFileImports, isRelativePath, isBareModule } from '../src/import-resolver';
import { resolve } from 'path';

describe('import-resolver', () => {
  describe('extractImports', () => {
    it('extracts ES6 named imports', () => {
      const src = `import { useState, useEffect } from 'react';\nimport { formatName } from './utils/helpers';`;
      const imports = extractImports(src, 'test.ts');

      const react = imports.find(i => i.path === 'react');
      expect(react).toBeDefined();
      expect(react!.symbols).toEqual(['useState', 'useEffect']);
      expect(react!.kind).toBe('es6');
      expect(react!.isType).toBe(false);

      const local = imports.find(i => i.path === './utils/helpers');
      expect(local).toBeDefined();
      expect(local!.symbols).toEqual(['formatName']);
    });

    it('extracts ES6 default imports', () => {
      const src = `import React from 'react';`;
      const imports = extractImports(src, 'test.ts');
      expect(imports).toHaveLength(1);
      expect(imports[0].path).toBe('react');
      expect(imports[0].symbols).toEqual(['React']);
      expect(imports[0].isDefault).toBe(true);
    });

    it('extracts ES6 namespace imports', () => {
      const src = `import * as utils from './utils';`;
      const imports = extractImports(src, 'test.ts');
      expect(imports[0].symbols).toEqual(['utils']);
    });

    it('extracts side-effect imports', () => {
      const src = `import './styles.css';`;
      const imports = extractImports(src, 'test.ts');
      expect(imports).toHaveLength(1);
      expect(imports[0].symbols).toEqual([]);
    });

    it('extracts CJS require', () => {
      const src = `const { readFile, writeFile } = require('fs');\nconst path = require('path');`;
      const imports = extractImports(src, 'test.js');

      expect(imports.length).toBeGreaterThanOrEqual(2);
      const fs = imports.find(i => i.path === 'fs');
      expect(fs).toBeDefined();
      expect(fs!.kind).toBe('require');
    });

    it('extracts dynamic imports', () => {
      const src = `const mod = await import('./lazy');`;
      const imports = extractImports(src, 'test.ts');
      expect(imports).toHaveLength(1);
      expect(imports[0].path).toBe('./lazy');
      expect(imports[0].kind).toBe('dynamic');
    });

    it('extracts type-only imports', () => {
      const src = `import type { User } from './types';`;
      const imports = extractImports(src, 'test.ts');

      const typeImp = imports.find(i => i.path === './types');
      expect(typeImp).toBeDefined();
      expect(typeImp!.isType).toBe(true);
    });

    it('includes line numbers', () => {
      const src = '// line 1\n// line 2\nimport React from "react";\n// line 4';
      const imports = extractImports(src, 'test.ts');
      expect(imports[0].line).toBe(3);
    });
  });

  describe('path helpers', () => {
    it('isRelativePath', () => {
      expect(isRelativePath('./foo')).toBe(true);
      expect(isRelativePath('../foo')).toBe(true);
      expect(isRelativePath('react')).toBe(false);
      expect(isRelativePath('/abs/path')).toBe(false);
    });

    it('isBareModule', () => {
      expect(isBareModule('react')).toBe(true);
      expect(isBareModule('@scope/pkg')).toBe(true);
      expect(isBareModule('./local')).toBe(false);
      expect(isBareModule('/abs')).toBe(false);
    });
  });

  describe('extractFileImports (real file)', () => {
    it('reads mini-project index.js', async () => {
      const path = resolve(__dirname, '../../../fixtures/mini-project/src/index.js');
      const result = await extractFileImports(path);

      expect(result.filePath).toBe(path);
      expect(result.imports.length).toBeGreaterThan(0);

      const helpers = result.imports.find(i => i.path === './utils/helpers.js');
      expect(helpers).toBeDefined();
      expect(helpers!.symbols).toContain('formatName');
      expect(helpers!.symbols).toContain('calculateTotal');
    });
  });
});

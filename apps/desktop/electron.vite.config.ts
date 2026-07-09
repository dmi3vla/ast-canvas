import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Read desktop package.json to know which deps to externalize
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const workspacePackages = /^@infinity-canvas\//;
const externalDeps = Object.keys(allDeps).filter(d => !workspacePackages.test(d));

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        external: (id: string) => {
          // Externalize only node_modules deps, NOT our workspace packages
          return externalDeps.some(dep => id === dep || id.startsWith(dep + '/'));
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
        external: (id: string) => {
          return externalDeps.some(dep => id === dep || id.startsWith(dep + '/'));
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
  },
});

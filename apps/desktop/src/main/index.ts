import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import { join, resolve, normalize, relative } from 'path';
import { is } from '@electron-toolkit/utils';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { existsSync, mkdirSync, watch } from 'fs';
import {
  indexWorkspace,
  buildDepGraph,
  depGraphService,
  buildNodeCodemap,
  saveNodeCodemap,
  loadNodeCodemap,
  saveEnrichedCodemap,
  loadEnrichedCodemap,
} from '@infinity-canvas/ast-graph';
import {
  contextPacker,
  createProvider,
  MockLLMProvider,
  withPromptLogging,
  enrichCodemap,
  applyPrivacyToPack,
  SYSTEM_CODEMAP,
  EXAMPLE_CODEMAP_MINI,
  buildCodemapUserPrompt,
  projectCodemapToCanvas,
} from '@infinity-canvas/semantic';
import type { ChatMessage } from '@infinity-canvas/semantic';
import { serializeDocument, parseCodemap } from '@infinity-canvas/schema';
import type { Codemap, DepGraph, CanvasDocument } from '@infinity-canvas/schema';
import { SessionStore } from '@infinity-canvas/session';
import { setLogWorkspace, logEvent, sanitizeForLog } from './logger';
import { loadEnvFiles } from './loadEnv';

// Load .env before any createProvider() reads process.env at runtime
const envLoad = loadEnvFiles();
if (envLoad.loaded.length) {
  console.log('[env] loaded:', envLoad.loaded.map(p => p.split('/').slice(-2).join('/')).join(', '));
  console.log(
    '[env] LLM:',
    process.env.INFINITY_LLM_PROVIDER || 'mock',
    process.env.INFINITY_LLM_BASE_URL || '(default)',
    process.env.INFINITY_LLM_MODEL || '(default)',
    process.env.INFINITY_LLM_API_KEY ? 'key=set' : 'key=missing',
  );
} else {
  console.log('[env] no .env file found — Mock LLM unless vars set in shell');
}

let mainWindow: BrowserWindow | null = null;
let lastWorkspacePath: string | null = null;
let workspaceWatcher: ReturnType<typeof watch> | null = null;

// ── Workspace watch ─────────────────────────────────────

function startWorkspaceWatch(root: string): void {
  stopWorkspaceWatch();
  let timer: ReturnType<typeof setTimeout>;
  try {
    workspaceWatcher = watch(root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.startsWith('.') || filename.includes('node_modules') || filename.includes('/dist/') || filename.includes('/out/')) return;
      // Debounce 300ms before invalidate
      clearTimeout(timer);
      timer = setTimeout(() => {
        depGraphService.invalidate(root);
      }, 300);
    });
  } catch { /* watch not supported everywhere */ }
}

function stopWorkspaceWatch(): void {
  if (workspaceWatcher) {
    workspaceWatcher.close();
    workspaceWatcher = null;
  }
}

// ── Path safety ─────────────────────────────────────────

function isPathInWorkspace(filePath: string): boolean {
  if (!lastWorkspacePath) return false;
  const normalized = normalize(filePath);
  const normalizedWs = normalize(lastWorkspacePath);
  // Allow only paths within the workspace or app config dir
  try {
    const rel = relative(normalizedWs, normalized);
    return !rel.startsWith('..') && !resolve(rel).startsWith('..');
  } catch {
    return false;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    title: 'Infinity Canvas',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ── IPC Handlers ────────────────────────────────────────

ipcMain.handle('dialog:openWorkspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Workspace Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  lastWorkspacePath = folderPath;
  startWorkspaceWatch(folderPath);

  // Store for next session
  try {
    const configDir = join(app.getPath('userData'), 'config');
    mkdirSync(configDir, { recursive: true });
    await writeFile(join(configDir, 'last-workspace.json'), JSON.stringify({ path: folderPath }));
  } catch {
    // non-critical
  }

  return folderPath;
});

ipcMain.handle('workspace:listFiles', async (_event, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: { name: string; isDirectory: boolean; path: string }[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;

      files.push({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: join(dirPath, entry.name),
      });
    }

    return { dirPath, files: files.sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (err) {
    return { dirPath, files: [], error: String(err) };
  }
});

ipcMain.handle('file:read', async (_event, filePath: string, resolveRelative?: boolean) => {
  let resolved = filePath;

  // Resolve relative paths against workspace
  if (resolveRelative && lastWorkspacePath && !filePath.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(filePath)) {
    resolved = join(lastWorkspacePath, filePath);
  }

  if (!isPathInWorkspace(resolved)) {
    return {
      error: lastWorkspacePath
        ? `Access denied: "${filePath}" is outside the workspace`
        : 'No workspace open. Use "Open Folder" first.',
      needsWorkspace: !lastWorkspacePath,
    };
  }

  try {
    const content = await readFile(resolved, 'utf-8');
    const stats = await stat(resolved);
    return { content, size: stats.size, mtime: stats.mtime.toISOString(), path: resolved };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  if (!isPathInWorkspace(filePath)) {
    return { error: 'Access denied: file is outside the workspace' };
  }
  try {
    await writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('config:get', async (_event, key: string) => {
  try {
    const configPath = join(app.getPath('userData'), 'config', `${key}.json`);
    if (!existsSync(configPath)) return null;
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

ipcMain.handle('config:set', async (_event, key: string, value: unknown) => {
  try {
    const configDir = join(app.getPath('userData'), 'config');
    mkdirSync(configDir, { recursive: true });
    await writeFile(join(configDir, `${key}.json`), JSON.stringify(value, null, 2));
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('workspace:getLast', async () => {
  try {
    const configPath = join(app.getPath('userData'), 'config', 'last-workspace.json');
    if (!existsSync(configPath)) return null;
    const content = await readFile(configPath, 'utf-8');
    const data = JSON.parse(content);
    const path = data.path;
    // Verify the workspace still exists on disk
    if (path && existsSync(path)) {
      lastWorkspacePath = path;
      startWorkspaceWatch(path);
      return path;
    }
    return null;
  } catch {
    return null;
  }
});

// ── Semantic Map Pipeline ───────────────────────────────

ipcMain.handle('workspace:buildSemanticMap', async (_event, workspacePath: string, options?: { force?: boolean; useMock?: boolean }) => {
  try {
    lastWorkspacePath = workspacePath;
    setLogWorkspace(workspacePath);

    // 1) Index workspace
    const files = await indexWorkspace(workspacePath);
    const fileCount = files.length;

    // 2) Session — try load from cache (skip if force)
    const session = new SessionStore();
    if (!options?.force) {
      const cached = await session.loadFromWorkspace(workspacePath);
      if (cached && session.get().semanticMap) {
        const map = session.get().semanticMap!;
        return {
          json: JSON.stringify(serializeDocument(map)),
          fileCount,
          fromCache: true,
          nodeCount: map.nodes.length,
          provider: 'cache',
        };
      }
    }

    // 3) Build context pack
    const pack = await contextPacker(files, async (p) => readFile(p, 'utf-8'), {
      budgetChars: 80_000,
    });

    // 3b) Privacy
    applyPrivacyToPack(pack);

    // 4) LLM — generate codemap (areas + fileAnchors), not raw canvas
    const projectName = workspacePath.split('/').pop() || 'Project';
    const userPrompt = buildCodemapUserPrompt(pack, projectName);
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_CODEMAP + '\n\nHere is a valid example:\n' + EXAMPLE_CODEMAP_MINI },
      { role: 'user', content: userPrompt },
    ];

    const llm = options?.useMock ? new MockLLMProvider() : createProvider();
    const providerName = llm.name;

    let codemap: Codemap;
    let document: CanvasDocument;

    try {
      const raw = await llm.complete(messages);
      const stripped = raw.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
      codemap = parseCodemap(stripped);
    } catch (err) {
      logEvent('WARN', 'semantic-map', `LLM parse failed, trying mock: ${err}`).catch(() => {});
      try {
        const mockRaw = await new MockLLMProvider().complete(messages);
        codemap = parseCodemap(mockRaw.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim());
      } catch {
        codemap = {
          schemaVersion: 1, id: `${projectName}___fallback`,
          stableId: 'fallback',
          metadata: { cascadeId: 'fallback', generationSource: 'fallback', generationTimestamp: new Date().toISOString(), mode: 'SMART', originalPrompt: 'fallback' },
          title: projectName,
          traces: pack.samples.slice(0, 5).map((s, i) => ({
            id: String(i + 1), title: s.path.split('/').pop() || s.path, description: '',
            locations: [{ id: `${i + 1}a`, path: s.path, lineNumber: 1 }],
          })),
        };
      }
    }

    // 5) Build DepGraph for realistic edges and layout
    let depGraph: DepGraph | null = null;
    try {
      depGraph = await depGraphService.getGraph(workspacePath);
    } catch { /* DepGraph optional */ }

    // 6) Project codemap → canvas with real import-derived edges
    document = projectCodemapToCanvas(codemap!, depGraph);

    logEvent('INFO', 'semantic-map', `Built map: ${document.nodes.length} nodes`, {
      provider: sanitizeForLog(providerName),
      traces: codemap!.traces.length,
    }).catch(() => {});

    // 7) Save to cache
    session.patch({ workspaceRoot: workspacePath, semanticMap: document });
    session.patchUI({ rightMode: 'empty', selectedNodeId: null });
    await session.saveToWorkspace(workspacePath);

    return {
      json: JSON.stringify(serializeDocument(document)),
      fileCount,
      fromCache: false,
      nodeCount: document.nodes.length,
      provider: providerName,
    };
  } catch (err) {
    logEvent('ERROR', 'semantic-map', String(err)).catch(() => {});
    return { error: String(err) };
  }
});

// ── DepGraph for RIGHT Codemap ─────────────────────────

ipcMain.handle(
  'workspace:depGraph',
  async (_event, _workspacePath: string, nodeFileAnchors?: string[], depth?: number) => {
    try {
      if (!lastWorkspacePath) return { error: 'No workspace open', needsWorkspace: true };

      const d = typeof depth === 'number' && depth >= 1 ? Math.min(depth, 3) : 1;
      const centerPaths = nodeFileAnchors && nodeFileAnchors.length > 0 ? nodeFileAnchors : [];
      const ego = await depGraphService.getEgo(lastWorkspacePath, centerPaths, d);

      if (ego) {
        const g = await depGraphService.getGraph(lastWorkspacePath);
        return {
          center: ego.center,
          centers: ego.centers,
          nodeCount: ego.nodes.size,
          edgeCount: ego.edges.length,
          edges: ego.edges.map(e => ({ from: e.from, to: e.to, kind: e.kind, line: e.loc?.line })),
          nodes: [...ego.nodes].map(id => ({ id, name: g.nodes[id]?.name, kind: g.nodes[id]?.kind })),
        };
      }

      const g = await depGraphService.getGraph(lastWorkspacePath);
      return { nodeCount: Object.keys(g.nodes).length, edgeCount: g.edges.length };
    } catch (err) {
      return { error: String(err) };
    }
  },
);

// ── Structural codemap per semantic node ────────────────

ipcMain.handle(
  'workspace:nodeCodemap',
  async (
    _event,
    payload: {
      nodeId: string;
      text?: string;
      summary?: string;
      fileAnchors?: string[];
      force?: boolean;
      enrich?: boolean;
    },
  ) => {
    try {
      if (!lastWorkspacePath) return { error: 'No workspace open', needsWorkspace: true };

      const { nodeId, text, summary, fileAnchors = [], force, enrich } = payload;

      // Cache: for non-enrich, prefer enriched if exists; else structural
      if (!force && !enrich) {
        const enrichedCached = await loadEnrichedCodemap(lastWorkspacePath, nodeId);
        if (enrichedCached) return { codemap: enrichedCached, fromCache: true, enriched: true };
        const cached = await loadNodeCodemap(lastWorkspacePath, nodeId);
        if (cached) return { codemap: cached, fromCache: true };
      }

      const g = await depGraphService.getGraph(lastWorkspacePath);
      let codemap = buildNodeCodemap(
        { id: nodeId, text, semantic: { summary, fileAnchors, kind: 'area' } },
        g,
        lastWorkspacePath,
      );

      // Cache structural immediately (don't wait for enrich)
      await saveNodeCodemap(lastWorkspacePath, nodeId, codemap);

      // LLM Enrich
      if (enrich) {
        const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '');
        const pathKey = (absOrRel: string) => {
          const n = norm(absOrRel);
          // Prefer path relative to workspace for stable matching
          try {
            const rel = relative(lastWorkspacePath!, n.startsWith('/') || /^[A-Za-z]:/.test(n) ? n : join(lastWorkspacePath!, n));
            if (rel && !rel.startsWith('..')) return norm(rel);
          } catch { /* ignore */ }
          return n;
        };

        // Neighborhood: anchors + dep-graph radius-1 (relative ids)
        const centers = Object.keys(g.nodes).filter(
          id => fileAnchors.some((a: string) => id.endsWith(a) || a.endsWith(id) || pathKey(id) === pathKey(a)),
        );
        const neighborhood = new Set<string>(
          [
            ...fileAnchors.map(pathKey),
            ...centers.map(pathKey),
            ...g.edges
              .filter(e => centers.includes(e.from) || centers.includes(e.to))
              .flatMap(e => [e.from, e.to]),
          ]
            .map(pathKey)
            .filter(p => p && !p.startsWith('external:')),
        );

        const allFiles = await indexWorkspace(lastWorkspacePath);
        const neighborhoodFiles = allFiles.filter(f => {
          const rel = norm(relative(lastWorkspacePath!, f.path));
          const abs = norm(f.path);
          return neighborhood.has(rel) || neighborhood.has(abs)
            || [...neighborhood].some(n => rel.endsWith(n) || n.endsWith(rel));
        });

        const pack = await contextPacker(
          neighborhoodFiles.length > 0 ? neighborhoodFiles : allFiles,
          async (p) => readFile(p, 'utf-8'),
          { budgetChars: 30_000 },
        );
        const llm = createProvider();

        // Privacy: apply same policy as map build
        applyPrivacyToPack(pack);
        setLogWorkspace(lastWorkspacePath);

        const result = await enrichCodemap({
          structural: codemap,
          pack,
          llm,
          allowedPaths: [...neighborhood],
        });

        codemap = result.codemap;
        await saveEnrichedCodemap(lastWorkspacePath, nodeId, codemap);

        logEvent('INFO', 'enrich', `Enriched codemap for node ${nodeId}`, {
          provider: sanitizeForLog(result.diagnostics.provider),
          strippedLocations: result.diagnostics.strippedLocations,
          repaired: result.diagnostics.repaired,
          traces: codemap.traces.length,
        }).catch(() => {});
      }

      return { codemap, fromCache: false, enriched: !!enrich };
    } catch (err) {
      logEvent('ERROR', 'enrich', sanitizeForLog(String(err))).catch(() => {});
      return { error: String(err) };
    }
  },
);

// ── Export / Import ─────────────────────────────────────

ipcMain.handle(
  'workspace:exportBundle',
  async (_event, workspacePath: string) => {
    try {
      if (!workspacePath) return { error: 'No workspace open' };

      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Export Research Bundle',
        defaultPath: 'infinity-bundle',
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });
      if (result.canceled || !result.filePath) return { error: 'cancelled' };

      const dest = result.filePath;
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

      const cacheDir = join(workspacePath, '.infinity-canvas');
      const codemapsDir = join(cacheDir, 'codemaps');
      const destCode = join(dest, 'codemaps');

      const files: string[] = [];

      // semantic-map.canvas
      const mapPath = join(cacheDir, 'semantic-map.canvas');
      if (existsSync(mapPath)) {
        await writeFile(join(dest, 'semantic-map.canvas'), await readFile(mapPath));
        files.push('semantic-map.canvas');
      }

      // codemaps/
      if (existsSync(codemapsDir)) {
        if (!existsSync(destCode)) mkdirSync(destCode, { recursive: true });
        const entries = await readdir(codemapsDir);
        for (const entry of entries) {
          const src = join(codemapsDir, entry);
          const dst = join(destCode, entry);
          await writeFile(dst, await readFile(src));
          files.push(`codemaps/${entry}`);
        }
      }

      // dep-graph.json (optional)
      const dgPath = join(cacheDir, 'dep-graph.json');
      if (existsSync(dgPath)) {
        await writeFile(join(dest, 'dep-graph.json'), await readFile(dgPath));
        files.push('dep-graph.json');
      }

      // manifest
      const manifest = {
        version: 1,
        exportedAt: new Date().toISOString(),
        workspaceName: workspacePath.split('/').pop() || workspacePath,
        files,
      };
      await writeFile(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));

      setLogWorkspace(workspacePath);
      logEvent('INFO', 'export', `Exported bundle with ${files.length} files`, {
        dest: sanitizeForLog(dest),
        fileCount: files.length,
      }).catch(() => {});

      return { ok: true, dest, manifest };
    } catch (err) {
      logEvent('ERROR', 'export', sanitizeForLog(String(err))).catch(() => {});
      return { error: String(err) };
    }
  },
);

ipcMain.handle(
  'workspace:importBundle',
  async (_event, workspacePath: string | null) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Import Codemap',
        filters: [{ name: 'Codemap / Bundle', extensions: ['codemap', 'json'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) return { error: 'cancelled' };

      const filePath = result.filePaths[0];
      const raw = await readFile(filePath, 'utf-8');

      // Try parse as codemap
      const { parseCodemap } = await import('@infinity-canvas/schema');
      const codemap = parseCodemap(raw);

      // Save into workspace cache if workspace is open
      if (workspacePath) {
        const name = filePath.split('/').pop()!.replace(/\.(codemap|json)$/, '');
        const destDir = join(workspacePath, '.infinity-canvas', 'codemaps');
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        await writeFile(join(destDir, `imported-${name}.codemap`), JSON.stringify(codemap, null, 2));
      }

      return { ok: true, codemap, sourcePath: filePath };
    } catch (err) {
      return { error: String(err) };
    }
  },
);

// Also support importing langgraph.codemap from workspace root
ipcMain.handle(
  'workspace:importLanggraph',
  async (_event, workspacePath: string) => {
    try {
      const path = join(workspacePath, 'langgraph.codemap');
      if (!existsSync(path)) return { error: 'langgraph.codemap not found in workspace root' };
      const raw = await readFile(path, 'utf-8');
      const { parseCodemap } = await import('@infinity-canvas/schema');
      const codemap = parseCodemap(raw);
      return { ok: true, codemap };
    } catch (err) {
      return { error: String(err) };
    }
  },
);

// ── App Lifecycle ───────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

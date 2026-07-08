import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import { join, resolve, normalize, relative } from 'path';
import { is } from '@electron-toolkit/utils';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

let mainWindow: BrowserWindow | null = null;
let lastWorkspacePath: string | null = null;

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

ipcMain.handle('file:read', async (_event, filePath: string) => {
  if (!isPathInWorkspace(filePath)) {
    return { error: 'Access denied: file is outside the workspace' };
  }
  try {
    const content = await readFile(filePath, 'utf-8');
    const stats = await stat(filePath);
    return { content, size: stats.size, mtime: stats.mtime.toISOString() };
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
      return path;
    }
    return null;
  } catch {
    return null;
  }
});

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

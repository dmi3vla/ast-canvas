import { contextBridge, ipcRenderer } from 'electron';

// ── Custom APIs for renderer ────────────────────────────

const api = {
  // Workspace
  openWorkspace: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openWorkspace'),

  getLastWorkspace: (): Promise<string | null> =>
    ipcRenderer.invoke('workspace:getLast'),

  listFiles: (dirPath: string): Promise<{
    dirPath: string;
    files: { name: string; isDirectory: boolean; path: string }[];
    error?: string;
  }> => ipcRenderer.invoke('workspace:listFiles', dirPath),

  // File operations
  readFile: (filePath: string, resolveRelative?: boolean): Promise<{
    content?: string;
    size?: number;
    mtime?: string;
    path?: string;
    needsWorkspace?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('file:read', filePath, resolveRelative),

  writeFile: (filePath: string, content: string): Promise<{
    success?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('file:write', filePath, content),

  // Config
  getConfig: (key: string): Promise<unknown> =>
    ipcRenderer.invoke('config:get', key),

  setConfig: (key: string, value: unknown): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('config:set', key, value),

  // DepGraph
  getDepGraph: (workspacePath: string, fileAnchors?: string[]): Promise<{
    center?: string;
    nodeCount?: number;
    edgeCount?: number;
    edges?: { from: string; to: string; kind: string; line?: number }[];
    nodes?: { id: string; name?: string; kind?: string }[];
    error?: string;
  }> => ipcRenderer.invoke('workspace:depGraph', workspacePath, fileAnchors),
  buildSemanticMap: (workspacePath: string, options?: { force?: boolean; useMock?: boolean }): Promise<{
    json?: string;
    fileCount?: number;
    fromCache?: boolean;
    nodeCount?: number;
    provider?: string;
    error?: string;
  }> => ipcRenderer.invoke('workspace:buildSemanticMap', workspacePath, options),
};

// Expose in main world
contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;

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
  readFile: (filePath: string): Promise<{
    content?: string;
    size?: number;
    mtime?: string;
    error?: string;
  }> => ipcRenderer.invoke('file:read', filePath),

  writeFile: (filePath: string, content: string): Promise<{
    success?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('file:write', filePath, content),

  // Config
  getConfig: (key: string): Promise<unknown> =>
    ipcRenderer.invoke('config:get', key),

  setConfig: (key: string, value: unknown): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('config:set', key, value),
};

// Expose in main world
contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;

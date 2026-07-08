/// <reference types="vite/client" />

interface ElectronAPI {
  openWorkspace: () => Promise<string | null>;
  getLastWorkspace: () => Promise<string | null>;
  listFiles: (dirPath: string) => Promise<{
    dirPath: string;
    files: { name: string; isDirectory: boolean; path: string }[];
    error?: string;
  }>;
  readFile: (filePath: string) => Promise<{
    content?: string;
    size?: number;
    mtime?: string;
    error?: string;
  }>;
  writeFile: (filePath: string, content: string) => Promise<{
    success?: boolean;
    error?: string;
  }>;
  getConfig: (key: string) => Promise<unknown>;
  setConfig: (key: string, value: unknown) => Promise<{ success?: boolean; error?: string }>;
  buildSemanticMap: (workspacePath: string, options?: { force?: boolean; useMock?: boolean }) => Promise<{
    json?: string;
    fileCount?: number;
    fromCache?: boolean;
    nodeCount?: number;
    provider?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

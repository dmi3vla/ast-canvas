/// <reference types="vite/client" />

interface ElectronAPI {
  openWorkspace: () => Promise<string | null>;
  getLastWorkspace: () => Promise<string | null>;
  listFiles: (dirPath: string) => Promise<{
    dirPath: string;
    files: { name: string; isDirectory: boolean; path: string }[];
    error?: string;
  }>;
  readFile: (filePath: string, resolveRelative?: boolean) => Promise<{
    content?: string;
    size?: number;
    mtime?: string;
    path?: string;
    needsWorkspace?: boolean;
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
  getDepGraph: (workspacePath: string, fileAnchors?: string[], depth?: number) => Promise<{
    center?: string;
    centers?: string[];
    nodeCount?: number;
    edgeCount?: number;
    edges?: { from: string; to: string; kind: string; line?: number }[];
    nodes?: { id: string; name?: string; kind?: string }[];
    error?: string;
    needsWorkspace?: boolean;
  }>;
  getNodeCodemap: (payload: {
    nodeId: string;
    text?: string;
    summary?: string;
    fileAnchors?: string[];
    force?: boolean;
    enrich?: boolean;
  }) => Promise<{
    codemap?: {
      title: string;
      traces: {
        id: string;
        title: string;
        description: string;
        locations: { id: string; path: string; lineNumber: number; title?: string; description?: string }[];
      }[];
    };
    fromCache?: boolean;
    enriched?: boolean;
    error?: string;
    needsWorkspace?: boolean;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

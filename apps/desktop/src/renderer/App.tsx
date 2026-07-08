import React, { useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { LeftPane } from './components/LeftPane';
import { Splitter } from './components/Splitter';
import { RightPane } from './components/RightPane';

export type RightMode = 'empty' | 'content' | 'codemap' | 'source';

export interface UIMockNode {
  id: string;
  title: string;
  type: 'text' | 'file' | 'semantic';
  summary: string;
  fileCount?: number;
}

export interface AppState {
  leftRatio: number;
  selectedNodeId: string | null;
  rightMode: RightMode;
  source?: { path: string; line: number };
  workspacePath: string | null;
  fileCount: number;
}

const MOCK_NODES: UIMockNode[] = [
  {
    id: 'node-1',
    title: 'Architecture Overview',
    type: 'semantic',
    summary: 'High-level architecture: Electron main process, React renderer, split-pane layout with resizable panels. IPC-based communication between main and renderer.',
    fileCount: 3,
  },
  {
    id: 'node-2',
    title: 'Canvas Core Engine',
    type: 'text',
    summary: 'Canvas2D rendering engine ported from InfiniteCanvasSimple. Supports pan, zoom, drag, connection drawing, and Obsidian .canvas format.',
    fileCount: 5,
  },
  {
    id: 'node-3',
    title: 'README.md',
    type: 'file',
    summary: 'Project documentation with setup instructions, architecture overview, and development phases.',
    fileCount: 1,
  },
];

export function App() {
  const [state, setState] = useState<AppState>({
    leftRatio: 0.6,
    selectedNodeId: null,
    rightMode: 'empty',
    workspacePath: null,
    fileCount: 0,
  });

  // Load persisted ratio
  useEffect(() => {
    const loadRatio = async () => {
      try {
        if (window.electronAPI) {
          const config = await window.electronAPI.getConfig('ui-settings') as { leftRatio?: number } | null;
          if (config?.leftRatio && typeof config.leftRatio === 'number') {
            setState(s => ({ ...s, leftRatio: config.leftRatio as number }));
          }
        }
      } catch {
        // use default
      }
    };
    loadRatio();
  }, []);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setState(s => ({ ...s, selectedNodeId: null, rightMode: 'empty', source: undefined }));
      return;
    }
    const node = MOCK_NODES.find(n => n.id === nodeId);
    setState(s => ({
      ...s,
      selectedNodeId: nodeId,
      rightMode: 'content',
      source: undefined,
    }));
  }, []);

  const handleSetRightMode = useCallback((mode: RightMode) => {
    setState(s => ({ ...s, rightMode: mode }));
  }, []);

  const handleOpenSource = useCallback((path: string, line: number) => {
    setState(s => ({
      ...s,
      rightMode: 'source',
      source: { path, line },
    }));
  }, []);

  const handleSetRatio = useCallback(async (ratio: number) => {
    setState(s => ({ ...s, leftRatio: ratio }));
    // Persist
    try {
      if (window.electronAPI) {
        await window.electronAPI.setConfig('ui-settings', { leftRatio: ratio });
      }
    } catch {
      // non-critical
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const folderPath = await window.electronAPI.openWorkspace();
        if (folderPath) {
          const result = await window.electronAPI.listFiles(folderPath);
          setState(s => ({
            ...s,
            workspacePath: folderPath,
            fileCount: result.files?.length ?? 0,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }, []);

  // Keyboard: Esc → clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSelectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectNode]);

  const selectedNode = state.selectedNodeId
    ? MOCK_NODES.find(n => n.id === state.selectedNodeId) ?? null
    : null;

  return (
    <div className="app-shell">
      <Toolbar
        workspacePath={state.workspacePath}
        fileCount={state.fileCount}
        onOpenFolder={handleOpenFolder}
      />
      <div className="app-main">
        <div className="left-pane" style={{ flex: `0 0 ${state.leftRatio * 100}%` }}>
          <LeftPane
            nodes={MOCK_NODES}
            selectedNodeId={state.selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
        <Splitter ratio={state.leftRatio} onRatioChange={handleSetRatio} />
        <div className="right-pane" style={{ flex: 1 }}>
          <RightPane
            mode={state.rightMode}
            node={selectedNode}
            source={state.source}
            onSetMode={handleSetRightMode}
            onOpenSource={handleOpenSource}
          />
        </div>
      </div>
    </div>
  );
}

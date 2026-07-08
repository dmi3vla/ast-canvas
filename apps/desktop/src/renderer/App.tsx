import React, { useState, useCallback, useEffect } from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';
import { Toolbar } from './components/Toolbar';
import { LeftPane } from './components/LeftPane';
import { Splitter } from './components/Splitter';
import { RightPane } from './components/RightPane';

export type { RightMode };

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

export function App() {
  const [state, setState] = useState<AppState>({
    leftRatio: 0.6,
    selectedNodeId: null,
    rightMode: 'empty',
    workspacePath: null,
    fileCount: 0,
  });

  // Load persisted ratio + auto-load last workspace
  useEffect(() => {
    const loadPersisted = async () => {
      try {
        if (window.electronAPI) {
          const config = await window.electronAPI.getConfig('ui-settings') as { leftRatio?: number } | null;
          if (config?.leftRatio && typeof config.leftRatio === 'number') {
            setState(s => ({ ...s, leftRatio: config.leftRatio as number }));
          }

          // Auto-load last workspace
          const lastPath = await window.electronAPI.getLastWorkspace();
          if (lastPath) {
            const result = await window.electronAPI.listFiles(lastPath);
            if (!result.error) {
              setState(s => ({
                ...s,
                workspacePath: lastPath,
                fileCount: result.files?.length ?? 0,
              }));
            }
          }
        }
      } catch {
        // use defaults
      }
    };
    loadPersisted();
  }, []);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setState(s => ({
      ...s,
      selectedNodeId: nodeId,
      rightMode: nodeId ? 'content' : 'empty',
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

  const handleSetRatio = useCallback((ratio: number) => {
    // Local-only update during drag (fast, no I/O)
    setState(s => ({ ...s, leftRatio: ratio }));
  }, []);

  const handleDragEnd = useCallback(async (ratio: number) => {
    // Persist only when drag ends (avoid thrashing)
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

  return (
    <div className="app-shell">
      <Toolbar
        workspacePath={state.workspacePath}
        fileCount={state.fileCount}
        onOpenFolder={handleOpenFolder}
      />
      <div className="app-main">
        <div className="left-pane" style={{ flex: `0 0 ${state.leftRatio * 100}%` }}>
          <LeftPane onSelectNode={handleSelectNode} />
        </div>
        <Splitter ratio={state.leftRatio} onRatioChange={handleSetRatio} onDragEnd={handleDragEnd} />
        <div className="right-pane-shell" style={{ flex: 1 }}>
          <RightPane
            mode={state.rightMode}
            nodeId={state.selectedNodeId}
            source={state.source}
            onSetMode={handleSetRightMode}
            onOpenSource={handleOpenSource}
          />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';
import type { CanvasViewHandle, ICNode } from '@infinity-canvas/canvas-core';
import { Toolbar } from './components/Toolbar';
import { LeftPane } from './components/LeftPane';
import { Splitter } from './components/Splitter';
import { RightPane } from './components/RightPane';

export type { RightMode };

export interface AppState {
  leftRatio: number;
  selectedNodeId: string | null;
  selectedNode: ICNode | null;
  rightMode: RightMode;
  source?: { path: string; line: number };
  workspacePath: string | null;
  fileCount: number;
  isLoading: boolean;
  mapNodeCount: number;
  fromCache: boolean;
}

export function App() {
  const [state, setState] = useState<AppState>({
    leftRatio: 0.6,
    selectedNodeId: null,
    selectedNode: null,
    rightMode: 'empty',
    workspacePath: null,
    fileCount: 0,
    isLoading: false,
    mapNodeCount: 0,
    fromCache: false,
  });

  const canvasRef = useRef<CanvasViewHandle>(null);
  const [canvasData, setCanvasData] = useState<string | null>(null);

  // Build semantic map for a workspace path
  const buildMap = useCallback(async (workspacePath: string, force = false) => {
    if (!window.electronAPI) return;
    setState(s => ({ ...s, isLoading: true }));

    try {
      const result = await window.electronAPI.buildSemanticMap(workspacePath, { force });
      if (result.error) {
        console.error('Semantic map error:', result.error);
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      if (result.json) {
        setCanvasData(result.json);
        // Also push into canvas handle (covers race if effect already ran)
        queueMicrotask(() => {
          canvasRef.current?.loadData(result.json!);
        });
      }

      setState(s => ({
        ...s,
        workspacePath,
        fileCount: result.fileCount ?? 0,
        mapNodeCount: result.nodeCount ?? 0,
        fromCache: result.fromCache ?? false,
        isLoading: false,
        selectedNodeId: null,
        selectedNode: null,
        rightMode: 'empty',
        source: undefined,
      }));
    } catch (err) {
      console.error('Build map failed:', err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  // Load persisted ratio + auto-load last workspace
  useEffect(() => {
    const loadPersisted = async () => {
      try {
        if (window.electronAPI) {
          const config = await window.electronAPI.getConfig('ui-settings') as { leftRatio?: number } | null;
          if (config?.leftRatio && typeof config.leftRatio === 'number') {
            setState(s => ({ ...s, leftRatio: config.leftRatio as number }));
          }

          // Auto-load last workspace + build semantic map
          const lastPath = await window.electronAPI.getLastWorkspace();
          if (lastPath) {
            await buildMap(lastPath);
          }
        }
      } catch {
        // use defaults
      }
    };
    loadPersisted();
  }, [buildMap]);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    const node = nodeId
      ? (canvasRef.current?.state.getNodeById(nodeId) ?? null)
      : null;
    // clone plain fields for React state
    const snap: ICNode | null = node
      ? {
          ...node,
          semantic: node.semantic ? { ...node.semantic } : undefined,
          graph: node.graph ? { ...node.graph } : undefined,
        }
      : null;
    setState(s => ({
      ...s,
      selectedNodeId: nodeId,
      selectedNode: snap,
      rightMode: nodeId ? 'content' : 'empty',
      source: undefined,
    }));
  }, []);

  const handleSetRightMode = useCallback((mode: RightMode) => {
    setState(s => ({ ...s, rightMode: mode }));
  }, []);

  const handleOpenSource = useCallback((path: string, line: number) => {
    setState(s => {
      // Resolve relative paths against workspace for main path guard
      let abs = path;
      if (s.workspacePath && !path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) {
        abs = `${s.workspacePath.replace(/\/$/, '')}/${path.replace(/^\.\//, '')}`;
      }
      return {
        ...s,
        rightMode: 'source',
        source: { path: abs, line },
      };
    });
  }, []);

  const handleSetRatio = useCallback((ratio: number) => {
    setState(s => ({ ...s, leftRatio: ratio }));
  }, []);

  const handleDragEnd = useCallback(async (ratio: number) => {
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
          await buildMap(folderPath);
        }
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }, [buildMap]);

  const handleRegenerate = useCallback(async () => {
    if (state.workspacePath) {
      await buildMap(state.workspacePath, true);
    }
  }, [state.workspacePath, buildMap]);

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
        isLoading={state.isLoading}
        mapNodeCount={state.mapNodeCount}
        fromCache={state.fromCache}
        onOpenFolder={handleOpenFolder}
        onRegenerate={handleRegenerate}
      />
      <div className="app-main">
        <div className="left-pane" style={{ flex: `0 0 ${state.leftRatio * 100}%` }}>
          <LeftPane
            ref={canvasRef}
            onSelectNode={handleSelectNode}
            initialData={canvasData}
          />
        </div>
        <Splitter ratio={state.leftRatio} onRatioChange={handleSetRatio} onDragEnd={handleDragEnd} />
        <div className="right-pane-shell" style={{ flex: 1 }}>
          <RightPane
            mode={state.rightMode}
            nodeId={state.selectedNodeId}
            node={state.selectedNode}
            source={state.source}
            onSetMode={handleSetRightMode}
            onOpenSource={handleOpenSource}
          />
        </div>
      </div>
    </div>
  );
}

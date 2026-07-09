import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';
import type { CanvasViewHandle, ICNode } from '@infinity-canvas/canvas-core';
import { DEMO_CANVAS_JSON } from '@infinity-canvas/canvas-core';
import { Toolbar } from './components/Toolbar';
import { LeftPane } from './components/LeftPane';
import { Splitter } from './components/Splitter';
import { RightPane } from './components/RightPane';

export type { RightMode };

export interface NavEntry {
  mode: RightMode;
  source?: { path: string; line: number };
  title?: string;
}

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
  navStack: NavEntry[]; // breadcrumb history
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
    navStack: [],
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
        navStack: [],
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
      navStack: [], // reset stack on new selection
    }));
  }, []);

  const nodeTitle = (s: AppState) =>
    s.selectedNode?.text?.split('\n')[0]?.replace(/^#+\s*/, '') || s.selectedNodeId || 'Node';

  const handleSetRightMode = useCallback((mode: RightMode) => {
    setState(s => {
      if (mode === s.rightMode) return s;
      return {
        ...s,
        rightMode: mode,
        // Always push current so Content→Codemap can go Back
        navStack: [
          ...s.navStack,
          {
            mode: s.rightMode,
            source: s.source,
            title: nodeTitle(s),
          },
        ],
      };
    });
  }, []);

  const handleOpenSource = useCallback((path: string, line: number) => {
    if (!state.workspacePath && !path.startsWith('/')) {
      alert('Please open a workspace folder first to view source files.\n\nUse "Open Folder" in the toolbar.');
      return;
    }
    setState(s => {
      let abs = path;
      if (s.workspacePath && !path.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(path)) {
        abs = `${s.workspacePath.replace(/\/$/, '')}/${path.replace(/^\.\//, '')}`;
      }
      return {
        ...s,
        rightMode: 'source',
        source: { path: abs, line },
        navStack: [
          ...s.navStack,
          {
            mode: s.rightMode,
            source: s.source,
            title: s.rightMode === 'source' ? s.source?.path.split('/').pop() : nodeTitle(s),
          },
        ],
      };
    });
  }, [state.workspacePath]);

  const handleNavBack = useCallback(() => {
    setState(s => {
      if (s.navStack.length === 0) {
        // Clear selection when stack empty
        return {
          ...s,
          selectedNodeId: null,
          selectedNode: null,
          rightMode: 'empty',
          source: undefined,
          navStack: [],
        };
      }
      const prev = s.navStack[s.navStack.length - 1];
      return {
        ...s,
        rightMode: prev.mode,
        source: prev.source,
        navStack: s.navStack.slice(0, -1),
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

  const handleLoadDemo = useCallback(() => {
    setCanvasData(DEMO_CANVAS_JSON);
    setState(s => ({
      ...s,
      // Keep workspace if already open — Source/deps still resolve
      mapNodeCount: 21,
      fromCache: false,
      selectedNodeId: null,
      selectedNode: null,
      rightMode: 'empty',
      source: undefined,
      navStack: [],
    }));
  }, []);

  // Keyboard: Esc → nav back or clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState(s => {
          if (s.navStack.length > 0) {
            const prev = s.navStack[s.navStack.length - 1];
            return { ...s, rightMode: prev.mode, source: prev.source, navStack: s.navStack.slice(0, -1) };
          }
          handleSelectNode(null);
          return s;
        });
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
        onLoadDemo={handleLoadDemo}
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
            breadcrumb={[
              state.selectedNode?.text?.split('\n')[0]?.replace(/^#+\s*/, '') || state.selectedNodeId || 'Node',
              ...(state.rightMode === 'codemap' || state.rightMode === 'source' ? ['Codemap'] : []),
              ...(state.rightMode === 'source' && state.source
                ? [`${state.source.path.split('/').pop()}:${state.source.line}`]
                : []),
            ].filter(Boolean) as string[]}
            onSetMode={handleSetRightMode}
            onOpenSource={handleOpenSource}
            onBack={handleNavBack}
            canGoBack={state.navStack.length > 0}
          />
        </div>
      </div>
    </div>
  );
}

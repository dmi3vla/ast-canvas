import React from 'react';

interface ToolbarProps {
  workspacePath: string | null;
  fileCount: number;
  isLoading: boolean;
  mapNodeCount: number;
  fromCache: boolean;
  onOpenFolder: () => void;
  onRegenerate: () => void;
}

export function Toolbar({ workspacePath, fileCount, isLoading, mapNodeCount, fromCache, onOpenFolder, onRegenerate }: ToolbarProps) {
  return (
    <div className="toolbar">
      <span className="toolbar__title">∞ Infinity Canvas</span>
      <button onClick={onOpenFolder}>Open Folder</button>
      {workspacePath && (
        <>
          <span className="toolbar__workspace" title={workspacePath}>
            📁 {workspacePath.split('/').pop() || workspacePath}
          </span>
          <span className="toolbar__file-count">
            {isLoading ? '⏳ Loading...' : `${fileCount} files · ${mapNodeCount} nodes${fromCache ? ' (cached)' : ''}`}
          </span>
          <button onClick={onRegenerate} disabled={isLoading} style={{ opacity: isLoading ? 0.5 : 1 }}>
            🔄 Regenerate
          </button>
        </>
      )}
      <span className="toolbar__spacer" />
      <span className="toolbar__title" style={{ opacity: 0.5 }}>Phase 4 — Semantic Map</span>
    </div>
  );
}

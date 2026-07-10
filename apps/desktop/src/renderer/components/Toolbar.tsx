import React from 'react';

interface ToolbarProps {
  workspacePath: string | null;
  fileCount: number;
  isLoading: boolean;
  mapNodeCount: number;
  fromCache: boolean;
  onOpenFolder: () => void;
  onRegenerate: () => void;
  onLoadDemo: () => void;
  onLoadPlanVsResult: () => void;
  onExport: () => void;
  onImport: () => void;
  onImportLanggraph: () => void;
}

export function Toolbar({
  workspacePath, fileCount, isLoading, mapNodeCount, fromCache,
  onOpenFolder, onRegenerate, onLoadDemo, onLoadPlanVsResult,
  onExport, onImport, onImportLanggraph,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <span className="toolbar__title">∞ Infinity Canvas</span>
      <button onClick={onOpenFolder}>Open Folder</button>
      {workspacePath ? (
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
      ) : (
        <>
          <span className="toolbar__workspace" style={{ color: 'var(--text-muted)' }}>
            Open Folder · Demo · Plan|Result
          </span>
        </>
      )}
      <span className="toolbar__spacer" />
      {workspacePath && (
        <>
          <button onClick={onExport} title="Export research bundle" style={{ fontSize: 11 }}>
            📤 Export
          </button>
          <button onClick={onImport} title="Import .codemap file" style={{ fontSize: 11 }}>
            📥 Import
          </button>
          <button onClick={onImportLanggraph} title="Import langgraph.codemap from workspace root" style={{ fontSize: 11 }}>
            📥 langgraph
          </button>
        </>
      )}
      <button onClick={onLoadDemo} title="Load monorepo demo map" style={{ fontSize: 11, background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
        📋 Demo
      </button>
      <button
        onClick={onLoadPlanVsResult}
        title="PLAN tree (AGENT_PLAN) vs RESULT tree (STATUS) — see docs/VERIFY.md"
        style={{ fontSize: 11, background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        🌳 Plan|Result
      </button>
      <span className="toolbar__title" style={{ opacity: 0.5 }}>MVP · docs/VERIFY.md</span>
    </div>
  );
}

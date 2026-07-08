import React from 'react';

interface ToolbarProps {
  workspacePath: string | null;
  fileCount: number;
  onOpenFolder: () => void;
}

export function Toolbar({ workspacePath, fileCount, onOpenFolder }: ToolbarProps) {
  return (
    <div className="toolbar">
      <span className="toolbar__title">∞ Infinity Canvas</span>
      <button onClick={onOpenFolder}>Open Folder</button>
      {workspacePath && (
        <>
          <span className="toolbar__workspace" title={workspacePath}>
            📁 {workspacePath.split('/').pop() || workspacePath}
          </span>
          <span className="toolbar__file-count">{fileCount} files</span>
        </>
      )}
      <span className="toolbar__spacer" />
      <span className="toolbar__title" style={{ opacity: 0.5 }}>Phase 2.3 — Split Shell</span>
    </div>
  );
}

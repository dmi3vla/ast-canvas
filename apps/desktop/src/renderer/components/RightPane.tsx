import React from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';

interface RightPaneProps {
  mode: RightMode;
  nodeId: string | null;
  source?: { path: string; line: number };
  onSetMode: (mode: RightMode) => void;
  onOpenSource: (path: string, line: number) => void;
}

const MOCK_CODEMAP_DEPS_IN = [
  { icon: '📦', name: 'packages/canvas-core', symbols: 'CanvasState, InputHandler' },
  { icon: '📦', name: 'packages/schema', symbols: 'ICNode, ICEdge' },
  { icon: '📦', name: 'react', symbols: 'useState, useEffect' },
];

const MOCK_CODEMAP_DERIVES_OUT = [
  { icon: '📤', name: 'apps/desktop/src/renderer/App.tsx', symbols: 'App component' },
  { icon: '📤', name: 'apps/desktop/src/renderer/components/RightPane.tsx', symbols: 'RightPane' },
];

const MOCK_CODEMAP_LOCATIONS = [
  { id: '1a', path: 'src/main/index.ts', line: 42, desc: 'createWindow() — BrowserWindow setup' },
  { id: '1b', path: 'src/main/index.ts', line: 88, desc: 'IPC handler: dialog:openWorkspace' },
  { id: '2a', path: 'src/renderer/App.tsx', line: 60, desc: 'handleSelectNode — node selection handler' },
];

const MOCK_SOURCE = `// src/main/index.ts — Infinity Canvas main process

import { app, BrowserWindow, ipcMain, dialog } from 'electron';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Infinity Canvas',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

// IPC: Open workspace folder
ipcMain.handle('dialog:openWorkspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Workspace Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});`;

export function RightPane({ mode, nodeId, source, onSetMode, onOpenSource }: RightPaneProps) {
  // Empty state
  if (mode === 'empty' || !nodeId) {
    return (
      <div className="right-pane">
        <div className="right-pane__empty">
          <div className="right-pane__empty-icon">🗺️</div>
          <div className="right-pane__empty-text">Select a node on the canvas</div>
          <div className="right-pane__empty-hint">
            Click any node in the left panel to see its content here. Use <strong>Esc</strong> to clear selection.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-pane">
      {/* Header */}
      <div className="right-pane__header">
        <div className="right-pane__title">Node: {nodeId}</div>
        <div className="right-pane__actions">
          <button
            onClick={() => onSetMode('content')}
            style={mode === 'content' ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
          >
            📋 Content
          </button>
          <button
            onClick={() => onSetMode('codemap')}
            style={mode === 'codemap' ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
          >
            🔍 Codemap
          </button>
          <button
            onClick={() => onOpenSource('src/main/index.ts', 42)}
            style={mode === 'source' ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
          >
            📝 Source
          </button>
        </div>
      </div>

      {/* Content mode */}
      {mode === 'content' && (
        <div className="right-pane__content">
          <p className="right-pane__summary">
            Canvas node <strong>{nodeId}</strong> is selected.
            Click <em>Codemap</em> to view dependencies and traces,
            or <em>Source</em> to jump to the source file.
          </p>
          <div className="right-pane__meta">
            <div className="right-pane__meta-item">
              <span className="right-pane__meta-value">1</span>
              <span className="right-pane__meta-label">Node</span>
            </div>
            <div className="right-pane__meta-item">
              <span className="right-pane__meta-value">text</span>
              <span className="right-pane__meta-label">Type</span>
            </div>
          </div>
        </div>
      )}

      {/* Codemap mode */}
      {mode === 'codemap' && (
        <div className="right-pane__content">
          <div className="codemap-section">
            <div className="codemap-section__title">📦 Deps In (imports)</div>
            <ul className="codemap-list">
              {MOCK_CODEMAP_DEPS_IN.map((dep, i) => (
                <li key={i} className="codemap-list__item">
                  <span className="codemap-list__icon">{dep.icon}</span>
                  <span style={{ fontWeight: 500 }}>{dep.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→ {dep.symbols}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="codemap-section">
            <div className="codemap-section__title">📤 Derives Out (used by)</div>
            <ul className="codemap-list">
              {MOCK_CODEMAP_DERIVES_OUT.map((dep, i) => (
                <li key={i} className="codemap-list__item">
                  <span className="codemap-list__icon">{dep.icon}</span>
                  <span style={{ fontWeight: 500 }}>{dep.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→ {dep.symbols}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="codemap-section">
            <div className="codemap-section__title">📍 Locations (traces)</div>
            <ul className="codemap-list">
              {MOCK_CODEMAP_LOCATIONS.map((loc) => (
                <li
                  key={loc.id}
                  className="codemap-list__item"
                  onClick={() => onOpenSource(loc.path, loc.line)}
                >
                  <span className="codemap-list__icon">[{loc.id}]</span>
                  <span style={{ color: 'var(--accent)' }}>{loc.path}:{loc.line}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{loc.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Source mode */}
      {mode === 'source' && (
        <div className="right-pane__content">
          {source ? (
            <>
              <div className="source-view__header">
                📄 {source.path} (line {source.line})
              </div>
              <div className="source-view">
                {MOCK_SOURCE.split('\n').map((line, i) => {
                  const lineNum = i + 1;
                  const isHighlighted = lineNum === source.line;
                  return (
                    <div key={i} style={{ display: 'flex' }}>
                      <span className={`source-view__line ${isHighlighted ? 'source-view__line--highlight' : ''}`}>
                        {String(lineNum).padStart(3, ' ')}
                      </span>
                      <span style={{ color: isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="right-pane__empty">
              <div className="right-pane__empty-icon">📝</div>
              <div className="right-pane__empty-text">No source file selected</div>
              <div className="right-pane__empty-hint">
                Click a location in <strong>Codemap</strong> mode to view source here.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

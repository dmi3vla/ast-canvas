import React from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';
import type { ICNode } from '@infinity-canvas/canvas-core';

interface RightPaneProps {
  mode: RightMode;
  nodeId: string | null;
  node: ICNode | null;
  source?: { path: string; line: number };
  onSetMode: (mode: RightMode) => void;
  onOpenSource: (path: string, line: number) => void;
}

export function RightPane({ mode, nodeId, node, source, onSetMode, onOpenSource }: RightPaneProps) {
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

  const title = node?.text?.split('\n')[0]?.replace(/^#+\s*/, '') || nodeId;
  const summary = node?.semantic?.summary || '';
  // Strip markdown headers from raw text for body display
  const cleanBody = node?.text
    ? node.text.split('\n').filter(l => !l.match(/^#+\s/)).join('\n').trim()
    : '';
  const anchors = node?.semantic?.fileAnchors || (node?.file ? [node.file] : []);
  const kind = node?.semantic?.kind || node?.type || 'text';

  const openFirstAnchor = () => {
    if (anchors[0]) onOpenSource(anchors[0], 1);
    else if (node?.graph?.path) onOpenSource(node.graph.path, 1);
  };

  return (
    <div className="right-pane">
      <div className="right-pane__header">
        <div className="right-pane__title" title={nodeId}>{title}</div>
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
            onClick={openFirstAnchor}
            style={mode === 'source' ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
          >
            📝 Source
          </button>
        </div>
      </div>

      {mode === 'content' && (
        <div className="right-pane__content">
          <p className="right-pane__summary" style={{ whiteSpace: 'pre-wrap' }}>
            {summary || cleanBody || `Node ${nodeId}`}
          </p>
          {cleanBody && summary && (
            <pre style={{
              marginTop: 12,
              padding: 10,
              background: 'var(--cards-bg, #1a1a1a)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--text-secondary, #aaa)',
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflow: 'auto',
            }}>
              {cleanBody}
            </pre>
          )}
          <div className="right-pane__meta">
            <div className="right-pane__meta-item">
              <span className="right-pane__meta-value">{kind}</span>
              <span className="right-pane__meta-label">Kind</span>
            </div>
            <div className="right-pane__meta-item">
              <span className="right-pane__meta-value">{node?.type || '—'}</span>
              <span className="right-pane__meta-label">Type</span>
            </div>
            <div className="right-pane__meta-item">
              <span className="right-pane__meta-value" style={{ fontSize: 11 }}>{nodeId}</span>
              <span className="right-pane__meta-label">Id</span>
            </div>
          </div>
          {anchors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="codemap-section__title">📎 File anchors</div>
              <ul className="codemap-list">
                {anchors.map((a) => (
                  <li
                    key={a}
                    className="codemap-list__item"
                    onClick={() => onOpenSource(a, 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="codemap-list__icon">📄</span>
                    <span style={{ color: 'var(--accent)' }}>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === 'codemap' && (
        <div className="right-pane__content">
          <DepGraphSection anchors={anchors} nodeId={nodeId} onOpenSource={onOpenSource} />
          {node?.semantic?.traceIds && node.semantic.traceIds.length > 0 && (
            <div className="codemap-section">
              <div className="codemap-section__title">🔗 Trace ids</div>
              <ul className="codemap-list">
                {node.semantic.traceIds.map((t) => (
                  <li key={t} className="codemap-list__item">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === 'source' && (
        <div className="right-pane__content">
          {source ? (
            <>
              <div className="source-view__header">
                📄 {source.path}{source.line ? ` (line ${source.line})` : ''}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
                Open this path in the workspace via file read (Phase 7: monaco).
                Path is relative or absolute under the opened folder.
              </p>
              <SourcePreview path={source.path} line={source.line} />
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No source path for this node.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DepGraphSection({ anchors, nodeId, onOpenSource }: { anchors: string[]; nodeId: string; onOpenSource: (path: string, line: number) => void }) {
  const [depData, setDepData] = React.useState<{
    edges?: { from: string; to: string; kind: string; line?: number }[];
    nodes?: { id: string; name?: string; kind?: string }[];
    center?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (anchors.length === 0 || !window.electronAPI?.getDepGraph) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await window.electronAPI!.getDepGraph('', anchors);
        if (!cancelled) setDepData(data);
      } catch {
        if (!cancelled) setDepData({ error: 'Failed to load dep graph' });
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [anchors.join(',')]);

  if (loading) {
    return <div className="codemap-section" style={{ color: 'var(--text-muted)' }}>⏳ Loading dependency graph...</div>;
  }

  if (depData?.error || (!depData?.edges && !depData?.nodes)) {
    // Fallback: show static anchors
    return (
      <div className="codemap-section">
        <div className="codemap-section__title">📍 File anchors (from semantic node)</div>
        {anchors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No file anchors on this node. Open a workspace to compute deps.</p>
        ) : (
          <ul className="codemap-list">
            {anchors.map((a, i) => (
              <li key={a} className="codemap-list__item" onClick={() => onOpenSource(a, 1)} style={{ cursor: 'pointer' }}>
                <span className="codemap-list__icon">[{String.fromCharCode(97 + (i % 26))}]</span>
                <span style={{ color: 'var(--accent)' }}>{a}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Real dep-graph data
  const depsIn = (depData.edges || []).filter(e => e.to === depData.center);
  const depsOut = (depData.edges || []).filter(e => e.from === depData.center);

  return (
    <>
      <div className="codemap-section">
        <div className="codemap-section__title">📦 Deps in ({depsIn.length})</div>
        {depsIn.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No incoming dependencies</p>
        ) : (
          <ul className="codemap-list">
            {depsIn.map((e, i) => (
              <li key={i} className="codemap-list__item" onClick={() => onOpenSource(e.from, e.line || 1)} style={{ cursor: 'pointer' }}>
                <span className="codemap-list__icon">📥</span>
                <span style={{ color: 'var(--accent)' }}>{e.from}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{e.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="codemap-section">
        <div className="codemap-section__title">📤 Derives out ({depsOut.length})</div>
        {depsOut.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No outgoing dependencies</p>
        ) : (
          <ul className="codemap-list">
            {depsOut.map((e, i) => (
              <li key={i} className="codemap-list__item" onClick={() => onOpenSource(e.to, e.line || 1)} style={{ cursor: 'pointer' }}>
                <span className="codemap-list__icon">📤</span>
                <span style={{ color: 'var(--accent)' }}>{e.to}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{e.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Center: {depData.center} · {depData.nodes?.length || 0} nodes · {depData.edges?.length || 0} edges
      </div>
    </>
  );
}

function SourcePreview({ path, line }: { path: string; line: number }) {
  const [text, setText] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.electronAPI?.readFile) {
        setError('readFile API unavailable');
        return;
      }
      // Try as-is; main only allows paths under workspace
      const res = await window.electronAPI.readFile(path, true);
      if (cancelled) return;
      if (res.error) {
        // try join is not available — show error
        setError(res.error);
        setText(null);
      } else {
        setText(res.content ?? '');
        setError(null);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  if (error) {
    return (
      <pre className="source-view" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        {error}
        {'\n'}Hint: open a workspace folder first; paths must be under workspace root.
      </pre>
    );
  }
  if (text == null) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  }

  const lines = text.split('\n');
  return (
    <div className="source-view">
      {lines.map((ln, i) => {
        const lineNum = i + 1;
        const isHighlighted = lineNum === line;
        return (
          <div key={i} style={{ display: 'flex' }}>
            <span className={`source-view__line ${isHighlighted ? 'source-view__line--highlight' : ''}`}>
              {String(lineNum).padStart(4, ' ')}
            </span>
            <span style={{ color: isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {ln || ' '}
            </span>
          </div>
        );
      })}
    </div>
  );
}

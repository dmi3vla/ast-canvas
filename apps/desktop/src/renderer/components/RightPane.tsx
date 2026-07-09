import React from 'react';
import type { RightMode } from '@infinity-canvas/detail-pane';
import type { ICNode } from '@infinity-canvas/canvas-core';

interface RightPaneProps {
  mode: RightMode;
  nodeId: string | null;
  node: ICNode | null;
  source?: { path: string; line: number };
  breadcrumb?: string[];
  onSetMode: (mode: RightMode) => void;
  onOpenSource: (path: string, line: number) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function RightPane({
  mode, nodeId, node, source, breadcrumb,
  onSetMode, onOpenSource, onBack, canGoBack,
}: RightPaneProps) {
  if (mode === 'empty' || !nodeId) {
    return (
      <div className="right-pane">
        <div className="right-pane__empty">
          <div className="right-pane__empty-icon">🗺️</div>
          <div className="right-pane__empty-text">Select a node on the canvas</div>
          <div className="right-pane__empty-hint">
            Click any node in the left panel to see its content here. Use <strong>Esc</strong> to go back or clear selection.
          </div>
        </div>
      </div>
    );
  }

  const title = node?.text?.split('\n')[0]?.replace(/^#+\s*/, '') || nodeId;
  const summary = node?.semantic?.summary || '';
  const cleanBody = node?.text
    ? node.text.split('\n').filter(l => !l.match(/^#+\s/)).join('\n').trim()
    : '';
  const anchors = node?.semantic?.fileAnchors || (node?.file ? [node.file] : []);
  const kind = node?.semantic?.kind || node?.type || 'text';

  const openFirstAnchor = () => {
    if (anchors[0]) onOpenSource(anchors[0], 1);
    else if (node?.graph?.path) onOpenSource(node.graph.path, 1);
  };

  const crumbs = breadcrumb && breadcrumb.length > 0
    ? breadcrumb
    : [title, mode !== 'content' ? mode : ''].filter(Boolean);

  return (
    <div className="right-pane">
      <div className="right-pane__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canGoBack && onBack && (
              <button
                onClick={onBack}
                title="Back (Esc)"
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}
              >←</button>
            )}
            <div className="right-pane__title" title={nodeId} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mode === 'source' && source ? source.path.split('/').pop() : title}
            </div>
          </div>
          {crumbs.length > 1 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: canGoBack ? 28 : 0 }}>
              {crumbs.join(' › ')}
            </div>
          )}
        </div>
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
              marginTop: 12, padding: 10, background: 'var(--cards-bg, #1a1a1a)',
              borderRadius: 6, fontSize: 12, color: 'var(--text-secondary, #aaa)',
              whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
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
                  <li key={a} className="codemap-list__item" onClick={() => onOpenSource(a, 1)} style={{ cursor: 'pointer' }}>
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
          <StructuralTraces
            nodeId={nodeId}
            text={node?.text}
            summary={summary}
            anchors={anchors}
            onOpenSource={onOpenSource}
          />
        </div>
      )}

      {mode === 'source' && (
        <div className="right-pane__content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {source ? (
            <SourcePreview path={source.path} line={source.line} />
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No source path for this node.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── DepGraph section ────────────────────────────────────

function DepGraphSection({
  anchors, onOpenSource,
}: {
  anchors: string[];
  nodeId: string;
  onOpenSource: (path: string, line: number) => void;
}) {
  const [depData, setDepData] = React.useState<{
    edges?: { from: string; to: string; kind: string; line?: number }[];
    nodes?: { id: string; name?: string; kind?: string }[];
    center?: string;
    centers?: string[];
    error?: string;
    needsWorkspace?: boolean;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [depth, setDepth] = React.useState(1);

  const fetchData = React.useCallback((d: number) => {
    if (anchors.length === 0 || !window.electronAPI?.getDepGraph) return () => {};
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await window.electronAPI!.getDepGraph('', anchors, d);
        if (!cancelled) setDepData(data);
      } catch {
        if (!cancelled) setDepData({ error: 'Failed to load dep graph' });
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [anchors.join(',')]);

  React.useEffect(() => fetchData(depth), [fetchData, depth]);

  const isExternal = (id: string) => id.startsWith('external:');
  const nodeName = (id: string) => isExternal(id) ? id.replace('external:', '') : id;

  if (loading) {
    return <div className="codemap-section" style={{ color: 'var(--text-muted)', padding: '12px 0' }}>⏳ Loading dependency graph...</div>;
  }

  if (depData?.needsWorkspace || depData?.error || (!depData?.edges && !depData?.nodes)) {
    return (
      <div className="codemap-section">
        <div className="codemap-section__title">📍 File anchors</div>
        {anchors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No file anchors. Open a workspace to compute dependencies.</p>
        ) : (
          <>
            {(depData?.needsWorkspace || depData?.error) && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                {depData?.needsWorkspace
                  ? 'Open Folder to compute real dependency graph.'
                  : (depData?.error || 'Deps unavailable — showing anchors.')}
              </p>
            )}
            <ul className="codemap-list">
              {anchors.map((a) => (
                <li key={a} className="codemap-list__item" onClick={() => onOpenSource(a, 1)} style={{ cursor: 'pointer' }}>
                  <span className="codemap-list__icon">📄</span>
                  <span style={{ color: 'var(--accent)' }}>{a}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  const centers = new Set(depData.centers?.length ? depData.centers : (depData.center ? [depData.center] : []));
  const depsOut = (depData.edges || []).filter(e => centers.has(e.from));
  const depsIn = (depData.edges || []).filter(e => centers.has(e.to));

  const renderEdgeList = (
    edges: { from: string; to: string; kind: string; line?: number }[],
    side: 'out' | 'in',
  ) => {
    if (edges.length === 0) {
      return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>None</p>;
    }
    const target = (e: typeof edges[0]) => (side === 'out' ? e.to : e.from);
    return (
      <ul className="codemap-list">
        {edges.map((e, i) => {
          const tgt = target(e);
          const ext = isExternal(tgt);
          return (
            <li
              key={i}
              className="codemap-list__item"
              onClick={() => { if (!ext) onOpenSource(tgt, e.line || 1); }}
              style={{ cursor: ext ? 'default' : 'pointer', opacity: ext ? 0.6 : 1 }}
            >
              <span className="codemap-list__icon">{ext ? '📦' : '📄'}</span>
              <span style={{ color: ext ? 'var(--text-muted)' : 'var(--accent)' }}>{nodeName(tgt)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 'auto' }}>
                {e.kind}{e.line ? ` :${e.line}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Depth:</span>
        {[1, 2].map(d => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            style={{
              padding: '2px 8px', fontSize: 11, borderRadius: 3,
              background: depth === d ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
              border: `1px solid ${depth === d ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >{d}</button>
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {depData.nodes?.length || 0} nodes · {depData.edges?.length || 0} edges
        </span>
      </div>

      <div className="codemap-section">
        <div className="codemap-section__title">📤 Depends on ({depsOut.length})</div>
        {renderEdgeList(depsOut, 'out')}
      </div>
      <div className="codemap-section">
        <div className="codemap-section__title">📥 Used by ({depsIn.length})</div>
        {renderEdgeList(depsIn, 'in')}
      </div>
    </>
  );
}

// ── Structural traces (CodemapBuilder) ──────────────────

function StructuralTraces({
  nodeId, text, summary, anchors, onOpenSource,
}: {
  nodeId: string;
  text?: string;
  summary?: string;
  anchors: string[];
  onOpenSource: (path: string, line: number) => void;
}) {
  const [traces, setTraces] = React.useState<{
    id: string;
    title: string;
    description: string;
    locations: { id: string; path: string; lineNumber: number; title?: string }[];
  }[] | null>(null);
  const [fromCache, setFromCache] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!window.electronAPI?.getNodeCodemap) return;
    let cancelled = false;
    (async () => {
      const res = await window.electronAPI!.getNodeCodemap({
        nodeId,
        text,
        summary,
        fileAnchors: anchors,
      });
      if (cancelled) return;
      if (res.error) {
        setError(res.needsWorkspace ? 'Open Folder to build structural codemap.' : res.error);
        setTraces(null);
      } else if (res.codemap) {
        setTraces(res.codemap.traces);
        setFromCache(!!res.fromCache);
        setError(null);
      }
    })();
    return () => { cancelled = true; };
  }, [nodeId, anchors.join(','), text, summary]);

  if (error) {
    return (
      <div className="codemap-section" style={{ marginTop: 16 }}>
        <div className="codemap-section__title">🧭 Structural traces</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{error}</p>
      </div>
    );
  }
  if (!traces) {
    return (
      <div className="codemap-section" style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        ⏳ Building structural codemap…
      </div>
    );
  }

  return (
    <div className="codemap-section" style={{ marginTop: 16 }}>
      <div className="codemap-section__title">
        🧭 Structural traces {fromCache ? '(cached)' : ''}
      </div>
      {traces.map(t => (
        <div key={t.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            [{t.id}] {t.title}
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{t.description}</span>
          </div>
          <ul className="codemap-list">
            {t.locations.map(loc => (
              <li
                key={loc.id}
                className="codemap-list__item"
                onClick={() => onOpenSource(loc.path, loc.lineNumber || 1)}
                style={{ cursor: 'pointer' }}
              >
                <span className="codemap-list__icon">[{loc.id}]</span>
                <span style={{ color: 'var(--accent)' }}>{loc.path}{loc.lineNumber ? `:${loc.lineNumber}` : ''}</span>
                {loc.title && loc.title !== loc.path && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{loc.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Source preview ──────────────────────────────────────

function SourcePreview({ path, line }: { path: string; line: number }) {
  const [text, setText] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.electronAPI?.readFile) {
        setError('readFile API unavailable');
        return;
      }
      const res = await window.electronAPI.readFile(path, true);
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setText(null);
      } else {
        setText(res.content ?? '');
        setError(null);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  React.useEffect(() => {
    if (text != null && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [text, line]);

  const handleCopyPath = () => { navigator.clipboard?.writeText(path); };

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
  const basename = path.split('/').pop() || path;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="source-view__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📄 {basename} :{line}</span>
        <button onClick={handleCopyPath} title="Copy path" style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 8px',
          fontSize: 11, cursor: 'pointer',
        }}>📋 Copy</button>
      </div>
      <div className="source-view" style={{ flex: 1, overflow: 'auto' }}>
        {lines.map((ln, i) => {
          const lineNum = i + 1;
          const isHighlighted = lineNum === line;
          return (
            <div key={i} ref={isHighlighted ? highlightRef : undefined} style={{
              display: 'flex',
              background: isHighlighted ? 'var(--accent-dim)' : 'transparent',
            }}>
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
    </div>
  );
}

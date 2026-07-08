import React from 'react';
import type { UIMockNode } from '../App';

interface LeftPaneProps {
  nodes: UIMockNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

const TYPE_LABELS: Record<string, string> = {
  semantic: '🧠 Semantic Trace',
  text: '📝 Text Node',
  file: '📄 File Node',
};

export function LeftPane({ nodes, selectedNodeId, onSelectNode }: LeftPaneProps) {
  return (
    <div className="left-pane">
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🗺️ Canvas — Phase 2 (placeholder)
      </div>
      <div className="left-pane__node-list">
        {nodes.map(node => (
          <div
            key={node.id}
            className={`left-pane__node ${selectedNodeId === node.id ? 'left-pane__node--selected' : ''}`}
            onClick={() => onSelectNode(node.id === selectedNodeId ? null : node.id)}
          >
            <div className="left-pane__node-title">{node.title}</div>
            <div className="left-pane__node-type">
              {TYPE_LABELS[node.type] || node.type}
              {node.fileCount ? ` · ${node.fileCount} files` : ''}
            </div>
          </div>
        ))}
        <div className="left-pane__placeholder" style={{ padding: '40px', textAlign: 'center' }}>
          <p>← Click a node to see details in the right pane</p>
          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
            Canvas2D rendering coming in Phase 2.4
          </p>
        </div>
      </div>
    </div>
  );
}

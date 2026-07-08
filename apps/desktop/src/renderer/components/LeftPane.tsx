import React, { useRef } from 'react';
import { CanvasView } from '@infinity-canvas/canvas-core';
import type { CanvasViewHandle } from '@infinity-canvas/canvas-core';

interface LeftPaneProps {
  onSelectNode?: (nodeId: string | null) => void;
}

export function LeftPane({ onSelectNode }: LeftPaneProps) {
  const canvasRef = useRef<CanvasViewHandle>(null);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        🗺️ Infinity Canvas
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CanvasView ref={canvasRef} onSelectNode={onSelectNode} />
      </div>
    </div>
  );
}

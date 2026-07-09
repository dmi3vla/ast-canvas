import React, { forwardRef } from 'react';
import { CanvasView } from '@infinity-canvas/canvas-core';
import type { CanvasViewHandle } from '@infinity-canvas/canvas-core';
import { Minimap } from './Minimap';

interface LeftPaneProps {
  onSelectNode?: (nodeId: string | null) => void;
  initialData?: string | null;
}

export const LeftPane = forwardRef<CanvasViewHandle, LeftPaneProps>(
  function LeftPane({ onSelectNode, initialData }, ref) {
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
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <CanvasView ref={ref} onSelectNode={onSelectNode} initialData={initialData} />
          <Minimap canvasRef={ref as React.RefObject<CanvasViewHandle | null>} />
        </div>
      </div>
    );
  },
);

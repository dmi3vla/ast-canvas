import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { CanvasState } from './CanvasState';
import { CanvasRenderer } from './CanvasRenderer';
import { InputHandler } from './InputHandler';

export interface CanvasViewHandle {
  state: CanvasState;
  loadData: (json: string) => void;
  exportData: () => string;
}

interface CanvasViewProps {
  onSelectNode?: (nodeId: string | null) => void;
  initialData?: string | null;
}

export const CanvasView = forwardRef<CanvasViewHandle, CanvasViewProps>(
  function CanvasView({ onSelectNode, initialData }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<CanvasState>(new CanvasState());
    const rendererRef = useRef<CanvasRenderer>(new CanvasRenderer());
    const inputRef = useRef<InputHandler | null>(null);

    // Setup
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = stateRef.current;
      const renderer = rendererRef.current;

      renderer.attach(canvas);

      // Selection → parent callback
      state.onSelectionChange = (nodeId) => {
        onSelectNode?.(nodeId);
      };

      // State change → re-render
      state.onStateChange = () => {
        renderer.render(state);
      };

      const input = new InputHandler(canvas, state);
      input.setRenderCallback(() => renderer.render(state));
      inputRef.current = input;

      // Initial data
      if (initialData) {
        try {
          const parsed = JSON.parse(initialData);
          state.loadCanvasData(parsed);
        } catch { /* ignore parse errors */ }
      } else {
        // Seed with demo nodes
        seedDemoNodes(state);
      }

      renderer.render(state);

      const handleResize = () => {
        renderer.resize();
        renderer.render(state);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        input.destroy();
        renderer.detach();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
      state: stateRef.current,
      loadData: (json: string) => {
        try {
          const data = JSON.parse(json);
          stateRef.current.loadCanvasData(data);
          rendererRef.current.render(stateRef.current);
        } catch { /* ignore */ }
      },
      exportData: () => {
        return JSON.stringify(stateRef.current.exportCanvasData(), null, 2);
      },
    }), []);

    return (
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab',
          background: '#1e1e1e',
        }}
      />
    );
  },
);

function seedDemoNodes(state: CanvasState): void {
  state.createNode('## 🏗️ Architecture Overview\n\nElectron main process + React renderer.\nSplit-pane layout with resizable panels.', -300, -150);
  state.createNode('### Canvas Core\n\nCanvas2D rendering engine.\nPan, zoom, drag, connections.\nObsidian .canvas format.', 100, -150);
  state.createNode('README.md\n\nProject documentation.\nSetup instructions.', 500, -150);
  state.createNode('IPC Bridge\n\ncontextBridge API.\nTyped contracts.', -300, 150);
  state.createNode('AppShell\n\nLEFT|RIGHT split.\n4 detail modes.', 100, 150);

  // Edges
  const nodes = state.nodes;
  if (nodes.length >= 5) {
    state.createEdge(nodes[0].id, nodes[1].id, 'right', 'left');
    state.createEdge(nodes[0].id, nodes[2].id, 'right', 'left');
    state.createEdge(nodes[0].id, nodes[3].id, 'bottom', 'top');
    state.createEdge(nodes[1].id, nodes[4].id, 'bottom', 'top');
    state.createEdge(nodes[3].id, nodes[4].id, 'right', 'left');
  }
}

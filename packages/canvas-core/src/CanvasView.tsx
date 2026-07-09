import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CanvasState } from './CanvasState';
import { CanvasRenderer } from './CanvasRenderer';
import { InputHandler } from './InputHandler';
import { DEMO_CANVAS_JSON } from './demoCanvas';

export interface CanvasViewHandle {
  state: CanvasState;
  loadData: (json: string) => void;
  exportData: () => string;
  fitView: () => void;
}

interface CanvasViewProps {
  onSelectNode?: (nodeId: string | null) => void;
  /** When this string changes, canvas reloads document (replaces demo seed). */
  initialData?: string | null;
}

export const CanvasView = forwardRef<CanvasViewHandle, CanvasViewProps>(
  function CanvasView({ onSelectNode, initialData }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<CanvasState>(new CanvasState());
    const rendererRef = useRef<CanvasRenderer>(new CanvasRenderer());
    const inputRef = useRef<InputHandler | null>(null);
    const onSelectRef = useRef(onSelectNode);
    onSelectRef.current = onSelectNode;

    const applyDocument = (json: string | null | undefined, fit: boolean) => {
      const state = stateRef.current;
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;

      if (json) {
        try {
          const parsed = JSON.parse(json);
          state.loadCanvasData(parsed);
        } catch (err) {
          console.warn('[CanvasView] failed to parse canvas JSON', err);
          return;
        }
      } else if (state.nodes.length === 0) {
        // Load demo canvas as default
        try {
          const demo = JSON.parse(DEMO_CANVAS_JSON);
          state.loadCanvasData(demo);
        } catch { /* ignore, will be empty */ }
      }

      if (canvas) {
        renderer.resize();
        if (fit && state.nodes.length > 0) {
          state.fitView(canvas.width, canvas.height);
        }
      }
      renderer.render(state);
    };

    // Mount: attach renderer + input once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = stateRef.current;
      const renderer = rendererRef.current;

      renderer.attach(canvas);

      state.onSelectionChange = (nodeId) => {
        onSelectRef.current?.(nodeId);
      };

      state.onStateChange = () => {
        renderer.render(state);
      };

      const input = new InputHandler(canvas, state);
      input.setRenderCallback(() => renderer.render(state));
      inputRef.current = input;

      // First paint: initialData if already present, else demo
      applyDocument(initialData, Boolean(initialData));

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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
    }, []);

    // When parent sets canvas JSON after async buildSemanticMap — reload map
    useEffect(() => {
      if (initialData == null) return;
      // Skip if input not ready yet (mount effect will apply)
      if (!inputRef.current && !canvasRef.current) return;
      applyDocument(initialData, true);
      // Clear selection after load
      stateRef.current.clearSelection();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    useImperativeHandle(ref, () => ({
      state: stateRef.current,
      loadData: (json: string) => {
        applyDocument(json, true);
        stateRef.current.clearSelection();
      },
      exportData: () => {
        return JSON.stringify(stateRef.current.exportCanvasData(), null, 2);
      },
      fitView: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        rendererRef.current.resize();
        stateRef.current.fitView(canvas.width, canvas.height);
        rendererRef.current.render(stateRef.current);
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

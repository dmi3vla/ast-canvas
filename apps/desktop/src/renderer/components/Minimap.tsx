import React, { useRef, useEffect, useCallback } from 'react';
import type { CanvasViewHandle } from '@infinity-canvas/canvas-core';

interface MinimapProps {
  canvasRef: React.RefObject<CanvasViewHandle | null>;
}

const W = 180;
const H = 120;
const PAD = 60;

function contentBounds(nodes: { x: number; y: number; width: number; height: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }
  if (!isFinite(minX)) return null;
  return {
    minX: minX - PAD,
    minY: minY - PAD,
    maxX: maxX + PAD,
    maxY: maxY + PAD,
  };
}

export function Minimap({ canvasRef }: MinimapProps) {
  const miniRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  const redraw = useCallback(() => {
    const mini = miniRef.current;
    const handle = canvasRef.current;
    if (!mini || !handle) return;
    const state = handle.state;
    if (!state || state.nodes.length === 0) return;

    const ctx = mini.getContext('2d');
    if (!ctx) return;

    mini.width = W;
    mini.height = H;

    const b = contentBounds(state.nodes);
    if (!b) return;
    const bw = b.maxX - b.minX;
    const bh = b.maxY - b.minY;
    if (bw <= 0 || bh <= 0) return;
    const sx = W / bw;
    const sy = H / bh;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.92)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#3a3a40';
    for (const n of state.nodes) {
      ctx.fillRect(
        (n.x - b.minX) * sx,
        (n.y - b.minY) * sy,
        Math.max(2, n.width * sx),
        Math.max(2, n.height * sy),
      );
    }

    // Viewport in canvas space — use MAIN canvas size, not minimap element size
    const { width: viewW, height: viewH } = handle.getCanvasSize();
    const vx = -state.offsetX / state.scale;
    const vy = -state.offsetY / state.scale;
    const vw = viewW / state.scale;
    const vh = viewH / state.scale;

    ctx.strokeStyle = '#e2a93b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect((vx - b.minX) * sx, (vy - b.minY) * sy, vw * sx, vh * sy);
  }, [canvasRef]);

  useEffect(() => {
    const handle = canvasRef.current;
    if (!handle?.state) return;
    const state = handle.state;
    const orig = state.onStateChange;
    state.onStateChange = () => {
      orig?.();
      redraw();
    };
    redraw();
    const id = window.setInterval(redraw, 500); // catch external loads
    return () => {
      state.onStateChange = orig;
      window.clearInterval(id);
    };
  }, [canvasRef, redraw]);

  const panTo = (e: React.MouseEvent) => {
    const handle = canvasRef.current;
    const mini = miniRef.current;
    if (!handle?.state || !mini) return;
    const state = handle.state;
    const b = contentBounds(state.nodes);
    if (!b) return;

    const rect = mini.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / W;
    const my = (e.clientY - rect.top) / H;
    const bw = b.maxX - b.minX;
    const bh = b.maxY - b.minY;

    const { width: viewW, height: viewH } = handle.getCanvasSize();
    const worldX = b.minX + mx * bw;
    const worldY = b.minY + my * bh;

    // Center main viewport on clicked world point
    state.offsetX = viewW / 2 - worldX * state.scale;
    state.offsetY = viewH / 2 - worldY * state.scale;
    state.notifyStateChange();
  };

  return (
    <canvas
      ref={miniRef}
      width={W}
      height={H}
      style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        borderRadius: 6,
        cursor: 'pointer',
        opacity: 0.85,
        zIndex: 10,
        border: '1px solid var(--border, #404040)',
      }}
      onMouseDown={(e) => {
        dragging.current = true;
        panTo(e);
      }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onMouseMove={(e) => {
        if (dragging.current) panTo(e);
      }}
    />
  );
}

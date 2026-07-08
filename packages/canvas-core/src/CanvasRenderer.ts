import type { ICNode, ICEdge } from './types';
import type { CanvasState } from './CanvasState';

const COLORS = {
  bg: '#1e1e1e',
  grid: '#2a2a2a',
  gridAccent: '#333333',
  nodeBg: '#2d2d30',
  nodeBgSelected: '#094771',
  nodeBorder: '#404040',
  nodeBorderSelected: '#0078d4',
  nodeText: '#cccccc',
  nodeTextDim: '#9d9d9d',
  edge: '#569cd6',
  edgeSelected: '#0078d4',
};

const GRID_SIZE = 40;
const GRID_ACCENT_EVERY = 5;

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  /** Attach to a canvas element */
  attach(canvas: HTMLCanvasElement): void {
    this.canvasEl = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  /** Detach from canvas */
  detach(): void {
    this.ctx = null;
    this.canvasEl = null;
  }

  /** Resize canvas to fill container */
  resize(): void {
    if (!this.canvasEl) return;
    const parent = this.canvasEl.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.canvasEl.width = rect.width;
    this.canvasEl.height = rect.height;
  }

  /** Main render — clear and draw everything */
  render(state: CanvasState): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvasEl) return;

    const w = this.canvasEl.width;
    const h = this.canvasEl.height;

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.scale, state.scale);

    // Grid
    this.drawGrid(ctx, w, h, state);

    // Edges
    for (const edge of state.edges) {
      const from = state.getNodeById(edge.fromNode);
      const to = state.getNodeById(edge.toNode);
      if (from && to) {
        this.drawEdge(ctx, from, to, edge);
      }
    }

    // Nodes
    for (const node of state.nodes) {
      this.drawNode(ctx, node);
    }

    ctx.restore();
  }

  // ── Grid ──────────────────────────────────────────────

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, state: CanvasState): void {
    const startX = -state.offsetX / state.scale;
    const startY = -state.offsetY / state.scale;
    const endX = startX + w / state.scale;
    const endY = startY + h / state.scale;

    const gridStartX = Math.floor(startX / GRID_SIZE) * GRID_SIZE;
    const gridStartY = Math.floor(startY / GRID_SIZE) * GRID_SIZE;

    for (let x = gridStartX; x <= endX; x += GRID_SIZE) {
      const idx = Math.round(x / GRID_SIZE);
      ctx.strokeStyle = idx % GRID_ACCENT_EVERY === 0 ? COLORS.gridAccent : COLORS.grid;
      ctx.lineWidth = idx % GRID_ACCENT_EVERY === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = gridStartY; y <= endY; y += GRID_SIZE) {
      const idx = Math.round(y / GRID_SIZE);
      ctx.strokeStyle = idx % GRID_ACCENT_EVERY === 0 ? COLORS.gridAccent : COLORS.grid;
      ctx.lineWidth = idx % GRID_ACCENT_EVERY === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  // ── Nodes ─────────────────────────────────────────────

  private drawNode(ctx: CanvasRenderingContext2D, node: ICNode): void {
    const { x, y, width, height, isSelected } = node;
    const radius = 8;

    // Background
    ctx.fillStyle = isSelected ? COLORS.nodeBgSelected : COLORS.nodeBg;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? COLORS.nodeBorderSelected : COLORS.nodeBorder;
    ctx.lineWidth = isSelected ? 2 : 1;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    // Text
    const text = node.text || node.file || '(empty)';
    const fontSize = 13;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillStyle = COLORS.nodeText;
    ctx.textBaseline = 'top';

    // Word-wrap text within node width
    const maxWidth = width - 20;
    const lineHeight = fontSize * 1.4;
    const words = text.split(' ');
    let line = '';
    let lineY = y + 12;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x + 10, lineY);
        line = word;
        lineY += lineHeight;
        if (lineY > y + height - 20) break; // Stop if overflow
      } else {
        line = testLine;
      }
    }
    if (line && lineY <= y + height - 20) {
      ctx.fillText(line, x + 10, lineY);
    } else if (lineY > y + height - 20) {
      // Overflow indicator
      ctx.fillText(line.slice(0, 20) + '…', x + 10, lineY - lineHeight);
    }

    // Connection points (4 sides, centered)
    if (isSelected) {
      const points: { cx: number; cy: number }[] = [
        { cx: x + width / 2, cy: y },              // top
        { cx: x + width / 2, cy: y + height },     // bottom
        { cx: x, cy: y + height / 2 },              // left
        { cx: x + width, cy: y + height / 2 },      // right
      ];
      for (const pt of points) {
        ctx.fillStyle = '#4ec9b0';
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Edges ─────────────────────────────────────────────

  private drawEdge(
    ctx: CanvasRenderingContext2D,
    from: ICNode,
    to: ICNode,
    edge: ICEdge,
  ): void {
    const fromPt = this.getSidePoint(from, edge.fromSide || 'right');
    const toPt = this.getSidePoint(to, edge.toSide || 'left');

    ctx.strokeStyle = COLORS.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromPt.x, fromPt.y);

    // Simple bezier for curved edges
    const cpDist = Math.abs(toPt.x - fromPt.x) * 0.5;
    const cp1x = fromPt.x + cpDist * (edge.fromSide === 'left' ? -1 : 1);
    const cp2x = toPt.x - cpDist * (edge.toSide === 'left' ? -1 : 1);
    ctx.bezierCurveTo(cp1x, fromPt.y, cp2x, toPt.y, toPt.x, toPt.y);
    ctx.stroke();

    // Arrow
    const angle = Math.atan2(toPt.y - (fromPt.y + toPt.y) / 2, toPt.x - (fromPt.x + toPt.x) / 2);
    const arrowSize = 8;
    ctx.fillStyle = COLORS.edge;
    ctx.beginPath();
    ctx.moveTo(toPt.x, toPt.y);
    ctx.lineTo(
      toPt.x - arrowSize * Math.cos(angle - Math.PI / 6),
      toPt.y - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toPt.x - arrowSize * Math.cos(angle + Math.PI / 6),
      toPt.y - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  // ── Helpers ───────────────────────────────────────────

  private getSidePoint(node: ICNode, side: string): { x: number; y: number } {
    switch (side) {
      case 'top': return { x: node.x + node.width / 2, y: node.y };
      case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
      case 'left': return { x: node.x, y: node.y + node.height / 2 };
      case 'right':
      default: return { x: node.x + node.width, y: node.y + node.height / 2 };
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

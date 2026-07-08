import type { ICNode, ICEdge, CanvasDocument, SerializedNode, SerializedEdge, Viewport, NodeSide } from './types';

export type StateChangeCallback = () => void;
export type SelectionChangeCallback = (nodeId: string | null) => void;

export class CanvasState {
  nodes: ICNode[] = [];
  edges: ICEdge[] = [];
  selectedNodeIds: Set<string> = new Set();

  // Viewport
  offsetX = 0;
  offsetY = 0;
  scale = 1;

  // ID counter
  private nodeCounter = 0;

  // Callbacks
  onStateChange: StateChangeCallback | null = null;
  onSelectionChange: SelectionChangeCallback | null = null;

  // ── Node operations ──────────────────────────────────

  createNode(text = 'New Node', x = 100, y = 100): ICNode {
    const node: ICNode = {
      id: `node_${++this.nodeCounter}`,
      type: 'text',
      text,
      x,
      y,
      width: 250,
      height: 120,
      isSelected: false,
    };
    this.nodes.push(node);
    this.notifyStateChange();
    return node;
  }

  deleteNode(nodeOrId: ICNode | string): void {
    const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.fromNode !== id && e.toNode !== id);
    this.selectedNodeIds.delete(id);
    this.notifyStateChange();
  }

  getNodeAt(x: number, y: number): ICNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
        return node;
      }
    }
    return null;
  }

  getNodeById(id: string): ICNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  // ── Edge operations ───────────────────────────────────

  createEdge(fromId: string, toId: string, fromSide?: NodeSide, toSide?: NodeSide): ICEdge | null {
    const fromNode = this.getNodeById(fromId);
    const toNode = this.getNodeById(toId);
    if (!fromNode || !toNode) return null;

    const edge: ICEdge = {
      id: `edge_${Date.now()}`,
      fromNode: fromId,
      toNode: toId,
      fromSide,
      toSide,
    };
    this.edges.push(edge);
    this.notifyStateChange();
    return edge;
  }

  deleteEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.notifyStateChange();
  }

  // ── Selection ─────────────────────────────────────────

  selectNode(nodeId: string): void {
    // Deselect all, then select one
    for (const n of this.nodes) n.isSelected = false;
    this.selectedNodeIds.clear();

    const node = this.getNodeById(nodeId);
    if (node) {
      node.isSelected = true;
      this.selectedNodeIds.add(nodeId);
    }
    this.onSelectionChange?.(this.selectedNodeIds.size === 1 ? nodeId : null);
    this.notifyStateChange();
  }

  clearSelection(): void {
    for (const n of this.nodes) n.isSelected = false;
    this.selectedNodeIds.clear();
    this.onSelectionChange?.(null);
    this.notifyStateChange();
  }

  toggleSelection(nodeId: string): void {
    const node = this.getNodeById(nodeId);
    if (!node) return;

    if (this.selectedNodeIds.has(nodeId)) {
      node.isSelected = false;
      this.selectedNodeIds.delete(nodeId);
    } else {
      node.isSelected = true;
      this.selectedNodeIds.add(nodeId);
    }
    this.onSelectionChange?.(this.selectedNodeIds.size === 1 ? nodeId : null);
    this.notifyStateChange();
  }

  get selectedCount(): number {
    return this.selectedNodeIds.size;
  }

  get firstSelectedId(): string | null {
    const first = this.selectedNodeIds.values().next();
    return first.done ? null : first.value;
  }

  // ── Viewport ──────────────────────────────────────────

  getViewport(): Viewport {
    return { offsetX: this.offsetX, offsetY: this.offsetY, scale: this.scale };
  }

  setViewport(vp: Partial<Viewport>): void {
    if (vp.offsetX !== undefined) this.offsetX = vp.offsetX;
    if (vp.offsetY !== undefined) this.offsetY = vp.offsetY;
    if (vp.scale !== undefined) this.scale = Math.max(0.1, Math.min(10, vp.scale));
    this.notifyStateChange();
  }

  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
    this.notifyStateChange();
  }

  zoom(factor: number, centerX: number, centerY: number): void {
    const newScale = Math.max(0.1, Math.min(10, this.scale * factor));
    // Zoom towards cursor position
    this.offsetX = centerX - (centerX - this.offsetX) * (newScale / this.scale);
    this.offsetY = centerY - (centerY - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;
    this.notifyStateChange();
  }

  // ── Serialization (Obsidian .canvas format) ───────────

  exportCanvasData(): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
    return {
      nodes: this.nodes.map(n => {
        const base: SerializedNode = {
          id: n.id,
          type: n.type,
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
        };
        if (n.color) base.color = n.color;
        if (n.type === 'file' && n.file) {
          base.file = n.file;
        } else if (n.text) {
          base.text = n.text;
        }
        return base;
      }),
      edges: this.edges.map(e => ({
        id: e.id,
        fromNode: e.fromNode,
        toNode: e.toNode,
        fromSide: e.fromSide || 'right',
        toSide: e.toSide || 'left',
      })),
    };
  }

  loadCanvasData(data: { nodes?: SerializedNode[]; edges?: SerializedEdge[] }): void {
    // Preserve viewport
    const vp = this.getViewport();

    this.nodes = [];
    this.edges = [];
    this.selectedNodeIds.clear();
    this.nodeCounter = 0;
    this.offsetX = vp.offsetX;
    this.offsetY = vp.offsetY;
    this.scale = vp.scale;

    if (data.nodes && Array.isArray(data.nodes)) {
      for (const nd of data.nodes) {
        const node: ICNode = {
          id: nd.id,
          type: (nd.type as ICNode['type']) || 'text',
          x: nd.x || 100,
          y: nd.y || 100,
          width: nd.width || 250,
          height: nd.height || 120,
          color: nd.color,
          text: nd.text,
          file: nd.file,
          isSelected: false,
        };
        this.nodes.push(node);

        const num = parseInt(node.id.replace(/^(node_|file_)/, ''), 10);
        if (!isNaN(num) && num > this.nodeCounter) {
          this.nodeCounter = num;
        }
      }
    }

    if (data.edges && Array.isArray(data.edges)) {
      for (const ed of data.edges) {
        const fromExists = this.nodes.some(n => n.id === ed.fromNode);
        const toExists = this.nodes.some(n => n.id === ed.toNode);
        if (fromExists && toExists) {
          this.edges.push({
            id: ed.id,
            fromNode: ed.fromNode,
            toNode: ed.toNode,
            fromSide: ed.fromSide as NodeSide | undefined,
            toSide: ed.toSide as NodeSide | undefined,
            label: ed.label,
          });
        }
      }
    }

    this.notifyStateChange();
  }

  /** Deep copy of the canvas document for external use */
  toDocument(): CanvasDocument {
    return {
      nodes: this.nodes.map(n => ({ ...n })),
      edges: this.edges.map(e => ({ ...e })),
    };
  }

  // ── Internal ──────────────────────────────────────────

  notifyStateChange(): void {
    this.onStateChange?.();
  }
}

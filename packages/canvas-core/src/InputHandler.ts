import type { CanvasState } from './CanvasState';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private state: CanvasState;

  // Drag state
  private isDragging = false;
  private isNodeDragging = false;
  private isPanning = false;
  private draggedNodeId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Dblclick timer
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private clickCount = 0;

  // Callbacks
  private renderCallback: (() => void) | null = null;

  // Bound handlers for cleanup
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundResize: () => void;

  constructor(canvas: HTMLCanvasElement, state: CanvasState) {
    this.canvas = canvas;
    this.state = state;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundResize = this.handleResize.bind(this);

    this.setupListeners();
  }

  setRenderCallback(cb: () => void): void {
    this.renderCallback = cb;
  }

  /** Clean up all listeners */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('resize', this.boundResize);
  }

  // ── Setup ─────────────────────────────────────────────

  private setupListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('resize', this.boundResize);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private requestRender(): void {
    this.renderCallback?.();
  }

  // ── Coordinate Transforms ─────────────────────────────

  private toCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.state.offsetX) / this.state.scale,
      y: (clientY - rect.top - this.state.offsetY) / this.state.scale,
    };
  }

  // ── Mouse Handlers ────────────────────────────────────

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.toCanvas(e.clientX, e.clientY);

    // Alt + drag = pan
    if (e.altKey || e.button === 1) {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      return;
    }

    // Check if clicking a node
    const node = this.state.getNodeAt(pos.x, pos.y);
    if (node) {
      if (e.ctrlKey || e.metaKey) {
        this.state.toggleSelection(node.id);
      } else {
        this.state.selectNode(node.id);
      }

      // Start node drag
      this.isNodeDragging = true;
      this.draggedNodeId = node.id;
      this.dragOffsetX = pos.x - node.x;
      this.dragOffsetY = pos.y - node.y;
    } else {
      // Click on empty space → clear selection + start pan
      this.state.clearSelection();
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    this.isDragging = true;
    this.requestRender();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const pos = this.toCanvas(e.clientX, e.clientY);

    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.state.pan(dx, dy);
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    if (this.isNodeDragging && this.draggedNodeId) {
      const node = this.state.getNodeById(this.draggedNodeId);
      if (node) {
        node.x = pos.x - this.dragOffsetX;
        node.y = pos.y - this.dragOffsetY;
        this.state.notifyStateChange?.();
      }
    }

    this.requestRender();
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
    this.isNodeDragging = false;
    this.draggedNodeId = null;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.state.zoom(factor, centerX, centerY);
    this.requestRender();
  }

  // ── Keyboard ──────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.state.selectedCount > 0) {
        for (const id of [...this.state.selectedNodeIds]) {
          this.state.deleteNode(id);
        }
        this.state.clearSelection();
        this.requestRender();
      }
    }
    if (e.key === 'Escape') {
      this.state.clearSelection();
      this.requestRender();
    }
  }

  private handleResize(): void {
    this.requestRender();
  }
}

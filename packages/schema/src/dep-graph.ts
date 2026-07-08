// ── DepGraph Model (pure data, no AST parsing) ─────────

/** A node in the dependency graph */
export interface DepNode {
  id: string;
  path: string;
  name?: string;
  kind: 'file' | 'module' | 'external';
}

/** An edge in the dependency graph */
export interface DepEdge {
  id?: string;
  from: string;   // DepNode.id
  to: string;     // DepNode.id
  kind: 'import' | 'call' | 'type' | 'export';
  loc?: { line: number; col?: number };
}

/** Dependency graph */
export interface DepGraph {
  nodes: Record<string, DepNode>;
  edges: DepEdge[];
}

// ── Helpers ────────────────────────────────────────────

/** Get incoming edges for a node */
export function incoming(g: DepGraph, nodeId: string): DepEdge[] {
  return g.edges.filter(e => e.to === nodeId);
}

/** Get outgoing edges for a node */
export function outgoing(g: DepGraph, nodeId: string): DepEdge[] {
  return g.edges.filter(e => e.from === nodeId);
}

/** Get both deps in and derives out up to a given depth */
export function egoNetwork(
  g: DepGraph,
  centerId: string,
  depth: number = 1,
): { nodes: Set<string>; edges: DepEdge[] } {
  const visited = new Set<string>([centerId]);
  const includedEdges: DepEdge[] = [];
  let frontier = new Set<string>([centerId]);

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>();
    for (const nodeId of frontier) {
      for (const edge of g.edges) {
        if (edge.from === nodeId && !visited.has(edge.to)) {
          next.add(edge.to);
          visited.add(edge.to);
          includedEdges.push(edge);
        }
        if (edge.to === nodeId && !visited.has(edge.from)) {
          next.add(edge.from);
          visited.add(edge.from);
          includedEdges.push(edge);
        }
      }
    }
    frontier = next;
  }

  return { nodes: visited, edges: includedEdges };
}

/** Create a new empty DepGraph */
export function createDepGraph(): DepGraph {
  return { nodes: {}, edges: [] };
}

/** Add a node to the graph */
export function addNode(g: DepGraph, node: DepNode): void {
  g.nodes[node.id] = node;
}

/** Add an edge to the graph */
export function addEdge(g: DepGraph, edge: DepEdge): void {
  g.edges.push(edge);
}

/** Fixture: A → B → C with external X → B */
export function createFixtureGraph(): DepGraph {
  const g = createDepGraph();

  addNode(g, { id: 'A', path: 'src/a.ts', name: 'A', kind: 'file' });
  addNode(g, { id: 'B', path: 'src/b.ts', name: 'B', kind: 'file' });
  addNode(g, { id: 'C', path: 'src/c.ts', name: 'C', kind: 'file' });
  addNode(g, { id: 'X', path: 'node_modules/x/index.js', name: 'X', kind: 'external' });

  addEdge(g, { from: 'A', to: 'B', kind: 'import' });
  addEdge(g, { from: 'B', to: 'C', kind: 'import' });
  addEdge(g, { from: 'X', to: 'B', kind: 'import' }); // X depends on B? No, B imports X

  return g;
}

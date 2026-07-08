import type { CanvasDocument } from '@infinity-canvas/schema';
import { parseCanvas, safeParseCanvas, serializeDocument } from '@infinity-canvas/schema';
import type { ContextPack } from './contextPacker';
import type { LLMProvider } from './llmProviders';

// ── Semantic Map Builder ───────────────────────────────

export interface SemanticMapResult {
  document: CanvasDocument;
  diagnostics: {
    retries: number;
    parseSuccess: boolean;
    nodeCount: number;
    edgeCount: number;
    warnings: string[];
  };
}

/** Build system prompt for LLM */
function buildSystemPrompt(): string {
  return `You are a code architecture analyzer. Generate a JSON semantic map of the project in Obsidian Canvas format.

Output ONLY valid JSON — no markdown fences, no explanations.

Schema:
{
  "nodes": [
    {
      "id": "string",
      "type": "semantic",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "text": "## Title\\nDescription",
      "semantic": { "kind": "overview|entry|module|util|config", "summary": "short", "traceIds": [] }
    }
  ],
  "edges": [
    { "id": "string", "fromNode": "id", "toNode": "id", "kind": "semantic" }
  ]
}

Rules:
- 5–8 semantic nodes covering architecture
- Root node (kind=overview) at (0, -80)
- Grid layout: nodes at multiples of 280px x, 120px y
- Every node connected to root via edges kind=semantic
- Use ONLY the provided file context`;
}

/** Build user prompt from context pack */
function buildUserPrompt(pack: ContextPack): string {
  const parts: string[] = [];

  parts.push(`Project structure:\n\`\`\`\n${pack.tree}\n\`\`\``);

  for (const m of pack.manifests) {
    parts.push(`File: ${m.path}\n\`\`\`\n${m.content.slice(0, 2000)}\n\`\`\``);
  }

  const remainingBudget = 60_000;
  let used = 0;
  for (const s of pack.samples) {
    if (used >= remainingBudget) break;
    const snippet = s.content.slice(0, Math.min(1500, remainingBudget - used));
    parts.push(`File: ${s.path}\n\`\`\`\n${snippet}\n\`\`\``);
    used += snippet.length;
  }

  parts.push('\nGenerate a semantic map of this project in valid JSON CanvasDocument format.');

  return parts.join('\n\n');
}

/** Strip markdown fences and surrounding whitespace from LLM response */
function stripFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
  cleaned = cleaned.replace(/\n?\s*```$/, '');
  return cleaned.trim();
}

/** Ensure all nodes have x,y positions (grid fallback) */
function applyGridLayout(doc: CanvasDocument): void {
  const SPACING_X = 300;
  const SPACING_Y = 140;
  const COLS = 3;

  doc.nodes.forEach((node, i) => {
    if (node.x === 0 && node.y === 0 && i > 0) {
      // Unpositioned node — apply grid
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      node.x = -400 + col * SPACING_X;
      node.y = 60 + row * SPACING_Y;
    }
    if (node.width <= 0) node.width = 280;
    if (node.height <= 0) node.height = 80;
  });

  // Default edge kind
  doc.edges.forEach(e => {
    if (!e.kind) (e as any).kind = 'semantic';
  });
}

/**
 * Build a semantic map from context pack using an LLM provider.
 * Includes 1 retry on parse failure.
 */
export async function buildSemanticMap(
  pack: ContextPack,
  llm: LLMProvider,
): Promise<SemanticMapResult> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(pack);

  const warnings: string[] = [];
  let retries = 0;

  const attempt = async (): Promise<CanvasDocument> => {
    const raw = await llm.complete([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    const cleaned = stripFences(raw);
    const result = safeParseCanvas(cleaned);

    if (!result.success) {
      throw new Error(`Parse error: ${result.error}`);
    }

    return result.data;
  };

  let document: CanvasDocument;

  try {
    document = await attempt();
  } catch (err) {
    retries++;
    warnings.push(`First attempt failed: ${err instanceof Error ? err.message : String(err)}. Retrying...`);

    try {
      document = await attempt();
    } catch (err2) {
      warnings.push(`Retry also failed: ${err2 instanceof Error ? err2.message : String(err2)}. Using fallback.`);
      // Fallback: minimal valid document
      document = {
        nodes: [{
          id: 'fallback',
          type: 'semantic',
          x: 0, y: 0, width: 300, height: 60,
          text: '## Semantic Map\nGeneration failed. Please regenerate.',
          semantic: { kind: 'overview', summary: 'Fallback node' },
        }],
        edges: [],
      };
    }
  }

  applyGridLayout(document);

  return {
    document,
    diagnostics: {
      retries,
      parseSuccess: true,
      nodeCount: document.nodes.length,
      edgeCount: document.edges.length,
      warnings,
    },
  };
}

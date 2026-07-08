import type { ContextPack } from './contextPacker';

// ── System Prompts ─────────────────────────────────────

export const SYSTEM_CODEMAP = `You are a code architecture analyzer. Generate a semantic codemap in strict JSON format.

Output ONLY valid JSON — no markdown fences, no explanations.

Schema (Codemap format):
{
  "schemaVersion": 1,
  "id": "project-name___architecture___timestamp",
  "stableId": "UUID",
  "metadata": {
    "cascadeId": "UUID", "generationSource": "llm",
    "generationTimestamp": "ISO8601", "mode": "SMART",
    "originalPrompt": "analyze project structure"
  },
  "title": "Architecture overview",
  "traces": [
    {
      "id": "1",
      "title": "Trace title",
      "description": "What this area covers",
      "locations": [
        { "id": "1a", "path": "/absolute/path/file.ts", "lineNumber": 1, "lineContent": "export function...", "title": "Entry point", "description": "Main function" }
      ],
      "traceTextDiagram": "ASCII tree of the trace topology",
      "traceGuide": "Detailed analysis in Markdown"
    }
  ]
}

Rules:
- 4–6 traces covering distinct architectural areas (entry, core logic, data model, config, utils, I/O)
- IDs: trace "1","2"... location "1a","1b","2a"...
- Location paths: use EXACT paths from provided file context
- lineNumber: best estimate or 1 if unknown
- Every trace must have at least 2 locations
- traceGuide: detailed Markdown analysis`;

export const EXAMPLE_CODEMAP_MINI = `Example — 2 traces for a mini project:

{
  "schemaVersion": 1,
  "id": "miniproject___demo___20260709",
  "stableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "metadata": {
    "cascadeId": "x",
    "generationSource": "llm",
    "generationTimestamp": "2026-07-09T00:00:00Z",
    "mode": "SMART",
    "originalPrompt": "analyze mini project"
  },
  "title": "MiniProject Architecture",
  "traces": [
    {
      "id": "1",
      "title": "Application Entry Point",
      "description": "Main entry and bootstrap logic",
      "locations": [
        { "id": "1a", "path": "src/index.js", "lineNumber": 1, "lineContent": "import { formatName } from './utils/helpers.js'", "title": "Module imports" },
        { "id": "1b", "path": "src/index.js", "lineNumber": 6, "lineContent": "export function bootstrap()", "title": "Bootstrap function" }
      ]
    },
    {
      "id": "2",
      "title": "Utility Helpers",
      "description": "Shared formatting and calculation utilities",
      "locations": [
        { "id": "2a", "path": "src/utils/helpers.js", "lineNumber": 1, "lineContent": "export function formatName(name)", "title": "Name formatter" },
        { "id": "2b", "path": "src/utils/helpers.js", "lineNumber": 5, "lineContent": "export function calculateTotal(numbers)", "title": "Sum calculator" }
      ]
    }
  ]
}`;

export function buildCodemapUserPrompt(pack: ContextPack, projectName: string): string {
  const parts: string[] = [];
  parts.push(`Project: ${projectName}`);
  parts.push(`\nStructure:\n\`\`\`\n${pack.tree}\n\`\`\``);

  for (const m of pack.manifests) {
    parts.push(`\nFile: ${m.path}\n\`\`\`\n${m.content.slice(0, 2000)}\n\`\`\``);
  }

  let used = 0;
  for (const s of pack.samples) {
    if (used >= 40_000) break;
    const snippet = s.content.slice(0, Math.min(1000, 40_000 - used));
    parts.push(`\nFile: ${s.path}\n\`\`\`\n${snippet}\n\`\`\``);
    used += snippet.length;
  }

  parts.push('\nGenerate a codemap for this project in the format shown above. Output ONLY valid JSON.');
  return parts.join('\n');
}

// ── Codemap → Canvas Projection ────────────────────────

import type { Codemap } from '@infinity-canvas/schema';
import type { CanvasDocument, ICNode, ICEdge } from '@infinity-canvas/schema';

export function projectCodemapToCanvas(codemap: Codemap): CanvasDocument {
  const nodes: ICNode[] = [];
  const edges: ICEdge[] = [];

  const COLS = 3;
  const SPACING_X = 340;
  const SPACING_Y = 160;

  // One canvas node per trace (area node)
  codemap.traces.forEach((trace, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const locationPaths = [...new Set(trace.locations.map(l => l.path))];

    nodes.push({
      id: trace.id,
      type: 'semantic',
      x: -400 + col * SPACING_X,
      y: 60 + row * SPACING_Y,
      width: 300,
      height: 100,
      text: `### ${trace.title}\n${trace.description}`,
      semantic: {
        kind: 'area',
        summary: trace.description,
        traceIds: [trace.id],
        fileAnchors: locationPaths,
      },
    } as ICNode);
  });

  // Sequential edges between traces
  for (let i = 1; i < nodes.length; i++) {
    edges.push({
      id: `proj-e${i}`,
      fromNode: nodes[i - 1].id,
      toNode: nodes[i].id,
      kind: 'semantic',
    });
  }

  return { nodes, edges };
}

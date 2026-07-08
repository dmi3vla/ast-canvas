import { z } from 'zod';

// ── Codemap Schema (langgraph.codemap format) ──────────

/** A single location in source code */
export const LocationSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  lineNumber: z.number().int().positive(),
  lineContent: z.string().optional(),   // optional: LLM may omit
  title: z.string().optional(),
  description: z.string().optional(),
});

/** A semantic trace — one "thread" of the codemap */
export const TraceSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  locations: z.array(LocationSchema).min(1),
  traceTextDiagram: z.string().optional(),
  traceGuide: z.string().optional(),
});

/** Codemap metadata */
export const CodemapMetadataSchema = z.object({
  cascadeId: z.string(),
  generationSource: z.string(),
  generationTimestamp: z.string(),
  mode: z.string(),
  originalPrompt: z.string(),
});

/** Root codemap document */
export const CodemapSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  stableId: z.string(),
  metadata: CodemapMetadataSchema,
  title: z.string(),
  description: z.string().optional(),
  mermaidDiagram: z.string().optional(),
  traces: z.array(TraceSchema).min(1),
});

// ── Inferred Types ─────────────────────────────────────

export type Location = z.infer<typeof LocationSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type CodemapMetadata = z.infer<typeof CodemapMetadataSchema>;
export type Codemap = z.infer<typeof CodemapSchema>;

// ── Parse ──────────────────────────────────────────────

export function parseCodemap(json: string | unknown): Codemap {
  if (typeof json === 'string') {
    return CodemapSchema.parse(JSON.parse(json));
  }
  return CodemapSchema.parse(json);
}

export function safeParseCodemap(json: string | unknown): { success: true; data: Codemap } | { success: false; error: string } {
  try {
    const data = parseCodemap(json);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Helpers (pure, for RIGHT panel) ────────────────────

/** List all traces with their IDs and titles */
export function listTraces(codemap: Codemap): { id: string; title: string; locationCount: number }[] {
  return codemap.traces.map(t => ({
    id: t.id,
    title: t.title,
    locationCount: t.locations.length,
  }));
}

/** Flatten all locations across all traces */
export function flattenLocations(codemap: Codemap): (Location & { traceId: string; traceTitle: string })[] {
  return codemap.traces.flatMap(t =>
    t.locations.map(loc => ({
      ...loc,
      traceId: t.id,
      traceTitle: t.title,
    })),
  );
}

/** Build a content summary for RIGHT panel from a trace */
export function traceToContentSummary(trace: Trace): { title: string; description: string; locations: { id: string; path: string; line: number; title?: string }[] } {
  return {
    title: trace.title,
    description: trace.description,
    locations: trace.locations.map(loc => ({
      id: loc.id,
      path: loc.path,
      line: loc.lineNumber,
      title: loc.title,
    })),
  };
}

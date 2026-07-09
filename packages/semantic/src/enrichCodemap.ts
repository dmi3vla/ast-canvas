import type { Codemap, Trace } from '@infinity-canvas/schema';
import { parseCodemap, safeParseCodemap } from '@infinity-canvas/schema';
import type { LLMProvider } from './llmProviders';
import { isSendCodeSamplesEnabled } from './llmProviders';
import type { ContextPack } from './contextPacker';

// ── Secrets redact ─────────────────────────────────────

/** Order matters: longer / more specific first (Bearer before bare Authorization). */
const SECRET_PATTERNS = [
  /Authorization\s*:\s*Bearer\s+\S+/gi,
  /Bearer\s+\S+/gi,
  /Authorization\s*:\s*\S+/gi,
  /api[_-]?key\s*[=:]\s*['"]?\S+['"]?/gi,
  /secret\s*[=:]\s*['"]?\S+['"]?/gi,
  /password\s*[=:]\s*['"]?\S+['"]?/gi,
  /token\s*[=:]\s*['"]?\S+['"]?/gi,
  /sk-[a-zA-Z0-9_-]{10,}/g,
];

/** Strip sensitive tokens from a content string (API keys, Bearer, sk-…). */
export function redactSamples(samples: string): string {
  let result = samples;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global patterns reused across calls
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => {
      const prefix = match.slice(0, Math.min(8, match.length));
      return `${prefix}[REDACTED]`;
    });
  }
  return result;
}

/** Apply privacy policy to a ContextPack in-place — for both map and enrich paths.
 *  - manifests: always redacted
 *  - samples: if sendCodeSamples OFF → placeholder text; ON → redactSamples(content) */
export function applyPrivacyToPack(pack: ContextPack): void {
  // Always redact manifests (package.json may have private fields)
  pack.manifests = pack.manifests.map(m => ({
    ...m,
    content: redactSamples(m.content),
  }));

  if (!isSendCodeSamplesEnabled()) {
    pack.samples = pack.samples.map(s => ({
      ...s,
      content: `[code sample redacted: ${s.path}]`,
    }));
  } else {
    pack.samples = pack.samples.map(s => ({
      ...s,
      content: redactSamples(s.content),
    }));
  }
}

// ── Types ──────────────────────────────────────────────

export interface EnrichInput {
  structural: Codemap;
  pack?: ContextPack;
  llm: LLMProvider;
  allowedPaths: string[];
}

export interface EnrichResult {
  codemap: Codemap;
  diagnostics: {
    strippedLocations: number;
    repaired: boolean;
    provider: string;
  };
}

// ── Prompt ─────────────────────────────────────────────

const SYSTEM_ENRICH = `You are a code architecture expert. Refine a structural codemap by adding trace guides, better titles, and architectural insight.

Output ONLY valid JSON — no markdown fences. Keep the same schemaVersion and id from input.

Schema location fields: id, path, lineNumber, lineContent?, title?, description?
Trace fields: id, title, description, locations[], traceTextDiagram?, traceGuide?

IMPORTANT: You may ONLY use locations with paths from this ALLOWED list:
{allowedPaths}

Keep existing trace ids (1,2,3). Add traceGuide with detailed analysis in Markdown.`;

function buildEnrichPrompt(structural: Codemap, pack: ContextPack | undefined, allowedPaths: string[]): { system: string; user: string } {
  const pathsSection = allowedPaths.map(p => `  - ${p}`).join('\n');
  const system = SYSTEM_ENRICH.replace('{allowedPaths}', pathsSection);

  const userParts: string[] = [];
  userParts.push(`Structural codemap to enrich:\n\`\`\`json\n${JSON.stringify({ traces: structural.traces, title: structural.title }, null, 2)}\n\`\`\``);

  if (pack) {
    userParts.push(`Project tree:\n${pack.tree}`);
    for (const m of pack.manifests) {
      userParts.push(`File: ${m.path}\n\`\`\`\n${m.content.slice(0, 1000)}\n\`\`\``);
    }
    // Samples (may already be redacted / placeholder-stripped by caller)
    let used = 0;
    const sampleBudget = 20_000;
    for (const s of pack.samples) {
      if (used >= sampleBudget) break;
      const snippet = s.content.slice(0, Math.min(1500, sampleBudget - used));
      userParts.push(`File: ${s.path}\n\`\`\`\n${snippet}\n\`\`\``);
      used += snippet.length;
    }
  }

  userParts.push('\nEnrich the codemap: add traceGuide to each trace, refine descriptions, keep only allowed paths.');
  return { system, user: userParts.join('\n\n') };
}

// ── Post-process ───────────────────────────────────────

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Allow exact, relative suffix, or basename match against allowlist */
function pathAllowed(path: string, allowed: Set<string>): boolean {
  const n = normalizePath(path);
  if (allowed.has(n)) return true;
  for (const a of allowed) {
    if (n.endsWith('/' + a) || a.endsWith('/' + n) || n.endsWith(a) || a.endsWith(n)) return true;
    const bn = n.split('/').pop() || n;
    const ba = a.split('/').pop() || a;
    if (bn === ba && bn.includes('.')) return true;
  }
  return false;
}

function filterLocations(trace: Trace, allowed: Set<string>): { kept: number; stripped: number } {
  const before = trace.locations.length;
  trace.locations = trace.locations.filter(loc => pathAllowed(loc.path, allowed));
  return { kept: trace.locations.length, stripped: before - trace.locations.length };
}

function mergeTraces(structural: Trace[], enriched: Trace[]): Trace[] {
  // Prefer enriched traces, but keep structural if enriched trace has no locations
  const result: Trace[] = [];
  const enrichedById = new Map(enriched.map(t => [t.id, t]));

  for (const sTrace of structural) {
    const eTrace = enrichedById.get(sTrace.id);
    if (eTrace && eTrace.locations.length > 0) {
      result.push({ ...sTrace, ...eTrace, locations: eTrace.locations, id: sTrace.id });
    } else {
      result.push(sTrace);
    }
  }

  // Add new traces from enrich that don't exist in structural
  for (const eTrace of enriched) {
    if (!result.some(t => t.id === eTrace.id) && eTrace.locations.length > 0) {
      result.push(eTrace);
    }
  }

  return result;
}

// ── Mock Enrich ────────────────────────────────────────

function mockEnrich(structural: Codemap, allowedPaths: string[]): Codemap {
  const enriched = JSON.parse(JSON.stringify(structural)) as Codemap;
  const allowed = new Set(allowedPaths.map(normalizePath));

  for (const trace of enriched.traces) {
    // Filter locations (fuzzy path match)
    trace.locations = trace.locations.filter(loc => pathAllowed(loc.path, allowed));

    // Add mock traceGuide
    if (!trace.traceGuide) {
      const fileList = trace.locations.slice(0, 3).map(l => `- \`${l.path}\``).join('\n');
      trace.traceGuide = `## ${trace.title}\n\n${trace.description}\n\n### Key files\n${fileList}\n\n*Auto-generated by Mock Enrich*`;
    }

    // Refine title
    if (trace.title && !trace.title.includes(':')) {
      trace.title = `${trace.title}: ${trace.locations.length} files`;
    }
  }

  enriched.metadata.generationSource = 'llm-enrich-mock';
  return enriched;
}

// ── Main ───────────────────────────────────────────────

export async function enrichCodemap(input: EnrichInput): Promise<EnrichResult> {
  const { structural, pack, llm, allowedPaths } = input;
  const allowed = new Set(allowedPaths.map(normalizePath));
  let strippedLocations = 0;
  let repaired = false;

  // Mock path — deterministic, no API
  if (llm.name === 'mock') {
    const codemap = mockEnrich(structural, allowedPaths);
    return { codemap, diagnostics: { strippedLocations: 0, repaired: false, provider: 'mock' } };
  }

  // LLM path
  const { system, user } = buildEnrichPrompt(structural, pack, allowedPaths);

  try {
    const raw = await llm.complete([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
    cleaned = cleaned.trim();

    const result = safeParseCodemap(cleaned);

    if (!result.success) {
      // Fallback to mock on parse failure
      const codemap = mockEnrich(structural, allowedPaths);
      return { codemap, diagnostics: { strippedLocations: 0, repaired: true, provider: llm.name } };
    }

    const enriched = result.data;

    // Filter locations to allowed paths only
    for (const trace of enriched.traces) {
      const { stripped } = filterLocations(trace, allowed);
      strippedLocations += stripped;
    }

    // Merge with structural (keep structural ids, add enrich data)
    const merged = mergeTraces(structural.traces, enriched.traces);

    const codemap: Codemap = {
      ...structural,
      traces: merged,
      metadata: { ...structural.metadata, generationSource: 'llm-enrich' },
    };

    return { codemap, diagnostics: { strippedLocations, repaired: false, provider: llm.name } };
  } catch {
    // Fallback to mock on any error
    const codemap = mockEnrich(structural, allowedPaths);
    return { codemap, diagnostics: { strippedLocations: 0, repaired: true, provider: llm.name } };
  }
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enrichCodemap, redactSamples, applyPrivacyToPack } from '../src/enrichCodemap';
import { MockLLMProvider } from '../src/llmProviders';
import type { Codemap } from '@infinity-canvas/schema';
import type { ContextPack } from '../src/contextPacker';

const structuralBase: Codemap = {
  schemaVersion: 1,
  id: 'test',
  stableId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  metadata: {
    cascadeId: 'x', generationSource: 'structural',
    generationTimestamp: '2026-01-01', mode: 'AUTO',
    originalPrompt: 'test',
  },
  title: 'Test Codemap',
  traces: [
    {
      id: '1',
      title: 'Depends on',
      description: 'Outgoing deps',
      locations: [
        { id: '1a', path: 'src/index.js', lineNumber: 1 },
        { id: '1b', path: 'src/config.js', lineNumber: 1 },
        { id: '1c', path: 'external:react', lineNumber: 1 },
      ],
    },
    {
      id: '2',
      title: 'Used by',
      description: 'Incoming deps',
      locations: [
        { id: '2a', path: 'src/index.js', lineNumber: 1 },
      ],
    },
  ],
};

describe('enrichCodemap', () => {
  it('mock enrich keeps only allowed paths', async () => {
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js', 'src/config.js'],
    });

    expect(result.diagnostics.provider).toBe('mock');
    expect(result.codemap.traces[0].locations.length).toBe(2); // external:react stripped
    expect(result.codemap.traces[0].locations.every(l => l.path !== 'external:react')).toBe(true);
  });

  it('mock enrich adds traceGuide', async () => {
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js', 'src/config.js'],
    });

    for (const trace of result.codemap.traces) {
      expect(trace.traceGuide).toBeTruthy();
    }
  });

  it('mock enrich refines titles', async () => {
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js', 'src/config.js'],
    });

    expect(result.codemap.traces[0].title).toContain(':');
  });

  it('result passes parseCodemap', async () => {
    const { parseCodemap } = await import('@infinity-canvas/schema');
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js', 'src/config.js'],
    });

    // Should not throw
    const reparsed = parseCodemap(JSON.stringify(result.codemap));
    expect(reparsed.traces.length).toBeGreaterThanOrEqual(1);
  });

  it('strips illegal paths added by mock override', async () => {
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js'], // only one allowed
    });

    // Allowed set doesn't include external:react or src/config.js
    for (const trace of result.codemap.traces) {
      for (const loc of trace.locations) {
        expect(loc.path).toBe('src/index.js');
      }
    }
  });

  it('metadata updated to llm-enrich-mock', async () => {
    const mock = new MockLLMProvider();
    const result = await enrichCodemap({
      structural: structuralBase,
      llm: mock,
      allowedPaths: ['src/index.js'],
    });

    expect(result.codemap.metadata.generationSource).toBe('llm-enrich-mock');
  });
});

describe('redactSamples', () => {
  it('redacts apiKey / password / token style assignments', () => {
    const src = [
      'const apiKey = "sk-secret-value-here"',
      'password: hunter2',
      'token = "abc123xyz"',
    ].join('\n');
    const out = redactSamples(src);
    expect(out).not.toContain('sk-secret-value-here');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('abc123xyz');
    expect(out).toMatch(/\[REDACTED\]/);
  });

  it('redacts Bearer and sk- tokens', () => {
    const src = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\napi_key=sk-abcdefghijklmnopqrstuv';
    const out = redactSamples(src);
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(out).not.toMatch(/sk-[a-zA-Z0-9_-]{10,}/);
    expect(out).toMatch(/\[REDACTED\]/);
  });

  it('leaves ordinary code unchanged', () => {
    const src = 'export function add(a: number, b: number) { return a + b; }';
    expect(redactSamples(src)).toBe(src);
  });
});

describe('applyPrivacyToPack', () => {
  const prev = process.env.INFINITY_LLM_SEND_SAMPLES;

  beforeEach(() => {
    delete process.env.INFINITY_LLM_SEND_SAMPLES;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.INFINITY_LLM_SEND_SAMPLES;
    else process.env.INFINITY_LLM_SEND_SAMPLES = prev;
  });

  function makePack(): ContextPack {
    return {
      tree: '.',
      manifests: [{ path: 'package.json', content: '{"apiKey":"sk-abcdefghijklmnop"}' }],
      samples: [{ path: 'src/a.ts', content: 'const secret = "x";\nexport const a = 1;' }],
      stats: { totalChars: 10, budgetChars: 1000, fileCount: 1, skippedCount: 0 },
    };
  }

  it('default OFF: samples become placeholders; manifests redacted', () => {
    const pack = makePack();
    applyPrivacyToPack(pack);
    expect(pack.samples[0].content).toBe('[code sample redacted: src/a.ts]');
    expect(pack.manifests[0].content).not.toContain('sk-abcdefghijklmnop');
    expect(pack.manifests[0].content).toMatch(/\[REDACTED\]/);
  });

  it('ON: samples kept but secret-redacted', () => {
    process.env.INFINITY_LLM_SEND_SAMPLES = '1';
    const pack = makePack();
    pack.samples[0].content = 'const apiKey = "sk-abcdefghijklmnop";\nexport const a = 1;';
    applyPrivacyToPack(pack);
    expect(pack.samples[0].content).toContain('export const a = 1');
    expect(pack.samples[0].content).not.toContain('sk-abcdefghijklmnop');
  });
});

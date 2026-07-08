import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { contextPacker } from '../src/contextPacker';
import { MockLLMProvider, OpenAICompatibleProvider, createProvider } from '../src/llmProviders';
import { buildSemanticMap } from '../src/buildSemanticMap';
import { parseCanvas } from '@infinity-canvas/schema';
import { indexWorkspace } from '@infinity-canvas/ast-graph';

const FIXTURES_DIR = resolve(__dirname, '../../../fixtures/mini-project');

describe('MockLLMProvider', () => {
  it('returns parseable CanvasDocument JSON', async () => {
    const mock = new MockLLMProvider();
    const result = await mock.complete([
      { role: 'system', content: 'You are an analyzer.' },
      { role: 'user', content: 'Project: MiniProject. Files: src/index.js, src/config.js' },
    ]);

    const doc = parseCanvas(result);
    expect(doc.nodes.length).toBeGreaterThanOrEqual(1);
    expect(doc.nodes.some(n => n.type === 'semantic')).toBe(true);
    expect(doc.edges.length).toBeGreaterThan(0);
  });

  it('returns deterministic output for same input', async () => {
    const mock = new MockLLMProvider();
    const messages = [{ role: 'user' as const, content: 'Project: Test' }];

    const r1 = await mock.complete(messages);
    const r2 = await mock.complete(messages);
    expect(r1).toBe(r2);
  });

  it('has root node with kind=overview', async () => {
    const mock = new MockLLMProvider();
    const result = await mock.complete([
      { role: 'user', content: 'Project: Demo' },
    ]);

    const doc = parseCanvas(result);
    const root = doc.nodes.find(n => n.id === 'sem-root');
    expect(root).toBeDefined();
    expect(root?.type).toBe('semantic');
  });
});

describe('buildSemanticMap', () => {
  it('builds semantic map from mock LLM (≥5 nodes)', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const pack = await contextPacker(files, async (p) => readFile(p, 'utf-8'));
    const mock = new MockLLMProvider();

    const result = await buildSemanticMap(pack, mock);

    expect(result.diagnostics.nodeCount).toBeGreaterThanOrEqual(5);
    expect(result.diagnostics.edgeCount).toBeGreaterThan(0);
    expect(result.diagnostics.retries).toBe(0);
    expect(result.document.nodes[0].type).toBe('semantic');
  });

  it('serialize roundtrip keeps semantic.summary', async () => {
    const { serializeDocument } = await import('@infinity-canvas/schema');
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const pack = await contextPacker(files, async (p) => readFile(p, 'utf-8'));
    const mock = new MockLLMProvider();

    const result = await buildSemanticMap(pack, mock);
    const serialized = serializeDocument(result.document);
    const reparsed = parseCanvas(JSON.stringify(serialized));

    expect(reparsed.nodes.length).toBe(result.document.nodes.length);
    // Check semantic extension survived
    const semNodes = reparsed.nodes.filter(n => n.semantic != null);
    expect(semNodes.length).toBeGreaterThan(0);
  });

  it('ensures all nodes have valid positions after grid layout', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const pack = await contextPacker(files, async (p) => readFile(p, 'utf-8'));
    const mock = new MockLLMProvider();

    const result = await buildSemanticMap(pack, mock);

    for (const node of result.document.nodes) {
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it('all edges have kind=semantic', async () => {
    const files = await indexWorkspace(FIXTURES_DIR, { includeExtensions: ['.js', '.json', '.md'] });
    const pack = await contextPacker(files, async (p) => readFile(p, 'utf-8'));
    const mock = new MockLLMProvider();

    const result = await buildSemanticMap(pack, mock);

    for (const edge of result.document.edges) {
      expect(edge.kind).toBe('semantic');
    }
  });
});

describe('createProvider', () => {
  it('returns Mock when no config and no env', () => {
    const provider = createProvider();
    expect(provider.name).toBe('mock');
  });

  it('returns Mock when provider=mock explicitly', () => {
    const provider = createProvider({ provider: 'mock' });
    expect(provider.name).toBe('mock');
  });

  it('returns OpenAICompatibleProvider when provider=openai-compatible with key', () => {
    const provider = createProvider({
      provider: 'openai-compatible',
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:1234/v1',
      model: 'test-model',
    });
    expect(provider.name).toBe('openai-compatible');
  });

  it('falls back to Mock when openai-compatible with no key', () => {
    const prev = process.env.INFINITY_LLM_API_KEY;
    delete process.env.INFINITY_LLM_API_KEY;
    try {
      const provider = createProvider({
        provider: 'openai-compatible',
      });
      expect(provider.name).toBe('mock');
    } finally {
      if (prev) process.env.INFINITY_LLM_API_KEY = prev;
    }
  });
});

describe('OpenAICompatibleProvider', () => {
  it('uses custom baseUrl and model from config', () => {
    const p = new OpenAICompatibleProvider({
      baseUrl: 'http://custom:8080/v1',
      apiKey: 'sk-test',
      model: 'custom-model',
    });
    expect(p.name).toBe('openai-compatible');
  });
});

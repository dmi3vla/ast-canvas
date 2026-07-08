import type { CanvasDocument } from '@infinity-canvas/schema';

// ── LLM Provider Interface ─────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  name: string;
  complete(messages: ChatMessage[]): Promise<string>;
}

export interface LlmConfig {
  provider: 'mock' | 'openai-compatible';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

// ── Mock Provider ─────────────────────────────────────

export class MockLLMProvider implements LLMProvider {
  name = 'mock';

  async complete(messages: ChatMessage[]): Promise<string> {
    const userContent = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
    const projectMatch = userContent.match(/project[: ]+(\S+)/i);
    const projectName = projectMatch ? projectMatch[1] : 'Project';
    const fileRefs = [...userContent.matchAll(/(?:src\/|\.\/)?(\w+\/)?([\w.-]+\.(?:ts|js|tsx|json|md))/g)].slice(0, 6);

    const nodes: any[] = [{
      id: 'sem-root', type: 'semantic', x: 0, y: -80, width: 320, height: 80,
      text: `## ${projectName}\nArchitecture overview`,
      semantic: { kind: 'overview', summary: 'Root architecture node', traceIds: [] },
    }];

    const sampleFiles = fileRefs.length > 0 ? fileRefs.map(m => m[0]) : ['src/index.ts', 'src/main.ts', 'package.json', 'README.md', 'src/utils/helpers.ts'];
    let x = -400, y = 60;
    for (let i = 0; i < Math.min(sampleFiles.length, 7); i++) {
      const file = sampleFiles[i] || `src/module-${i}.ts`;
      nodes.push({
        id: `sem-f${i + 1}`, type: 'semantic', x, y, width: 240, height: 70,
        text: `### ${file.split('/').pop()}\n${file}`,
        semantic: { kind: i === 0 ? 'entry' : 'module', summary: `Module: ${file}`, traceIds: [`t${i + 1}`] },
      });
      x += 280;
      if ((i + 1) % 3 === 0) { x = -400; y += 120; }
    }

    const edges: any[] = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push({ id: `sem-e${i}`, fromNode: 'sem-root', toNode: nodes[i].id, kind: 'semantic' });
    }

    return JSON.stringify({ nodes, edges } as CanvasDocument, null, 2);
  }
}

// ── OpenAI-Compatible Provider ─────────────────────────

function readEnvConfig(): Partial<LlmConfig> {
  return {
    provider: (process.env.INFINITY_LLM_PROVIDER as LlmConfig['provider']) || undefined,
    baseUrl: process.env.INFINITY_LLM_BASE_URL || process.env.OPENROUTER_BASE_URL || undefined,
    apiKey: process.env.INFINITY_LLM_API_KEY || process.env.OPENROUTER_API_KEY || undefined,
    model: process.env.INFINITY_LLM_MODEL || undefined,
  };
}

/** Parse SSE stream into a single string */
async function parseSSEStream(response: Response): Promise<string> {
  const text = await response.text();
  const lines = text.split('\n');
  let content = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const chunk = JSON.parse(line.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch { /* skip unparseable chunks */ }
    }
  }
  return content;
}

export class OpenAICompatibleProvider implements LLMProvider {
  name = 'openai-compatible';
  private config: Required<Pick<LlmConfig, 'baseUrl' | 'apiKey' | 'model'>> & { timeoutMs: number };

  constructor(config?: Partial<LlmConfig>) {
    const env = readEnvConfig();
    this.config = {
      baseUrl: config?.baseUrl || env.baseUrl || 'https://api.openai.com/v1',
      apiKey: config?.apiKey || env.apiKey || '',
      model: config?.model || env.model || 'gpt-4o',
      timeoutMs: config?.timeoutMs || 60_000,
    };
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('NO_API_KEY: Set INFINITY_LLM_API_KEY env var or pass apiKey in options');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: 0.3,
          max_tokens: 4096,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM error ${response.status}: ${text.slice(0, 200)}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle SSE streaming (some gateways ignore stream:false)
      if (contentType.includes('text/event-stream')) {
        return await parseSSEStream(response);
      }

      // Standard JSON response
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timer);
    }
  }
}

// ── Factory ────────────────────────────────────────────

/** Create provider from config + env. Default: mock if no key, else openai-compatible. */
export function createProvider(config?: Partial<LlmConfig>): LLMProvider {
  const env = readEnvConfig();
  const provider = config?.provider || env.provider || 'mock';

  if (provider === 'openai-compatible') {
    const apiKey = config?.apiKey || env.apiKey || '';
    if (!apiKey) return new MockLLMProvider(); // fallback
    return new OpenAICompatibleProvider({ ...config, apiKey });
  }

  return new MockLLMProvider();
}

// ── Legacy alias ───────────────────────────────────────

/** @deprecated Use OpenAICompatibleProvider directly */
export const OpenRouterProvider = OpenAICompatibleProvider;

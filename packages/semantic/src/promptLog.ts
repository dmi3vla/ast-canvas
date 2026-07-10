/**
 * Prompt I/O debug logging — full chat messages in + raw LLM out.
 *
 * Enable:  INFINITY_LLM_LOG_PROMPTS=1  (default: on)
 * Disable: INFINITY_LLM_LOG_PROMPTS=0
 *
 * Files (when setPromptLogDir is called, e.g. workspace open):
 *   <dir>/prompts.jsonl              — one JSON line per event
 *   <dir>/<id>-in.json               — request messages
 *   <dir>/<id>-out.txt               — raw model text
 *   <dir>/<id>-meta.json             — model, provider, duration, error
 *
 * Also prints a short console line always when enabled.
 */
import { appendFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ChatMessage } from './llmProviders';

let logDir: string | null = null;
let seq = 0;

/** Default on unless explicitly disabled with 0/false/off */
export function isPromptLogEnabled(): boolean {
  const v = (process.env.INFINITY_LLM_LOG_PROMPTS ?? '1').toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

/** Set directory for prompt dumps (e.g. workspace/.infinity-canvas/logs/prompts). */
export function setPromptLogDir(dir: string | null): void {
  logDir = dir;
  if (dir && !existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      /* ignore */
    }
  }
}

export function getPromptLogDir(): string | null {
  return logDir;
}

/** Redact secrets before writing prompts to disk/console. */
export function sanitizePromptText(s: string): string {
  return s
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key\s*[=:]\s*['"]?\S+['"]?/gi, 'api_key=[REDACTED]')
    .replace(/password\s*[=:]\s*['"]?\S+['"]?/gi, 'password=[REDACTED]')
    .replace(/token\s*[=:]\s*['"]?\S+['"]?/gi, 'token=[REDACTED]');
}

function nextId(): string {
  seq += 1;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${ts}-${String(seq).padStart(4, '0')}`;
}

function summarizeMessages(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const n = m.content?.length ?? 0;
      const head = (m.content || '').slice(0, 80).replace(/\s+/g, ' ');
      return `${m.role}(${n}c): ${head}${n > 80 ? '…' : ''}`;
    })
    .join(' | ');
}

function writeJsonl(entry: Record<string, unknown>): void {
  if (!logDir) return;
  try {
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    appendFileSync(join(logDir, 'prompts.jsonl'), JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    /* ignore */
  }
}

function writeFileSafe(path: string, content: string): void {
  try {
    writeFileSync(path, content, 'utf-8');
  } catch {
    /* ignore */
  }
}

export interface PromptLogContext {
  provider: string;
  model?: string;
  tag?: string; // e.g. 'semantic-map' | 'enrich'
}

/**
 * Log a full chat turn: call before request, then finish with out/error.
 */
export function beginPromptLog(
  messages: ChatMessage[],
  ctx: PromptLogContext,
): { id: string; end: (out: { content?: string; error?: string; durationMs?: number }) => void } {
  const id = nextId();
  if (!isPromptLogEnabled()) {
    return { id, end: () => {} };
  }

  const safeMessages = messages.map((m) => ({
    role: m.role,
    content: sanitizePromptText(m.content || ''),
  }));
  const totalChars = safeMessages.reduce((a, m) => a + m.content.length, 0);

  console.log(
    `[llm-prompt IN ${id}] ${ctx.provider}${ctx.model ? '/' + ctx.model : ''}${ctx.tag ? ' ' + ctx.tag : ''} ` +
      `msgs=${messages.length} chars=${totalChars} :: ${summarizeMessages(messages)}`,
  );

  writeJsonl({
    id,
    ts: new Date().toISOString(),
    direction: 'in',
    provider: ctx.provider,
    model: ctx.model,
    tag: ctx.tag,
    messageCount: messages.length,
    totalChars,
    messages: safeMessages,
  });

  if (logDir) {
    if (!existsSync(logDir)) {
      try {
        mkdirSync(logDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
    writeFileSafe(join(logDir, `${id}-in.json`), JSON.stringify({ id, ...ctx, messages: safeMessages }, null, 2));
  }

  return {
    id,
    end: ({ content, error, durationMs }) => {
      const safeOut = content != null ? sanitizePromptText(content) : undefined;
      const outChars = safeOut?.length ?? 0;
      const preview = (safeOut || error || '').slice(0, 120).replace(/\s+/g, ' ');

      console.log(
        `[llm-prompt OUT ${id}] ${error ? 'ERROR ' + error.slice(0, 80) : `chars=${outChars}`}` +
          (durationMs != null ? ` ${durationMs}ms` : '') +
          ` :: ${preview}${outChars > 120 || (error && error.length > 120) ? '…' : ''}`,
      );

      writeJsonl({
        id,
        ts: new Date().toISOString(),
        direction: error ? 'error' : 'out',
        provider: ctx.provider,
        model: ctx.model,
        tag: ctx.tag,
        durationMs,
        outChars,
        content: safeOut,
        error: error ? sanitizePromptText(error) : undefined,
      });

      if (logDir) {
        if (safeOut != null) writeFileSafe(join(logDir, `${id}-out.txt`), safeOut);
        writeFileSafe(
          join(logDir, `${id}-meta.json`),
          JSON.stringify(
            {
              id,
              provider: ctx.provider,
              model: ctx.model,
              tag: ctx.tag,
              durationMs,
              outChars,
              error: error ? sanitizePromptText(error) : undefined,
            },
            null,
            2,
          ),
        );
      }
    },
  };
}

/** Wrap any LLMProvider to log complete() in/out. */
export function withPromptLogging<T extends { name: string; complete(messages: ChatMessage[]): Promise<string> }>(
  provider: T,
  opts?: { model?: string; tag?: string },
): T {
  const complete = provider.complete.bind(provider);
  return {
    ...provider,
    async complete(messages: ChatMessage[]): Promise<string> {
      const t0 = Date.now();
      const log = beginPromptLog(messages, {
        provider: provider.name,
        model: opts?.model,
        tag: opts?.tag,
      });
      try {
        const content = await complete(messages);
        log.end({ content, durationMs: Date.now() - t0 });
        return content;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.end({ error: msg, durationMs: Date.now() - t0 });
        throw err;
      }
    },
  } as T;
}

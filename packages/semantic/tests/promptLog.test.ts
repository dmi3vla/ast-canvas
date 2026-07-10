import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  setPromptLogDir,
  isPromptLogEnabled,
  sanitizePromptText,
  beginPromptLog,
  withPromptLogging,
} from '../src/promptLog';
import type { ChatMessage, LLMProvider } from '../src/llmProviders';

describe('promptLog', () => {
  const prev = process.env.INFINITY_LLM_LOG_PROMPTS;
  let dir: string;

  beforeEach(() => {
    process.env.INFINITY_LLM_LOG_PROMPTS = '1';
    dir = mkdtempSync(join(tmpdir(), 'ic-prompts-'));
    setPromptLogDir(dir);
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.INFINITY_LLM_LOG_PROMPTS;
    else process.env.INFINITY_LLM_LOG_PROMPTS = prev;
    setPromptLogDir(null);
  });

  it('sanitizePromptText redacts secrets', () => {
    const s = sanitizePromptText('key sk-abcdefghijklmnop Bearer xyz api_key=secret');
    expect(s).not.toContain('sk-abcdefghijklmnop');
    expect(s).toMatch(/REDACTED/);
  });

  it('isPromptLogEnabled respects 0', () => {
    process.env.INFINITY_LLM_LOG_PROMPTS = '0';
    expect(isPromptLogEnabled()).toBe(false);
    process.env.INFINITY_LLM_LOG_PROMPTS = '1';
    expect(isPromptLogEnabled()).toBe(true);
  });

  it('beginPromptLog writes in/out files', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Say hi' },
    ];
    const log = beginPromptLog(messages, { provider: 'test', model: 'm1', tag: 'unit' });
    log.end({ content: '{"ok":true}', durationMs: 12 });

    const files = readdirSync(dir);
    expect(files.some((f) => f.endsWith('-in.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('-out.txt'))).toBe(true);
    expect(files).toContain('prompts.jsonl');

    const jsonl = readFileSync(join(dir, 'prompts.jsonl'), 'utf-8').trim().split('\n');
    expect(jsonl.length).toBe(2);
    const inLine = JSON.parse(jsonl[0]);
    const outLine = JSON.parse(jsonl[1]);
    expect(inLine.direction).toBe('in');
    expect(outLine.direction).toBe('out');
    expect(outLine.content).toContain('ok');
  });

  it('withPromptLogging wraps complete', async () => {
    const mock: LLMProvider = {
      name: 'mock-wrap',
      async complete() {
        return 'RESULT';
      },
    };
    const wrapped = withPromptLogging(mock, { model: 'x' });
    const out = await wrapped.complete([{ role: 'user', content: 'ping' }]);
    expect(out).toBe('RESULT');
    expect(existsSync(join(dir, 'prompts.jsonl'))).toBe(true);
  });
});

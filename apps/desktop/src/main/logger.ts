import { join } from 'path';
import { appendFile, mkdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const MAX_LOG_BYTES = 1_000_000; // 1 MB before truncate

let logPath: string | null = null;
let logSize = 0;
let sizeKnown = false;

/** Set workspace root for log output — logs go to .infinity-canvas/logs/app.log */
export function setLogWorkspace(workspaceRoot: string): void {
  logPath = join(workspaceRoot, '.infinity-canvas', 'logs', 'app.log');
  logSize = 0;
  sizeKnown = false;
}

async function ensureSize(): Promise<void> {
  if (!logPath || sizeKnown) return;
  try {
    if (existsSync(logPath)) {
      const s = await stat(logPath);
      logSize = s.size;
    } else {
      logSize = 0;
    }
  } catch {
    logSize = 0;
  }
  sizeKnown = true;
}

/** Write a structured log line */
export async function logEvent(
  level: 'INFO' | 'WARN' | 'ERROR',
  category: string,
  message: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!logPath) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    category,
    msg: message,
    ...(extra || {}),
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    const dir = join(logPath, '..');
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await ensureSize();

    // Truncate (rotate) if over limit
    if (logSize > MAX_LOG_BYTES) {
      await writeFile(logPath, line);
      logSize = line.length;
      return;
    }

    await appendFile(logPath, line, 'utf-8');
    logSize += line.length;
  } catch {
    // Silently ignore log failures
  }
}

/** Strip secrets from string before logging */
export function sanitizeForLog(s: string): string {
  return s
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]');
}

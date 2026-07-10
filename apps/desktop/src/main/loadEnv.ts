/**
 * Load monorepo / desktop .env into process.env (does not override existing).
 * Paths tried (first existing wins, later files fill gaps):
 *   <repo>/.env
 *   <repo>/.env.local
 *   apps/desktop/.env
 *   apps/desktop/.env.local
 */
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function applyEnv(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (process.env[k] === undefined || process.env[k] === '') {
      process.env[k] = v;
    }
  }
}

/** Resolve monorepo root from main process (walk up for package name infinity-canvas). */
function monorepoRoot(): string {
  let dir = resolve(__dirname);
  for (let i = 0; i < 8; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const name = JSON.parse(readFileSync(pkg, 'utf-8')).name;
        if (name === 'infinity-canvas') return dir;
      } catch { /* continue */ }
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // fallback: electron-vite out/main → repo root
  return resolve(__dirname, '../../../..');
}

export function loadEnvFiles(): { loaded: string[]; vars: string[] } {
  const root = monorepoRoot();
  const desktop = join(root, 'apps', 'desktop');
  const candidates = [
    join(root, '.env'),
    join(root, '.env.local'),
    join(desktop, '.env'),
    join(desktop, '.env.local'),
  ];

  const loaded: string[] = [];
  const keys = new Set<string>();

  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const vars = parseEnvFile(readFileSync(p, 'utf-8'));
      applyEnv(vars);
      Object.keys(vars).forEach(k => keys.add(k));
      loaded.push(p);
    } catch {
      /* ignore unreadable */
    }
  }

  return { loaded, vars: [...keys] };
}

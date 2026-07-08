import type { Session } from './types';
import { createDefaultSession } from './types';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const CACHE_DIR = '.infinity-canvas';
const SESSION_FILE = 'session.json';
const SEMANTIC_MAP_FILE = 'semantic-map.canvas';

/** In-memory session store */
export class SessionStore {
  private session: Session;

  constructor(initial?: Partial<Session>) {
    this.session = { ...createDefaultSession(), ...initial };
  }

  /** Get current session (read-only snapshot) */
  get(): Readonly<Session> {
    return this.session;
  }

  /** Patch session with partial update */
  patch(partial: Partial<Session>): void {
    Object.assign(this.session, partial);
  }

  /** Patch only UI state */
  patchUI(ui: Partial<Session['ui']>): void {
    Object.assign(this.session.ui, ui);
  }

  /** Save session to workspace cache directory */
  async saveToWorkspace(workspaceRoot: string): Promise<void> {
    const cacheDir = join(workspaceRoot, CACHE_DIR);
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true });
    }

    // Save session JSON (without large semanticMap — kept separate)
    const sessionData = {
      workspaceRoot: this.session.workspaceRoot,
      cacheKey: this.session.cacheKey,
      ui: this.session.ui,
      // Only save codemap keys reference, not full data (files are large)
      codemapKeys: Object.keys(this.session.codemaps),
    };

    await writeFile(
      join(cacheDir, SESSION_FILE),
      JSON.stringify(sessionData, null, 2),
      'utf-8',
    );

    // Save semantic map as .canvas file
    if (this.session.semanticMap) {
      const { serializeDocument } = await import('@infinity-canvas/schema');
      const serialized = serializeDocument(this.session.semanticMap);
      await writeFile(
        join(cacheDir, SEMANTIC_MAP_FILE),
        JSON.stringify(serialized, null, 2),
        'utf-8',
      );
    }
  }

  /** Load session from workspace cache directory */
  async loadFromWorkspace(workspaceRoot: string): Promise<boolean> {
    const cacheDir = join(workspaceRoot, CACHE_DIR);
    const sessionPath = join(cacheDir, SESSION_FILE);
    const mapPath = join(cacheDir, SEMANTIC_MAP_FILE);

    if (!existsSync(sessionPath)) return false;

    try {
      const sessionRaw = await readFile(sessionPath, 'utf-8');
      const sessionData = JSON.parse(sessionRaw);

      // Restore UI
      if (sessionData.ui) {
        this.session.ui = { ...this.session.ui, ...sessionData.ui };
      }
      this.session.workspaceRoot = workspaceRoot;
      if (sessionData.cacheKey) {
        this.session.cacheKey = sessionData.cacheKey;
      }

      // Load semantic map if exists
      if (existsSync(mapPath)) {
        const { parseCanvas } = await import('@infinity-canvas/schema');
        const mapRaw = await readFile(mapPath, 'utf-8');
        this.session.semanticMap = parseCanvas(mapRaw);
      }

      return true;
    } catch {
      return false;
    }
  }
}

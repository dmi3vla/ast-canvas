
задачи под 3ю фазу исходя из сделанного

## Tools

- Read: /home/resu/Documents/dev/ast-canvas/packages/schema/src/index.ts
- Read: /home/resu/Documents/dev/ast-canvas/packages/session/src/index.ts
- Read: /home/resu/Documents/dev/ast-canvas/packages/canvas-core/src/types.ts
- Read: /home/resu/Documents/dev/ast-canvas/AGENT_PLAN.md (251-330)
- Read: /home/resu/Documents/dev/ast-canvas/docs/STATUS.md (1-70)

## Assistant

# Фаза 3 — задачи (из текущего состояния)

## База «как есть»

| Есть | Нет / stub |
|------|------------|
| `canvas-core`: `ICNode`/`ICEdge`/`CanvasDocument` (TS interfaces, **без** Zod) | `packages/schema` — placeholder |
| serialize/load Obsidian-like JSON + 16 tests | `semantic?` / `graph?` на узле |
| `ast-graph`: `FileMeta`, `indexWorkspace` | `DepGraph` model |
| App: `rightMode`, `selectedNodeId`, `leftRatio` (локальный React state) | `packages/session` |
| research: `02-codemap-schema.md`, `langgraph.codemap` | parse/validate codemap package |
| fixtures/mini-project | session cache `.infinity-canvas/` |

**Опциональный pre-work (не блокирует 3.1, желателен до 3.4 wire):**  
`lastWorkspacePath` on getLast · wire `countFiles` · commit 2.4/2.5.

**Не в фазе 3:** LLM map, AST imports resolve, monaco, UI chrome semantic nodes.

---

## Цель фазы 3

Единый **source of truth** типов/валидации + session, чтобы:
- canvas-core / App / future semantic **не дублировали** модели  
- `.canvas` / `.codemap` / dep graph **парсились с Zod**  
- UI state (`rightMode`…) жил в session (хотя бы API + persist)

**DoD фазы 3 (глобальный)**  
- [ ] `pnpm typecheck` + schema/session/ast-graph tests green  
- [ ] `cremniy_canvas.canvas` parse OK  
- [ ] `langgraph.codemap` parse OK  
- [ ] DepGraph egoNetwork tests  
- [ ] Session save→reload preserves map id + ui  
- [ ] canvas-core **импортирует** document types из `@infinity-canvas/schema` (или re-export)  
- [ ] `docs/STATUS.md` → Phase 3 ✅, next Phase 4  

---

## 3.0 (опционально, 30–45 мин) — residual P2

**Зачем:** session/cache path guards не врут.

```
ТОЛЬКО residual Phase 2 (не schema):
1) workspace:getLast → lastWorkspacePath = path if exists
2) Open Folder / auto-load: fileCount = countFiles(root) from @infinity-canvas/ast-graph
3) commit uncommitted 2.4/2.5 if dirty
pnpm typecheck && pnpm test
STATUS: residual notes cleared
```

---

## 3.1 — CanvasDocument schema (Zod) ⭐ старт

**Зачем:** schema package вместо дубля `canvas-core/types.ts`.

**Файлы**
```
packages/schema/
  src/
    canvas.ts      # Zod + types
    index.ts
  tests/
    canvas.test.ts
```

**Модель (совместить с canvas-core + AGENT_PLAN)**
```ts
// extensions поверх Obsidian
ICNode.semantic?: { kind?: string; summary?: string; traceIds?: string[]; fileAnchors?: string[] }
ICNode.graph?: { path?: string; symbol?: string; role?: 'module'|'fn'|'class' }
ICEdge.kind?: 'semantic'|'import'|'call'|'inherit'|'derives'
// runtime isSelected НЕ в schema document (strip on serialize)
```

**Промт агенту**
```
Этап 3.1 ONLY. packages/schema.

1) Zod CanvasDocument / ICNode / ICEdge (Obsidian-compatible):
   - nodes: id,type,x,y,width,height,color?,text?,file?
   - type: text|file|semantic|group (и unknown type → strip or passthrough text?)
   - edges: id,fromNode,toNode,fromSide?,toSide?,label?,kind?
   - extensions: semantic?, graph? optional
2) parseCanvas(json|unknown), safeParse, migrateLegacy() (noop ok)
3) stripRuntime() — убрать isSelected при export
4) Tests:
   a) load ../../cremniy_canvas.canvas (or copy to fixtures/) — parse success, nodes.length>0
   b) roundtrip with semantic+kind extensions
   c) invalid node (missing id) → error
5) package.json: dependency zod
6) canvas-core: types re-export from @infinity-canvas/schema OR adapt CanvasState to use schema types
   (prefer: schema owns types; canvas-core imports Serialized* + parse helpers)
7) НЕ делать codemap/session/LLM.

DoD: pnpm --filter @infinity-canvas/schema test; typecheck all; STATUS 3.1 ✅
```

**DoD 3.1**
- [ ] Zod schemas + exported types  
- [ ] `cremniy_canvas.canvas` golden parse  
- [ ] extension roundtrip  
- [ ] canvas-core typecheck against schema  

---

## 3.2 — Codemap schema

**Зачем:** RIGHT codemap mode (фаза 7/8) + import `langgraph.codemap`.

**Опора:** `docs/research/02-codemap-schema.md` + errata (optional fields).

**Файлы**
```
packages/schema/src/codemap.ts
packages/schema/tests/codemap.test.ts
```

**Промт**
```
Этап 3.2 ONLY.

1) Zod Codemap / Trace / Location из langgraph.codemap:
   - Location: id, path, lineNumber required;
     lineContent, title, description OPTIONAL (LLM-friendly)
   - Trace: id, title, description, locations.min(1);
     traceTextDiagram?, traceGuide? optional
   - Root: schemaVersion, id, stableId, metadata, title, traces;
     description?, mermaidDiagram? optional
2) parseCodemap / safeParse
3) helpers (pure):
   - listTraces(codemap)
   - flattenLocations(codemap)
   - tracesToContentSummary(trace) for RIGHT panel
4) Golden: parse repo root langgraph.codemap → traces.length === 6
5) Export from schema/index.ts
6) НЕ UI, НЕ LLM.

DoD: golden test green; STATUS 3.2 ✅
```

**DoD 3.2**
- [ ] parse real `langgraph.codemap`  
- [ ] optional location fields work  
- [ ] helpers unit-tested  

---

## 3.3 — DepGraph model (pure)

**Зачем:** фаза 6 build graph / 7 ego — сначала типы + ops.

**Файлы**
```
packages/schema/src/dep-graph.ts   # или packages/ast-graph/src/dep-graph.ts
packages/schema/tests/dep-graph.test.ts
# предпочтение: types+pure helpers в schema; build later in ast-graph
```

**API**
```ts
DepNode { id, path, name?, kind?: 'file'|'module'|'external' }
DepEdge { id?, from, to, kind: 'import'|'call'|'type'|'export', loc? }
DepGraph { nodes: Map|Record, edges: DepEdge[] }

incoming(g, id), outgoing(g, id)
egoNetwork(g, centerId, depth)  // deps in + derives out
// optional: topologicalLayers if DAG
```

**Промт**
```
Этап 3.3 ONLY. Pure data model, no FS/AST parse.

1) DepGraph types + pure helpers in packages/schema (or ast-graph if you justify)
2) Fixture graph A→B→C + external X
3) Tests: incoming/outgoing/ego depth 1 and 2
4) Re-export. No WorkspaceIndexer changes except export type if needed.
5) НЕ resolve imports from real files (Phase 6).

DoD: tests green; STATUS 3.3 ✅
```

**DoD 3.3**
- [ ] egoNetwork(depth) correct on fixture  
- [ ] no native/ast-grep  

---

## 3.4 — Session state + cache skeleton

**Зачем:** связать workspace + semanticMap + ui для фазы 4.

**Файлы**
```
packages/session/src/
  types.ts
  SessionStore.ts   # class or createSessionStore()
  cache.ts          # read/write under workspace/.infinity-canvas/
  index.ts
packages/session/tests/session.test.ts
```

**Модель**
```ts
Session {
  workspaceRoot: string | null
  semanticMap: CanvasDocument | null
  codemaps: Record<nodeId, Codemap>  // Map serializes poorly — use Record
  depGraph: DepGraph | null
  fileIndex?: FileMeta[] | null      // optional, from indexer
  cacheKey: string | null            // hash later; string ok
  ui: {
    selectedNodeId: string | null
    rightMode: 'empty'|'content'|'codemap'|'source'
    leftRatio: number
    source?: { path: string; line: number }
  }
}
```

**Промт**
```
Этап 3.4 ONLY.

1) Session types using @infinity-canvas/schema (+ FileMeta from ast-graph optional)
2) SessionStore:
   - createDefault(), patch(partial), get()
   - saveToWorkspace(root) → .infinity-canvas/session.json (and/or semantic-map.canvas)
   - loadFromWorkspace(root)
3) cacheKey: simple join of fileCount+mtime max for now OR placeholder ""
4) Tests with temp dir (fs): save→load preserves semanticMap node ids + ui.rightMode
5) Optional light wire in App: leftRatio + rightMode from store (NOT required if risky)
   Minimum: package API only + test.
6) IPC session:get/patch — optional; if skip, document as Phase 4.

НЕ build semantic map via LLM.

DoD: session test green; STATUS 3.4 ✅ + Phase 3 DoD
```

**DoD 3.4**
- [ ] persist/load session  
- [ ] ui includes rightMode/leftRatio  
- [ ] depends on schema 3.1–3.3  

---

## 3.5 (рекомендуется) — thin integration glue

Не «новая фаза», а **закрытие** 3.x в app (1 PR):

```
После 3.1–3.4:
1) desktop Open Folder: SessionStore.loadFromWorkspace / create
2) CanvasView: if session.semanticMap → loadData(JSON) else demo seed
3) onSelect: session.ui.selectedNodeId + rightMode=content;
   RightPane shows node from semanticMap/demo by id (text/summary)
4) leftRatio persist via session.ui (can keep config:set dual-write once)
pnpm typecheck; manual smoke note in STATUS
```

Без 3.5 фаза 3 «висячие packages» — как indexer до wire.

---

## Порядок и параллелизм

```
[3.0 residual] optional
    ↓
  3.1 Canvas Zod     ← START
    ↓
  3.2 Codemap    ‖   3.3 DepGraph   (после 3.1 можно параллельно)
    ↓
  3.4 Session (нужны 3.1 + желательно 3.2/3.3)
    ↓
  3.5 thin App wire (optional but recommended)
    ↓
  Phase 4 LLM semantic map
```

| ID | Зависит от | Оценка |
|----|------------|--------|
| 3.1 | — | 0.5–1 d |
| 3.2 | 3.1 exports | 0.5 d |
| 3.3 | 3.1 or alone | 0.5 d |
| 3.4 | 3.1 + (3.2, 3.3) | 0.5–1 d |
| 3.5 | 3.4 | 0.5 d |

---

## Master prompt (на старт 3.1)

```
Проект: ast-canvas monorepo.
Сделано: Phase 2 canvas-core (Canvas2D LEFT) + WorkspaceIndexer package + split UI.
schema/session = stubs.

Layout locked: LEFT canvas always | RIGHT empty|content|codemap|source.

Сейчас ТОЛЬКО этап 3.1 (Zod CanvasDocument).
Промт — AGENT tasks 3.1.
Опора: packages/canvas-core/src/types.ts, cremniy_canvas.canvas, docs/research/02.
Vendor RO. No LLM, no ast-grep, no DepGraph builder from files.
После этапа: pnpm typecheck + schema tests; docs/STATUS.md.
Append session notes; don't wipe history.
```

---

## Анти-съезд (фаза 3)

1. Сначала **Zod + tests**, потом UI wire.  
2. Не переносить всю логику canvas в schema — только document/types/validate.  
3. Codemap location fields **optional** (errata).  
4. DepGraph = pure graph; **не** parse imports (это 6.x).  
5. Session cache local only; no cloud.  
6. Один этап = один PR/commit message `feat(3.1): …`.  

---

## После фазы 3 → Phase 4 (preview)

Не делать сейчас, только горизонт:
- `packages/semantic`: ContextPacker + MockLLM + `buildSemanticMap` → `CanvasDocument`  
- onWorkspaceOpen → session.semanticMap → LEFT `loadData`  
- RIGHT empty until select  

---

**Старт:** **3.1** (Zod canvas + golden `cremniy_canvas.canvas` + выравнивание types с canvas-core).
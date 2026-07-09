# Infinity Canvas — Project Status

> Последнее обновление: 2026-07-09  
> Текущая фаза: **5 — AST Graph** 🔄

---

## Фаза 1 — Reverse Engineering (read-only) ✅ (accepted with errata)

> **Errata applied (2026-07-09):** message protocol исправлен по `out/extension.js` (`loadContent`, `groqApiKey`, etc.),
> оценка размера canvas ~5 878 LOC (не ~1 000), `source/deobfuscated.js` = webview app (не пустой),
> xyflow = DOM/SVG (не WebGL), ADR-5 отложен (file-level imports first, ast-grep deferred).

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 1.1 | `docs/research/01-infinite-canvas.md` | ✅ (patched) |
| 1.2 | `docs/research/02-codemap-schema.md` | ✅ |
| 1.3 | `docs/research/03-code-canvas-extract.md` | ✅ (patched) |
| 1.4 | `docs/research/04-gap-matrix.md` + ADRs | ✅ (ADR-5 patched) |

### DoD Фазы 1:
- [x] Архитектура Infinite Canvas разобрана: activation, editor provider, webview messaging, data flow
- [x] Codemap schema формализована: JSON-shape, Zod sketch, mapping table на RIGHT pane
- [x] Code Canvas capabilities checklist + source/ module map
- [x] Gap matrix + 5 ADR приняты (Electron, Split Layout, Canvas2D, LLM Interface, AST Engine)
- [x] Split layout зафиксирован в ADR-2 явно
- [x] Port targets для canvas-core определены (п.8 в 01-infinite-canvas.md)

### Ключевые решения (ADR):
1. **ADR-1:** Electron standalone (не VS Code extension)
2. **ADR-2:** Split LEFT canvas | RIGHT detail (resizable, persist ratio)
3. **ADR-3:** Canvas2D рендеринг (порт из Infinite Canvas)
4. **ADR-4:** Абстрактный LLM интерфейс + Mock для dev/CI
5. **ADR-5a:** File-level imports (regex/tsc) как локальный движок зависимостей (ast-grep deferred → Phase 6+)

---

## Следующая фаза: 3 — Unified Data Model ✅

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 3.0 | Residual: getLastWorkspace exists check | ✅ |
| 3.1 | `packages/schema/src/canvas.ts` — Zod + golden test | ✅ |
| 3.2 | `packages/schema/src/codemap.ts` — langgraph.codemap parse | ✅ |
| 3.3 | `packages/schema/src/dep-graph.ts` — pure graph + egoNetwork | ✅ |
| 3.4 | `packages/session/` — SessionStore + .infinity-canvas/ cache | ✅ |
| 3.5 | Thin wire: canvas-core re-exports + STATUS | ✅ |

### DoD Фазы 3:
- [x] `pnpm typecheck` — 8/8 зелёные
- [x] `pnpm test` — 61 тест (schema 31, canvas-core 16, ast-graph 7, session 7)
- [x] `cremniy_canvas.canvas` parse OK (golden test)
- [x] `langgraph.codemap` parse OK (6 traces, loc fields optional)
- [x] DepGraph egoNetwork depth tests on fixture A→B→C
- [x] Session save→load preserves map node ids + ui state
- [x] Schema = single source of truth for canvas/codemap/dep-graph types
- [x] `docs/STATUS.md` → Phase 3 ✅, next Phase 4

---

## Следующая фаза: 4 — LLM Semantic Map ✅

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 4.1 | `packages/semantic/src/contextPacker.ts` — pack workspace for LLM | ✅ |
| 4.2 | `packages/semantic/src/llmProviders.ts` — MockLLM + OpenRouter | ✅ |
| 4.3 | `packages/semantic/src/buildSemanticMap.ts` — prompt → parse → layout | ✅ |
| 4.4 | `main/index.ts` IPC pipeline + App wire (open → map → LEFT) | ✅ |
| 4.5 | Toolbar «Regenerate Map» + cache second open | ✅ |
| T1 | `LlmConfig` + `OpenAICompatibleProvider` + SSE + env | ✅ |
| T2 | `createProvider()` replaces hardcoded Mock in main | ✅ |
| T3 | `prompts.ts`: SYSTEM_CODEMAP + few-shot + `projectCodemapToCanvas` | ✅ |
| T4 | `test:live-llm` smoke: Haiku → 4 traces, 14 locs → canvas OK | ✅ |

### DoD Фазы 4:
- [x] `pnpm typecheck` — 8/8 зелёные
- [x] `pnpm test` — 79 тестов
- [x] Mock: open mini-project → LEFT ≥5 semantic nodes
- [x] **Live Haiku:** `test:live-llm` → codemap parse OK (4 traces) → canvas projection OK (4 nodes, 3 edges)
- [x] Cache: second open loads from `.infinity-canvas/semantic-map.canvas`
- [x] CI green, no API key required (Mock by default)
- [x] `createProvider` auto: Mock without key, OpenAI-compatible with `INFINITY_LLM_*` env
- [x] `.env.example` template, `.gitignore` covers `.env*`
- [x] `docs/STATUS.md` → Phase 4 ✅, next Phase 5

---

## Следующая фаза: 5 — AST Graph (import resolution) 🔄

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 5.1 | `packages/ast-graph/src/import-resolver.ts` — regex import extractor | ✅ |
| 5.2 | `packages/ast-graph/src/depGraphBuilder.ts` — DepGraph from workspace files | ✅ |
| 5.3 | `RightPane` Codemap → `DepGraphSection` with IPC `workspace:depGraph` | ✅ |
| 5.4 | Token references (lightweight, file-level) — deferred to 6.x | ⏳ |

### DoD Фазы 5:
- [x] `pnpm typecheck` — 8/8 зелёные
- [x] `pnpm test` — 90 тестов (schema 32, canvas-core 16, ast-graph 18, semantic 17, session 7)
- [x] Import resolver: ES6 named/default/namespace/side-effect + CJS + dynamic + type-only
- [x] Real file test: `fixtures/mini-project/src/index.js` → extracts imports correctly
- [x] DepGraph builder: resolves relative imports, marks external modules
- [x] RIGHT Codemap: shows deps-in/derives-out via `workspace:depGraph` IPC
- [x] Fallback: static anchors when no workspace open
- [x] `electron-vite` bundling: workspace packages bundled inline (not externalized)

---

## Следующая фаза: 6 — AST / DepGraph (backend deepen)

Ближайшие этапы:
- 6.1 — TS/JS adapter (acorn/tsc for deeper AST)
- 6.2 — DepGraphService with watch + cache
- 6.3 — Symbol-level extraction (optional spike)
- 6.4 — Wire to RIGHT with ego + navigation

### Known residual (Phase 4 / UX from docs/1-3.png review):
- [x] **P1** `CanvasView` only applied `initialData` on mount → after `buildMap` UI stayed on **demo seed** (screenshots). Fixed: react to `initialData` + `loadData` + `fitView`
- [x] RIGHT content was mock (`Node: node_9`); now shows node text/summary/anchors
- [x] Node label rendering: newlines + strip `#` markdown
- [x] load/export preserve `semantic`/`graph` on nodes
- [ ] Toolbar not visible on screenshots when no workspace — Open Folder first / auto-load
- [ ] Source needs path under workspace (resolved relative→abs); monaco later
- [ ] Real DepGraph deps (not anchors only) → Phase 5–6
- [ ] `canvas-core` types still independent from `schema` (non-blocking)
- [ ] Dual demo vs map: empty state without workspace still shows demo seed (OK)

### Screenshot notes (`docs/1.png` `2.png` `3.png`):
LEFT = demo seed (Architecture / Canvas Core / IPC / AppShell), not LLM map —
caused by P1. After fix: Open Folder or Regenerate should replace demo.
RIGHT codemap/source were placeholder mocks — content path fixed; deps still Phase 5.

```
infinity-canvas/
├── apps/
│   └── desktop/          # electron-vite + React + TS
├── packages/
│   ├── canvas-core/      # infinite canvas (LEFT)
│   ├── detail-pane/      # RIGHT: empty|content|codemap|source
│   ├── schema/           # Zod types + validators
│   ├── semantic/         # LLM context packer + codemap builder
│   ├── ast-graph/        # Workspace indexer + dep graph (file-level first)
│   ├── ipc/              # Electron IPC contracts
│   └── session/          # session state + cache
├── docs/
│   └── research/         # ✅ Фаза 1 артефакты
├── fixtures/
│   └── mini-project/     # тестовый проект
└── README.md
```

---

## Vendor (read-only, не менять)

- `luisfernando.infinite-canvas-0.1.5/` — Canvas UI reference
- `alex-c.code-canvas-app-0.14.8/` — AST deps reference
- `source/` — Webpack chunks (research only)
- `langgraph.codemap` — Schema reference
- `cremniy_canvas.canvas` — Roadmap prompts

---

## Инварианты (не нарушать)

1. LEFT = infinite canvas ВСЕГДА (semantic map workspace)
2. RIGHT = реактивная панель к selectedNodeId + rightMode
3. Vendor dirs read-only
4. Одна фаза = один PR; этап N.M не смешивать с N.M+1
5. Mock LLM в dev/CI
6. После этапа: обновить docs/STATUS.md

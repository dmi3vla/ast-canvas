# Infinity Canvas — Project Status

> Последнее обновление: 2026-07-09  
> Текущая фаза: **3 — Unified Data Model** ✅

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

## Следующая фаза: 4 — LLM Semantic Map

Ближайшие этапы:
- 4.1 — Context packer (`packages/semantic`)
- 4.2 — Mock LLM provider
- 4.3 — Semantic map generation pipeline
- 4.4 — Wire to App: open workspace → LLM → canvas

### Known residual (Phase 3):
- [ ] `canvas-core` types still independent from `schema` (dual types, not blocking)
- [ ] SessionStore not wired into App (deferred → Phase 4)

---

## Структура проекта (целевая)

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

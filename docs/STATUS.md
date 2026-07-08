# Infinity Canvas — Project Status

> Последнее обновление: 2026-07-09  
> Текущая фаза: **2 — Electron Scaffold + Split Shell** (2.1–2.3 ✅, 2.4 ⏳)

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

## Следующая фаза: 2 — Electron Scaffold + Split Shell 🔄

Ближайшие этапы:
- 2.1 — Repo skeleton (pnpm monorepo, electron-vite) ✅
- 2.2 — Main + preload (BrowserWindow, Open Folder, secure IPC) ✅
- 2.3 — AppShell split LEFT|RIGHT (критический UX-этап) ✅
- 2.4 — Port canvas → LEFT + indexer ⏳

### DoD Фазы 2 (2.1–2.3):
- [x] pnpm monorepo, 8 packages, все проходят `pnpm typecheck`
- [x] `pnpm dev` поднимает Electron окно с React renderer
- [x] Toolbar: Open Folder → workspace path + file count
- [x] Split LEFT|RIGHT с resizable splitter (drag, persist ratio)
- [x] LEFT: список mock-узлов (3 шт.), click → select/deselect
- [x] RIGHT: 4 режима (empty, content, codemap, source), переключение кнопками
- [x] Mock content: summary, meta, codemap deps/derives/locations, source viewer
- [x] Keyboard: Esc → clear selection → rightMode=empty
- [x] Splitter drag resize + persist leftRatio в config
- [x] CSP strict в index.html
- [x] contextIsolation preload с typed API

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

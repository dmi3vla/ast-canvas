# Infinity Canvas — AGENT PLAN (Electron Split UI)

> Источник-роадмап: `infinity_canvas_research.canvas`  
> Корректировка UX: **не drill-down вместо карты**, а **постоянный split**.

---

## 0. North Star (зафиксировать до кода)

### Продукт
Отдельное **Electron-приложение** (не VS Code extension).

### Главное окно (всегда)

```
┌─ App chrome (menu / toolbar / status) ─────────────────────┐
│  Open Folder · Regenerate Map · Fit · Settings             │
├────────────────────────────┬───────────────────────────────┤
│                            │                               │
│  LEFT  (~55–65%)           │  RIGHT  (~35–45%)             │
│  Infinity Canvas           │  Detail Pane                  │
│  ─────────────────         │  ─────────────────            │
│  Semantic map (LLM)        │  State A: EMPTY               │
│  pan / zoom / nodes/edges  │    placeholder + hints        │
│  selection highlight       │  State B: NODE CONTENT        │
│  NEVER unmounts on select  │    text / md / summary /      │
│                            │    file list of node          │
│                            │  State C: CODEMAP             │
│                            │    deps + derivatives +       │
│                            │    traces/locations           │
│                            │  State D: SOURCE              │
│                            │    monaco @ file:line         │
│                            │                               │
│◄──── resizable splitter ──►│                               │
└────────────────────────────┴───────────────────────────────┘
```

### Поведение
| Действие | LEFT | RIGHT |
|----------|------|-------|
| Open folder | loading → semantic canvas | empty |
| Map ready | nodes/edges | empty / «выберите узел» |
| Single-click node | select + glow | **NODE CONTENT** (summary, anchors) |
| Action «Codemap» / double-click | canvas stays | **CODEMAP** (deps in + derives out) |
| Click location / file in RIGHT | optional focus node | **SOURCE** (monaco) |
| Esc / clear | deselect | back to EMPTY or previous |

### Инварианты (анти-съезд)
1. LEFT = infinite canvas **всегда** (semantic map workspace).
2. RIGHT = **реактивная** панель к `selectedNodeId` + `rightMode`.
3. Vendor dirs **read-only**: `luisfernando.*`, `alex-c.*`, `source/`, `langgraph.codemap`.
4. Одна фаза = один PR; этап N.M не смешивать с N.M+1.
5. Mock LLM в dev/CI.
6. После этапа: `docs/STATUS.md`.

### Runtime flow
```
Open Folder
  → index workspace
  → cache? semantic .canvas : ContextPacker → LLM → validate → cache
  → LEFT: render semantic canvas
  → RIGHT: empty

Click node
  → selectedNodeId = id
  → RIGHT: node content (summary, files[], actions)

Open Codemap (btn / dblclick)
  → DepGraph.ego(files of node)
  → CodemapBuilder → RIGHT: codemap view
  → LEFT stays on semantic map (highlight selected)

Click location
  → RIGHT: source viewer @ path:line
```

### Global DoD (MVP)
- [ ] Electron app, одно главное окно, **split LEFT|RIGHT**
- [ ] Open folder → semantic map на LEFT (LLM/mock)
- [ ] Нет selection → RIGHT empty
- [ ] Click node → RIGHT = content узла
- [ ] Codemap mode → RIGHT = deps + derivatives + locations
- [ ] Jump to source в RIGHT (monaco RO)
- [ ] Splitter + persist ratio
- [ ] Cache semantic map, offline mock
- [ ] Tests + README

**Non-goals MVP:** VS Code extension, multiplayer, full code-canvas parity, webGL.

---

## Правила запуска агента

```
Контекст: AGENT_PLAN.md + infinity_canvas_research.canvas
Сейчас ТОЛЬКО этап {ID}.
Выполни «Промт» этапа. Vendor read-only.
DoD этапа = чеклист в этапе. Обнови docs/STATUS.md.
Не начинай следующий этап. Не меняй layout-инвариант (split).
```

Порядок: `1.1 → 1.2 → 1.3 → 1.4 → 2.1 → … → 10.4`  
Параллель **только** research `1.1 ‖ 1.2 ‖ 1.3`, затем `1.4`.

---

# ФАЗА 1 — Reverse Engineering (read-only)

## 1.1 Infinite Canvas architecture
**Артефакт:** `docs/research/01-infinite-canvas.md`

**Промт:**
```
Исследуй luisfernando.infinite-canvas-0.1.5.
Карта: activation, editor provider, webview messaging
(loadContent/save/loadFile), Obsidian nodes/edges,
AIManager/aiService.
Не меняй код. Markdown + data-flow диаграмма
Extension↔Webview↔.canvas. Отметь что портировать в Electron LEFT pane.
```

**DoD:** отчёт + список port targets для canvas-core.

---

## 1.2 Codemap schema
**Артефакт:** `docs/research/02-codemap-schema.md`, позже `packages/schema`

**Промт:**
```
Прочитай langgraph.codemap целиком.
JSON-shape: root, Trace, Location; required/optional.
Mapping: Trace → RIGHT panel list item;
Location → clickable row → source.
Zod sketch + минимальный example 2 traces.
Vendor не трогать.
```

**DoD:** схема полей + mapping table на RIGHT pane.

---

## 1.3 Code Canvas + source/
**Артефакт:** `docs/research/03-code-canvas-extract.md`

**Промт:**
```
Исследуй alex-c.code-canvas-app-0.14.8 и source/.
file/import graph, token refs, ignore rules, layout hints.
Capability checklist + module id refs в source/*.js.
Как deps UI мог бы жить в RIGHT pane (не full-window).
Без reimplementation.
```

**DoD:** checklist + extract notes для ast-graph.

---

## 1.4 Gap matrix & ADR
**Артефакт:** `docs/research/04-gap-matrix.md` + ADRs

**Промт:**
```
По 01–03: gap-matrix + ADR:
(1) Electron-only (уже решено)
(2) UI: split LEFT canvas | RIGHT detail — зафиксировать
(3) canvas renderer: canvas2d vs xyflow (рекомендация)
(4) LLM provider interface
(5) local AST engine (TS/JS first)
Max 2–3 pages. Risks.
```

**DoD:** ADR приняты; split layout в ADR явно.

---

# ФАЗА 2 — Electron scaffold + Split shell

## 2.1 Repo skeleton
**Промт:**
```
Создай monorepo (pnpm workspaces ok):
  apps/desktop/          # electron-vite + React + TS
  packages/canvas-core/  # infinite canvas (LEFT)
  packages/detail-pane/  # RIGHT: empty|content|codemap|source
  packages/schema/
  packages/semantic/
  packages/ast-graph/
  packages/ipc/
  packages/session/
  docs/research/
  fixtures/mini-project/
README: install, dev, build, typecheck, test.
Vendor не копировать.
```

**DoD:** `pnpm i && pnpm dev` поднимает пустое Electron окно.

---

## 2.2 Main process + preload
**Промт:**
```
Electron main: BrowserWindow, File→Open Folder,
lastWorkspace store, contextIsolation preload.
API: openWorkspace, listFiles, readFile, writeFile,
getConfig, setConfig. CSP strict.
Renderer: показать workspace path + file count.
```

**DoD:** open folder → path + count в UI.

---

## 2.3 AppShell: LEFT | RIGHT split
**Критический этап (корректировка UX).**

**Промт:**
```
Реализуй AppShell в apps/desktop:

layout:
  [Toolbar]
  [LeftPane | Splitter | RightPane]

LeftPane: placeholder "Infinity Canvas" (позже canvas-core).
RightPane modes:
  - empty: "Select a node on the canvas"
  - content: mock node title + body
  - codemap: mock list deps/derives
  - source: mock file text

State (zustand ok):
  ui: {
    leftRatio: number,        // default 0.6
    selectedNodeId: string|null,
    rightMode: 'empty'|'content'|'codemap'|'source',
    source?: { path, line }
  }

Splitter drag resize; persist leftRatio.
Keyboard: Esc → clear selection → rightMode=empty.

Mock: 3 fake nodes list; click → rightMode=content.
Buttons in RIGHT: "Show Codemap" / "Open Source".
LEFT does NOT navigate away.
```

**DoD:** split работает; mock selection заполняет RIGHT; LEFT стабилен.

---

## 2.4 Port canvas-core MVP (LEFT)
**Промт:**
```
Порт из luisfernando.../webview/src/InfiniteCanvasSimple.js
→ packages/canvas-core (TS):
CanvasState, nodes, edges, pan, zoom, drag,
dblclick text node, Shift-edge,
serialize/deserialize Obsidian .canvas.

Встроить в LeftPane.
Selection: click node → onSelect(nodeId) → shell.
Unit: serialize roundtrip (cremniy_canvas.canvas subset).
Без AI.
```

**DoD:** LEFT рисует .canvas; click → RIGHT content mock.

---

## 2.5 Workspace indexer
**Промт:**
```
packages/ast-graph WorkspaceIndexer:
walk + ignore (node_modules,.git,dist + config).
API index(root) → FileMeta[].
Smoke на дереве alex-c (count only).
```

**DoD:** index API + test/fixture.

---

# ФАЗА 3 — Data model

## 3.1 CanvasDocument schema
**Промт:**
```
packages/schema: Zod CanvasDocument Obsidian + extensions:
ICNode.semantic, ICNode.graph, ICEdge.kind.
migrateLegacy, parse/validate.
Tests: cremniy_canvas.canvas; roundtrip extensions.
```

## 3.2 Codemap schema
**Промт:**
```
packages/schema/codemap.ts из langgraph.codemap.
parse/validate; helpers for RIGHT list rendering.
Golden: load langgraph.codemap → traces.length.
```

## 3.3 DepGraph model
**Промт:**
```
dep-graph types + incoming/outgoing/egoNetwork/depth.
Fixture A→B→C. Pure tests.
```

## 3.4 Session state
**Промт:**
```
Session {
  workspaceRoot,
  semanticMap: CanvasDocument|null,
  codemaps: Map<nodeId, Codemap>,
  depGraph: DepGraph|null,
  cacheKey,
  ui: { selectedNodeId, rightMode, leftRatio, source? }
}
Cache dir .infinity-canvas/
IPC session:get / session:patch
Test save→reload.
```

**DoD фазы 3:** типы + тесты green; UI state включает rightMode.

---

# ФАЗА 4 — LLM Semantic Map → LEFT

## 4.1 ContextPacker
**Промт:**
```
packages/semantic/contextPacker.ts
FileMeta[] → ContextPack { tree, manifests, samples[] }
budget ~80k chars. Priority README, package.json, entries.
Test fixtures/mini-project.
```

## 4.2 LLM providers
**Промт:**
```
LLMProvider + MockProvider (deterministic canvas JSON)
+ OpenRouterProvider. Env key, timeout, no secret logs.
```

## 4.3 buildSemanticMap
**Промт:**
```
buildSemanticMap(pack, llm):
prompt → JSON → strip fences → Zod CanvasDocument
→ grid layout if no x,y → diagnostics.
Mock golden: valid canvas for LEFT loader.
Nodes = subsystems (codemap philosophy).
```

## 4.4 onWorkspaceOpen pipeline
**Промт:**
```
SemanticMapService: index → cache? → else LLM →
save .infinity-canvas/semantic-map.canvas →
LEFT loadContent. Progress + cancel.
RIGHT stays empty until selection.
```

## 4.5 Regenerate / patch
**Промт:**
```
semanticMap:regenerate + :patch (delta files).
Preserve stable ids when possible. Mock test.
```

**DoD фазы 4:** open folder → LEFT map; RIGHT empty.

---

# ФАЗА 5 — LEFT canvas UX + selection → RIGHT content

## 5.1 Semantic node chrome
**Промт:**
```
SemanticNodeView: title, kind badge, summary 2 lines,
counters, color by layer. Selected glow on LEFT.
```

## 5.2 Layout + edges
**Промт:**
```
hierarchicalLayout + fitView after map load.
Edge stroke by kind=semantic.
```

## 5.3 Selection → RIGHT content mode
**Промт:**
```
Click node on LEFT:
  selectedNodeId, rightMode='content'
Right ContentView:
  title, summary/markdown, files[] anchors,
  buttons: [Codemap] [Reveal files]
  if type=text: show node.text
  if type=file: preview file body (read via IPC)
Esc: clear → rightMode='empty'
LEFT never unmounts.
```

## 5.4 Toolbar / empty / errors
**Промт:**
```
Toolbar on shell. Status: workspace, node count, map age.
LLM fail → mock/cache + banner Retry.
RIGHT empty state copy + shortcuts hint.
```

**DoD фазы 5:** click node → RIGHT content; canvas слева на месте.

---

# ФАЗА 6 — AST / DepGraph (backend)

## 6.1 TS/JS adapter
**Промт:**
```
adapters/ts-js extract imports/exports.
ADR: tsc API vs acorn. Snapshot fixture.
```

## 6.2 buildDepGraph
**Промт:**
```
Resolve imports → DepGraph. getEgo(path, depth).
Externals optional. Test A→B→C.
```

## 6.3 Symbol-level spike (optional)
**Промт:**
```
Spike ≤2d; else backlog. File-level ship.
```

## 6.4 Watch + cache
**Промт:**
```
DepGraphService full + applyFileChange.
depGraph:updated event.
```

**DoD фазы 6:** egoNetwork API ready for RIGHT codemap.

---

# ФАЗА 7 — RIGHT Codemap + Source (не замена LEFT)

## 7.1 CodemapBuilder → RIGHT view
**Промт:**
```
fromSemanticNode(node, depGraph):
  center, incoming deps, outgoing derives.
RIGHT CodemapView (NOT full window):
  - mini graph OR two lists: Depends on | Used by
  - edge kinds import|derives
  - click item → select related / open source
Optional: small canvas inside RIGHT (xyflow lite),
LEFT semantic map untouched.
```

## 7.2 Codemap JSON (langgraph-compatible)
**Промт:**
```
toCodemap() → schema like langgraph.codemap.
≥1 trace, ≥2 locations.
Save .infinity-canvas/codemaps/{nodeId}.codemap
RIGHT: traces list + expand locations.
```

## 7.3 rightMode navigation (stack inside RIGHT)
**Промт:**
```
RIGHT internal stack (не app-level replace):
  empty ↔ content ↔ codemap ↔ source
Header in RIGHT: back button + title of mode.
Breadcrumb: Node / Codemap / file.ts:42
LEFT selection can stay highlighted.
```

## 7.4 Source in RIGHT (monaco)
**Промт:**
```
monaco read-only in RIGHT source mode.
openFile(path, line) from location or file node.
Back returns to codemap or content.
```

**DoD фазы 7:** full split UX path: map | content | codemap | source.

---

# ФАЗА 8 — LLM enrich codemap (optional depth)

## 8.1 enrichCodemap
**Промт:**
```
LLM traces; filter locations to allowed paths only.
Merge structural + enriched. Mock test.
```

## 8.2 Trace highlight
**Промт:**
```
Selecting trace in RIGHT pulses related nodes on LEFT
if anchors map to semantic nodes; else only RIGHT list.
traceGuide markdown sanitize.
```

## 8.3 Import/Export
**Промт:**
```
Export bundle (.canvas + .codemap).
Import langgraph.codemap → RIGHT overlay demo.
```

---

# ФАЗА 9 — Perf, privacy, polish

## 9.1 Perf budgets
Index 10k <3s; DepGraph 2k files <15s; LEFT 500 nodes pan 60fps; cull offscreen.

## 9.2 Privacy
Toggle send samples; redact secrets; local-only Ollama.

## 9.3 Polish
Minimap on LEFT; Ctrl+F search nodes; theme; welcome explaining split.

## 9.4 Resilience
Cache version; LLM repair once; logs `.infinity-canvas/logs/`.

---

# ФАЗА 10 — Ship

## 10.1 Tests
vitest + e2e: open fixture → LEFT map (mock) → click → RIGHT content → Codemap → locations > 0.

## 10.2 Package
electron-builder AppImage/dmg/nsis.

## 10.3 Docs
ARCHITECTURE (split diagram), USER_GUIDE, AGENT_RUNBOOK, RESEARCH links.

## 10.4 Demo
Open this `ast-canvas` repo as workspace; explore vendors without leaving app.

---

## Master prompt (вставка агенту на старт сессии)

```
Ты реализуешь Infinity Canvas — отдельное Electron-приложение.

LAYOUT (нерушимо):
- LEFT: Infinity Canvas (семантическая карта). Не размонтировать при выборе узла.
- RIGHT: Detail pane:
  empty | content выбранного узла | codemap (deps+derives) | source (monaco).
- Resizable splitter.

Источники research (READ-ONLY):
- luisfernando.infinite-canvas-0.1.5/
- langgraph.codemap
- alex-c.code-canvas-app-0.14.8/ + source/
- infinity_canvas_research.canvas , AGENT_PLAN.md

Сейчас выполняй ТОЛЬКО этап: {STAGE_ID}
Промт этапа — в AGENT_PLAN.md.
DoD этапа обязателен. Обнови docs/STATUS.md.
Mock LLM в dev. Не прыгай на следующие фазы.
```

---

## Suggested first commits

| Commit | Stage |
|--------|-------|
| `chore: monorepo skeleton` | 2.1 |
| `feat(shell): split LEFT canvas RIGHT detail` | 2.3 |
| `feat(canvas): port infinite canvas core` | 2.4 |
| `feat(schema): canvas + codemap + depgraph` | 3.x |
| `feat(semantic): map on open → LEFT` | 4.x |
| `feat(detail): node content on select` | 5.3 |
| `feat(ast): dep graph` | 6.x |
| `feat(detail): codemap + source modes` | 7.x |

---

## Status template (`docs/STATUS.md`)

```md
# Status
Phase: 2
Stage: 2.3
Done: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2
In progress: 2.3 AppShell split
Blocked: —
Notes: layout invariant = split, not drill-down replace
```

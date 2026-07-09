
## User

ревью по проекту и демо /docs/demo1.png /docs/demo2.png /docs/demo3.png /docs/demo4.png

## Tools

- Execute: ls -la /home/resu/Documents/dev/ast-canvas/docs/demo*.png /home/resu/Documents/dev/ast-canvas/docs/demo*.canvas 2>/dev/null; ls -la /home/resu/Documents/dev/ast-canvas/docs/ | head -30
 (List demo screenshots and related files)
- Read: /home/resu/Documents/dev/ast-canvas/docs/demo1.png
- Read: /home/resu/Documents/dev/ast-canvas/docs/demo2.png
- Read: /home/resu/Documents/dev/ast-canvas/docs/demo3.png
- Read: /home/resu/Documents/dev/ast-canvas/docs/demo4.png

## Assistant

# Ревью: проект + демо `docs/demo1–4.png`

## Вердикт

| | |
|--|--|
| **Demo map на LEFT** | ✅ `demo_project_map.canvas` живой: области 1–7, pipeline, рёбра |
| **Split UX** | ✅ LEFT always · RIGHT empty → content → codemap → source |
| **Content / Codemap** | ✅ title, summary, kind/type/id, fileAnchors, trace ids |
| **Source** | ❌ ENOENT — workspace не открыт / path не резолвится |
| **Toolbar product** | ⚠️ только Open Folder — нет path, count, Regenerate |
| **Phase 4 product loop** | ⚠️ demo ручной load, не «Open Folder → LLM/cache» |

**Итог:** визуальный прототип **карты проекта + RIGHT drill** — success.  
End-to-end «открыли папку → semantic map → source из anchors» — **ещё нет** (видно по demo4 + toolbar).

---

## Что на скринах

| # | Сценарий | LEFT | RIGHT | Оценка |
|---|----------|------|-------|--------|
| **demo1** | empty | полный demo graph (fitView) | «Select a node…» | ✅ empty state |
| **demo2** | Content · node **3 semantic** | 2a–2c, 5, 6, pipeline | summary + kind/type/id + 5 anchors | ✅ |
| **demo3** | Codemap · node **3** | то же | anchors [a–e] + TRACE IDS `3` | ✅ |
| **demo4** | Source · anchor | то же | `ENOENT` relative path | ❌ |

Сравнение с **1–3.png** (старые): там был **seed demo** (Architecture/IPC) и mock RIGHT.  
Сейчас — **наша demo map** с реальными package-узлами. P1 `loadData`/`initialData` **отработал**.

---

## Что работает (подтверждено UI)

1. **Canvas2D graph** — nodes, curved edges, selection glow, connection points  
2. **Semantic nodes** — area/location hierarchy (1→1a, 2→2a/b/c, 3→…)  
3. **RIGHT content** — не `Node: node_9`, а «3 · semantic (LLM)» + summary + meta  
4. **fileAnchors** — кликабельные пути semantic package (как proto1 cards)  
5. **Codemap tab** — anchors + `traceIds: ["3"]`  
6. **Pipeline card** — runtime steps на canvas (документация-in-graph)  
7. **Split** не ломается при переключении вкладок  

---

## Findings

### P1 — Source + workspace

**demo4:**  
`open 'packages/semantic/src/buildSemanticMap.ts'` → ENOENT  

Причины:
- Toolbar без `📁 workspace` → **Open Folder не делали** (или lastWorkspace не поднялся)
- `readFile` + sandbox требуют path **внутри** `lastWorkspacePath`
- relative path без join к root → open cwd, не monorepo

**Fix (агенту):**
1. Open Folder **до** source (или auto-load last + показать в toolbar)  
2. `readFile`: если relative → `join(workspaceRoot, path)` **в main**, не только в renderer  
3. Если `!workspaceRoot` — UI: «Сначала Open Folder» (не raw ENOENT)  
4. Toolbar всегда: path · files · nodes · Regenerate когда workspace есть  

### P2 — Demo load path vs product path

Карта на LEFT = `demo_project_map`, но product flow (Open Folder → buildSemanticMap → cache) **не виден** на demo1–4.

Нужно одно из:
- Load demo **как** `semantic-map.canvas` после Open Folder monorepo root  
- Кнопка **Load demo map**  
- Docs: «для demo4: Open Folder = repo root, потом click anchor»

### P2 — Content raw markdown

В RIGHT body остаётся `## 3 · semantic…` — strip `#` только на canvas labels.  
Strip/render markdown в Content panel.

### P2 — Toolbar chrome

Без workspace UX «половина продукта»: нет regenerate, cache badge, loading.

### P3

| Item | Note |
|------|------|
| Edge spaghetti | OK for demo density; Phase 5 layout polish |
| Codemap ≠ DepGraph | anchors only — Phase 5–6 real imports |
| Source not monaco | expected Phase 7 |
| File node research | file type on canvas — open/preview TBD |
| Viewport | demo1 fit ok; demo2–4 zoomed to lower cluster — fine |

---

## Проект vs North Star

| Инвариант | demo1–4 |
|-----------|---------|
| Electron app | ✅ |
| LEFT canvas always | ✅ |
| RIGHT empty\|content\|codemap\|source | ✅ modes |
| Semantic map nodes/edges | ✅ demo map |
| Click → node content | ✅ |
| Anchors → source | ⚠️ path broken without WS |
| Open project → LLM map | ⬜ not shown on these shots |
| Real AST deps | ⬜ Phase 5+ |

**Score prototype (visual):** **8/10**  
**Score product completeness:** **6.5/10** (source + toolbar + open-folder loop)

---

## Сводка: demo canvas

`docs/demo_project_map.canvas` на экране:

- Области **1–7** (desktop, canvas-core, semantic, schema, ast-graph, session, detail)  
- Drill **2a–2c**, **3** + anchors semantic/*  
- Pipeline card  
- Связи import/call/semantic  

Совпадает с задумкой proto1/proto2 (packages as cards + graph).

---

## Фиксы — приоритет (задачи агенту)

### F1 — Source path + workspace (P1)

```
1) main file:read: resolve relative to lastWorkspacePath; if !workspace return clear error
2) App: if no workspacePath and user clicks anchor → toast "Open Folder first"
3) Toolbar: show workspace path whenever lastWorkspace loaded
4) Manual smoke: Open Folder = /path/to/ast-canvas → Content → Codemap → Source shows real file
```

### F2 — Load demo as first-class

```
Menu/Toolbar "Load demo map" → read docs/demo_project_map.canvas
  OR copy to .infinity-canvas/semantic-map.canvas when Open Folder is monorepo root
Set mapNodeCount from loaded doc
```

### F3 — Content polish

```
Strip ## from RIGHT title/body; show semantic.summary as primary text
```

### F4 — Docs

```
docs/DEMO.md: steps for demo1–4 screenshots + Open Folder requirement for Source
```

---

## Рекомендуемый smoke (после F1)

```bash
pnpm dev
# Open Folder → /home/resu/Documents/dev/ast-canvas
# Expect toolbar: 📁 ast-canvas · N files · M nodes
# Click "3 · semantic" → Content OK
# Codemap → click buildSemanticMap.ts → Source shows real file
# Regenerate (mock/haiku) optional
```

---

## Одной строкой

Демо **доказало**: карта monorepo + split + content/codemap **живые**; **demo4** вскрыл дыру **Source без Open Folder / resolve path**. Дальше: F1 path+toolbar, затем Phase 5 DepGraph.
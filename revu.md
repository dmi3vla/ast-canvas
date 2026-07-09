
## User

план по фазе 7

## Tools

- Read: /home/resu/Documents/dev/ast-canvas/AGENT_PLAN.md (451-530)
- Read: /home/resu/Documents/dev/ast-canvas/docs/STATUS.md (109-158)
- Execute: # RIGHT/Source current state
wc -l /home/resu/Documents/dev/ast-canvas/apps/desktop/src/renderer/components/RightPane.tsx
grep -n "DepGraph\|Source\|codemap\|monaco\|rightMode\|trace" /home/resu/Documents/dev/ast-canvas/apps/desktop/src/renderer/components/RightPane.tsx | head -35
ls /home/resu/Documents/dev/ast-canvas/packages/session/src/ /home/resu/Documents/dev/ast-canvas/packages/semantic/src/ 2>/dev/null | head -30
 (Survey RIGHT pane and Phase 7-relevant code)

## Assistant

# План Phase 7 — RIGHT Codemap + Source

## Контекст (что уже есть)

| Есть | Нет / слабо |
|------|-------------|
| RIGHT: empty / content / codemap / source | stack + breadcrumb |
| Content: title, summary, anchors | markdown clean polish |
| Codemap: DepGraphSection (deps in/out) | structural `.codemap` per node |
| Source: IPC `readFile` + line highlight (plain pre) | **Monaco** RO |
| DepGraphService + ego + cache + watch | click dep → focus node on LEFT |
| schema `parseCodemap` / Codemap types | save `codemaps/{nodeId}.codemap` |
| Load Demo + workspace keep | depth toggle, status “cached/built” |

**Инварианты:** LEFT never unmount · RIGHT only · vendor RO · no ast-grep · no LLM enrich (Phase 8).

Phase 6 = backend graph. **Phase 7 = RIGHT product UX** вокруг graph + source.

---

## Цель Phase 7

Полный drill-path без смены окна:

```
LEFT map → select node
  → Content (summary + anchors)
  → Codemap (deps in/out + optional structural codemap)
  → Source (read-only file @ line)
  → Back stack
```

**Global DoD**
- [ ] RIGHT header: **Back** + breadcrumb `Node › Codemap › file:line`
- [ ] Codemap: deps-in / derives-out; click row → Source (or reveal)
- [ ] Optional: structural codemap file per node (langgraph-shaped)
- [ ] Source: reliable read, scroll-to-line, syntax-ish (Monaco **or** solid pre — see 7.4)
- [ ] Open Folder monorepo + Load Demo: full path works
- [ ] `pnpm typecheck` + tests; STATUS Phase 7 ✅  

---

## Порядок

```
7.0  residual polish (toolbar/status, friendly empty)   optional short
  ↓
7.1  RIGHT Codemap UX (deps lists polish + depth)
  ↓
7.2  Structural CodemapBuilder → .codemap save/load
  ↓
7.3  RIGHT navigation stack + breadcrumb
  ↓
7.4  Source viewer (Monaco RO preferred; fallback pre+)
  ↓
7.5  Click dep ↔ LEFT highlight (optional but high value)
  ↓
STATUS + smoke screenshots
```

---

## 7.0 — Residual polish (½ day, optional)

```
Этап 7.0 ONLY (можно слить с 7.1).

1) STATUS: Phase 6 header ✅ only (remove 🔄 duplicate section title)
2) Toolbar: Load Demo / Open Folder / path always clear when WS set
3) Codemap empty: «Open Folder for deps» vs «No anchors on node»
4) Content: strip ## from body (if not already)

DoD: no confusing empty/error copy. STATUS clean.
```

---

## 7.1 — Codemap RIGHT UX (deps)

**База:** `DepGraphSection` уже есть.

```
Этап 7.1 ONLY. apps/desktop RightPane + IPC.

1) Deps UI polish:
   - sections: 📦 Depends on (out) / 📤 Used by (in) — labels consistent
   - show kind badge (import/type/external)
   - external:* nodes muted style
   - empty states per section
2) Depth: optional toggle depth 1 | 2 (IPC getEgo depth param already exists)
3) Loading skeleton; error banner with Retry
4) Click edge target:
   - onOpenSource(path, line) for file nodes
   - ignore or label-only for external:*
5) Show graph meta: center id, nodeCount, edgeCount (small footer)

DoD: Codemap on node with anchors shows real deps when WS open;
     external modules visible but not broken open.
pnpm typecheck. STATUS 7.1
Не monaco, не LLM.
```

---

## 7.2 — Structural Codemap (langgraph-shaped)

```
Этап 7.2 ONLY.

packages/ast-graph or packages/semantic:
  CodemapBuilder.fromSemanticNode(node, depGraph, workspaceRoot):
    Codemap {
      title: node title
      traces: [
        { id: "1", title: "Dependencies", locations: deps-out as path:line },
        { id: "2", title: "Dependents", locations: deps-in },
        optional "3" from node.semantic.fileAnchors
      ]
      locations use id 1a,1b / 2a...
    }

1) Use schema parseCodemap / types
2) Save: .infinity-canvas/codemaps/{safeNodeId}.codemap
3) Load if exists and fresh enough (optional mtime)
4) RIGHT Codemap tab: section «Traces» from structural codemap
   - expand locations → onOpenSource
5) Tests: mini-project + synthetic node anchors → ≥1 trace ≥2 locations

DoD: file written on first Codemap open; second open loads; parseCodemap OK.
STATUS 7.2
```

---

## 7.3 — RIGHT navigation stack

```
Этап 7.3 ONLY. App.tsx + RightPane.

State:
  rightStack: Array<{ mode, source?, title? }>
  or derive from history

UX:
1) Header left: ← Back (pop stack)
2) Breadcrumb: NodeTitle / Codemap / basename:line
3) Transitions:
   content → codemap (push)
   codemap → source (push)
   Source button from content (push)
   Esc: if stack depth>0 pop else clear selection (document choice)
4) LEFT selection stays while navigating RIGHT modes

DoD: can go Content→Codemap→Source→Back→Back without losing node selection.
STATUS 7.3
```

---

## 7.4 — Source viewer

**Рекомендация:**  
- **7.4a MVP:** improve current pre (line numbers, scrollIntoView, copy path) — low risk  
- **7.4b:** Monaco RO if 7.4a ok and time allows  

```
Этап 7.4 ONLY.

7.4a (required):
1) SourcePreview:
   - scroll to line on load (ref + scrollIntoView)
   - sticky header: path + line + Copy path
   - max height scroll container
   - loading / needsWorkspace / not found states
2) Prefer path relative display, abs for readFile
3) Line highlight class already exists — ensure visible

7.4b (optional):
- @monaco-editor/react readOnly
- setPosition / revealLine
- theme match dark app
- lazy load monaco (bundle size note in STATUS)

DoD: open anchor → see correct file, line ~visible, Back works.
STATUS 7.4
```

---

## 7.5 — Bidirectional soft link (optional)

```
Этап 7.5 OPTIONAL.

1) Click dep file in RIGHT:
   - if a semantic node on LEFT has fileAnchors containing that path → select that node
   - else open Source only
2) IPC or canvasRef API: selectNodeById / findNodeByAnchor
3) Pulse highlight optional

DoD: from Codemap deps click related package node if present on map.
Skip if >1 day.
```

---

## Что **не** делать в Phase 7

| Нет | Почему |
|-----|--------|
| LLM enrich traces | Phase 8 |
| full xyflow in RIGHT | optional later |
| ast-grep | ADR |
| rewrite DepGraphService | already Phase 6 |
| replace LEFT with codemap | layout invariant |
| multi-language parsers | later |

---

## Master prompt

```
Проект: /home/resu/Documents/dev/ast-canvas
Phase 6 accepted: DepGraphService, ego, cache, watch, Load Demo keeps WS.
RIGHT already has Content / DepGraphSection / basic SourcePreview.

Сейчас ТОЛЬКО этап 7.1 (Codemap UX polish).
Layout: LEFT always | RIGHT modes only.
No monaco yet (7.4). No LLM (Phase 8). No vite rabbit hole.
pnpm typecheck. Update docs/STATUS.md.
5 lines done/next/blocked at end.
```

---

## Коммиты

```
feat(7.1): codemap deps UX depth + external labels
feat(7.2): structural CodemapBuilder + save codemaps/
feat(7.3): RIGHT nav stack + breadcrumb
feat(7.4): source scroll-to-line (+ optional monaco)
feat(7.5): click dep selects LEFT node if matched
```

---

## Smoke (после Phase 7)

```bash
pnpm dev
# Open Folder → ast-canvas root
# Load Demo (WS stays)
# Click "3 · semantic"
#   Content → summary + anchors
#   Codemap → deps in/out (real) + traces if 7.2
#   click file → Source @ line, scroll works
#   Back → Codemap → Back → Content
# Esc / clear selection → RIGHT empty
```

---

## Связь с AGENT_PLAN

| AGENT_PLAN | У нас |
|------------|--------|
| 7.1 ego RIGHT | ~5.3+6.3 done → **7.1 polish** |
| 7.2 .codemap file | **7.2** |
| 7.3 stack | **7.3** |
| 7.4 monaco | **7.4** (a required, b optional) |

---

## После Phase 7 → 8

LLM enrich traces / highlight path / export bundle — только когда Source+stack стабильны.

---

**Старт агента: `7.1`** (Codemap UX).  
Monaco — не в первом прогоне.
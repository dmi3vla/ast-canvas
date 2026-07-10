# Agent Task — Initial Semantic Map (readable architecture canvas)

> **Priority:** high (core LEFT UX)  
> **Related:** enrich fix [`AGENT_TASK_ENRICH_FIX.md`](./AGENT_TASK_ENRICH_FIX.md) — fileAnchors overlap  
> **Do not** mix with packaging / 9.5 polish.

---

## Master context

```
Repo: infinity-canvas monorepo. LEFT = semantic canvas always.
Problem: Open Folder → buildSemanticMap produces a valid-but-meaningless map:
LLM invents coordinates + star edges; no DepGraph; weak context sampling;
codemap→canvas projector exists but is unused in production IPC.

Target pipeline:
  index + DepGraph
    → LLM: areas + summaries + file anchors only (no x/y, no free edges)
    → projector: nodes + edges from real imports between area anchors
    → deterministic layout + fitView
    → LEFT canvas

Evidence/diagnosis validated against code (buildSemanticMap.ts, prompts.ts,
contextPacker.ts, main workspace:buildSemanticMap).
```

---

## What’s wrong (confirmed)

| # | Issue | Where | Effect |
|---|--------|--------|--------|
| 1 | **Production = direct CanvasDocument prompt** | `buildSemanticMap.ts` `buildSystemPrompt` | LLM does architecture + links + layout at once → unstable |
| 2 | **Codemap path unused in app** | `prompts.ts` `SYSTEM_CODEMAP` + `projectCodemapToCanvas` | Only `test:live-llm` / smoke; main calls `buildSemanticMap(pack, llm)` only |
| 3 | **Prompt forces star topology** | «Every node connected to root» | Not real flow; not import graph |
| 4 | **Layout from model + weak fallback** | x/y in schema; `applyGridLayout` only fixes `(0,0)` | Collisions, chaos, bad initial viewport |
| 5 | **Context = big files after priority** | `contextPacker` pass 3 sort by size desc | Volume ≠ architecture signal |
| 6 | **No DepGraph at map time** | `main/index.ts` | Graph exists for RIGHT only; canvas ignores it |
| 7 | **Projector edges are sequential 1→2→3** | `projectCodemapToCanvas` | Even codemap path isn’t architecture edges |
| 8 | **Tests = node/edge count only** | `semanticMap.test.ts` | Misses anchors, edge quality, layout |
| 9 | **No reliable fileAnchors** | map nodes | Codemap/enrich become «No structural data» (see enrich task) |

---

## Target design

```
workspace index + import DepGraph
        ↓
LLM: 4–8 areas { title, summary, kind, fileAnchors[] }
     (Codemap traces OR slim AreaMap schema — prefer Codemap for reuse)
        ↓
validate anchors ⊆ workspace files (fuzzy path allowlist)
        ↓
edges between areas: count cross-imports between anchor sets via DepGraph
        ↓
deterministic layout (root top, areas by fan-in/out or hierarchical, optional key files as children)
        ↓
LEFT canvas + fitView
```

**LLM must not:** invent absolute coordinates, free-form edge lists, or paths outside pack/workspace.  
**Code must:** layout, edge derivation, anchor filter, sizes/colors by `semantic.kind`.

---

## Implementation steps

### Step 1 — Switch production to codemap → canvas

**Prompt:**
```
In apps/desktop main workspace:buildSemanticMap:
1. Keep contextPacker + applyPrivacyToPack + createProvider.
2. Replace buildSemanticMap(pack, llm) with:
   - buildCodemapUserPrompt + SYSTEM_CODEMAP (+ few-shot EXAMPLE_CODEMAP_MINI)
   - llm.complete → strip fences → safeParseCodemap (with same normalize as enrich: schemaVersion coerce)
   - projectCodemapToCanvas(codemap, { depGraph? })
3. On parse fail: one retry, then Mock/fallback map (existing behavior).
4. Cache still SessionStore semantic-map.canvas.
5. Tag prompt log tag: 'semantic-map'.
Do not delete buildSemanticMap yet — mark deprecated or reimplement it as thin wrapper over codemap path.
```

**DoD:** Open Folder uses codemap path; logs show tag semantic-map; nodes have `semantic.fileAnchors` from locations.

### Step 2 — Rewrite `projectCodemapToCanvas`

**Prompt:**
```
Rewrite packages/semantic/src/prompts.ts projectCodemapToCanvas(codemap, options?: { depGraph?: DepGraph }):

Nodes:
- Optional root overview node (codemap.title)
- One area node per trace: text from title+description, kind=area, fileAnchors=unique location paths (relative, normalized)
- Optionally collapse duplicate paths

Edges (priority order):
1. If depGraph provided: edge A→B if any import from anchors(A) to anchors(B); weight=count; skip self; top-N edges if dense
2. Else: soft sequential edges only as last resort (label kind=semantic weak) OR no edges + warning

Layout (deterministic, ignore any LLM x/y):
- Root at (0, -120)
- Areas in a row/grid by index or by topological order of derived edges
- Fixed width/height; SPACING constants
- No reliance on applyGridLayout(0,0) only

Export types; unit tests with mini-project fixture + real DepGraph edges (e.g. index→helpers).
```

### Step 3 — Feed DepGraph into map build (main)

**Prompt:**
```
In workspace:buildSemanticMap after indexWorkspace:
- depGraphService.getGraph(workspacePath) or buildDepGraph(files, { workspaceRoot })
- Pass graph into projector
- Do not block map forever: if graph build fails, map still works with anchors only + warning in diagnostics
```

### Step 4 — Smarter context pack (architecture signal)

**Prompt:**
```
Improve contextPacker sample selection after priority files:
- Prefer: package.json workspaces packages, src/**/index.*, main entry from package.json "main"/"exports", files with high fan-in/out if depGraph optional param passed
- Deprioritize pure size-desc sort for huge assets
- Keep budgetChars hard limit
- Unit tests: mini-project still packs index + helpers; monorepo-ish fixture picks package entrypoints not only largest files
Optional: ContextPackerOptions.preferPaths?: string[]
```

### Step 5 — LLM schema slim-down (prompt only)

**Prompt:**
```
Update SYSTEM_CODEMAP / buildSemanticMap system text:
- Explicit: paths MUST be from provided file list (relative)
- schemaVersion number 1 not "1.0"
- No coordinates
- 4–8 traces max
- Each trace ≥1 real location path from context
Add few-shot with relative paths only (not /absolute/)
```

### Step 6 — Tests & STATUS

```
- semanticMap / prompts tests:
  - projectCodemapToCanvas with fixture graph → edges reflect imports, not only sequential
  - all area nodes have fileAnchors.length ≥ 1 when locations present
  - layout: unique positions, no total overlap of centers
- main path covered indirectly via unit of projector + codemap parse normalize
- pnpm typecheck && pnpm test
- docs/STATUS.md: Phase map pipeline rework note
- Manual: Open Folder monorepo → readable areas with anchors → Codemap not "No structural data"
```

---

## Out of scope

- Enrich parse (separate task AGENT_TASK_ENRICH_FIX) — but **anchors from this task unblocks enrich**
- Minimap/cull polish
- Monaco, packaging

---

## Short copy-paste agent prompt

```
Rewrite initial semantic map pipeline for Infinity Canvas.

Diagnosis (confirmed in code):
- main uses buildSemanticMap() direct CanvasDocument prompt (LLM invents x/y + star edges to root)
- SYSTEM_CODEMAP + projectCodemapToCanvas exist but only smoke script uses them; projector edges are sequential 1→2→3
- contextPacker samples largest files; no DepGraph in map path
- tests only check node/edge counts

Implement:
1) workspace:buildSemanticMap → LLM codemap (SYSTEM_CODEMAP) → normalize parse → projectCodemapToCanvas(codemap, depGraph)
2) Projector: fileAnchors from locations; edges from DepGraph cross-imports between area anchor sets; deterministic layout (ignore LLM coords)
3) contextPacker: prefer architectural entrypoints over size-desc only
4) Unit tests for projector+anchors+edges; typecheck/test green; STATUS update

Do not do packaging or enrich-only work except shared parse normalize if needed.
Read: packages/semantic/src/buildSemanticMap.ts, prompts.ts, contextPacker.ts, apps/desktop/src/main/index.ts (buildSemanticMap IPC).
```

---

## Acceptance (human smoke)

1. `pnpm dev` → Open Folder monorepo (force regenerate).  
2. LEFT: 1 overview + several **area** nodes with readable titles.  
3. Edges look like real package deps (not only star or 1→2→3 chain).  
4. Click area → RIGHT codemap has **real paths** (not «No structural data»).  
5. Prompt log `*-in.json`: no request for canvas x/y; codemap schema.  
6. Second open uses cache; Regenerate still ok.

# Agent Plan — Phase 9: Perf / Polish / Minimap / Resilience

> Status after review (2026-07-10): **Phase 8 closed**.  
> Privacy 8.6 fixed: samples actually in enrich prompt; OFF=placeholder; ON=`redactSamples`; manifests always redacted.  
> Do **not** re-open 8.x unless regressions. One phase = this plan. Mock LLM stays default.

## Master context (paste at session start)

```
Repo: infinity-canvas / ast-canvas monorepo (Electron + electron-vite + React).
LEFT = infinite canvas (semantic map). RIGHT = content | codemap | source.
Packages: schema, canvas-core, semantic, ast-graph, session, detail-pane, apps/desktop.
Invariants: vendor/ read-only; Mock LLM without key; after each step update docs/STATUS.md;
do not commit chat.json / revu.md; pnpm typecheck + pnpm test green after each step.
Phase 8 is DONE (enrich, highlight, export/import folder, privacy env).
You implement ONLY the assigned Phase 9 step. Do not mix steps.
```

## Baseline DoD (every step)

- [ ] `pnpm typecheck` → 8/8
- [ ] `pnpm test` → all green (expect ≥118; +new tests for this step)
- [ ] `docs/STATUS.md` updated for this step only
- [ ] No secrets committed; no huge session dumps

---

## 9.1 — Privacy polish (map path + tests)  ← do first

**Why first:** Phase 8.6 only gates **enrich**. `buildSemanticMap` still packs and sends raw samples. Small, high-value, finishes privacy story.

**Prompt:**
```
Phase 9.1 only — Privacy on semantic map build + unit coverage.

Context:
- packages/semantic: redactSamples, isSendCodeSamplesEnabled already exist
- apps/desktop main: enrich path already strips/redacts samples + redacts manifests
- buildSemanticMap / contextPacker path for Open Folder / Regenerate Map still sends full samples

Tasks:
1. In main buildSemanticMap IPC path (same as enrich): if !isSendCodeSamplesEnabled(), replace pack.samples content with placeholder `[code sample redacted: path]`; else redactSamples(content). Always redactSamples on pack.manifests.
2. Optionally extract shared helper applyPrivacyToPack(pack): ContextPack in semantic package; use from main for both enrich + map.
3. Tests: unit tests for helper if extracted; existing redactSamples tests must stay green.
4. STATUS: 9.1 ✅; note residual UI toggle still later.

DoD:
- Map gen respects INFINITY_LLM_SEND_SAMPLES same as enrich
- typecheck + test green
- No UI toggle yet (env only)
```

---

## 9.2 — Perf budgets (index + dep-graph + cull)

**Prompt:**
```
Phase 9.2 only — Perf budgets and LEFT cull.

Targets (measure on this monorepo or fixtures; document numbers in STATUS or docs/perf-notes.md):
- indexWorkspace 10k files budget: aim <3s cold on SSD (or document actual)
- DepGraph rebuild 2k files: aim <15s
- LEFT: when canvas has many nodes, cull offscreen nodes in CanvasRenderer (skip draw if outside viewport+margin)
- Avoid full graph rebuild on every getEgo if cache warm (already DepGraphService — verify no regression)

Tasks:
1. Profile or microbench scripts under packages/ast-graph or packages/semantic (optional vitest bench or node script).
2. CanvasRenderer (canvas-core): cull offscreen nodes/edges before draw; unit-test cull helper pure function if extracted.
3. Do not add minimap yet (9.3).
4. STATUS 9.2 + any measured numbers.

DoD: cull exists; no FPS claim without code path; typecheck/test green.
```

---

## 9.3 — Minimap + search + welcome polish

**Prompt:**
```
Phase 9.3 only — LEFT minimap, Ctrl+F node search, welcome/empty polish.

Tasks:
1. Minimap: small overview of canvas bounds bottom-right on LEFT; click/drag to pan main view. Reuse canvas-core camera/viewport; keep Canvas2D (no WebGL).
2. Ctrl+F / Cmd+F: search semantic node text/ids; jump + select node; clear Esc.
3. Welcome when no workspace: short copy explaining Open Folder vs Load Demo; split LEFT|RIGHT.
4. Do not theme overhaul unless trivial CSS vars already present.
5. STATUS 9.3.

DoD: minimap navigable; search finds fixture/demo nodes; typecheck/test green (pure helpers tested).
```

---

## 9.4 — Resilience (cache version, LLM repair, logs)

**Prompt:**
```
Phase 9.4 only — Resilience.

Tasks:
1. Cache version field in .infinity-canvas artifacts (semantic-map, dep-graph, codemaps). Bump version → invalidate stale caches.
2. LLM path: on enrich/map parse failure already falls back mock — add single "repair" retry (re-ask LLM to fix JSON) only when provider is not mock; then fallback mock. Cap 1 repair.
3. Logs: write structured lines to workspace `.infinity-canvas/logs/app.log` (rotate or truncate >1MB). Log: map build, enrich, dep-graph rebuild, export, errors. No secrets in logs (redact API keys).
4. STATUS 9.4; Phase 9 DoD checklist.

DoD: versioned cache; repair once; logs path works; typecheck/test green.
```

---

## 9.5 (optional) — Import UX + residual polish

Only if 9.1–9.4 done and time left:

```
- Import .codemap → show traces in RIGHT (load imported file into selected node codemap view)
- UI checkbox "Send code samples" bound to session/settings (still default off)
- Click dep row → select LEFT node by fileAnchors match (Phase 7 residual)
```

---

## Order of execution

| Step | Agent focus | Depends |
|------|-------------|---------|
| 9.1 | Privacy map path | none |
| 9.2 | Perf + cull | none (parallel-safe after 9.1 preferred) |
| 9.3 | Minimap + search | 9.2 cull helps minimap |
| 9.4 | Cache version / repair / logs | any |
| 9.5 | Optional residuals | 9.1+ |

**Recommended agent sequence:** 9.1 → 9.2 → 9.3 → 9.4 → (9.5) → stop for human review before Phase 10 ship.

## Out of scope (Phase 10)

- electron-builder packaging
- full e2e Playwright
- ARCHITECTURE / USER_GUIDE docs mega-pass
- Monaco editor

## Smoke checklist for human after agent

1. Open Folder on monorepo root → map appears (Mock)
2. Select node → Codemap → ✨ Enrich (with SEND_SAMPLES=0) → no raw source in network if using real LLM
3. Export bundle → folder has manifest
4. Load Demo without folder still works
5. After 9.3: minimap + Ctrl+F

## Known residuals (do not re-fix as Phase 8)

- Monaco RO deferred
- Semantic map privacy was gap → **9.1**
- Import display incomplete → **9.5**
- Zip export not required (folder bundle is the design)

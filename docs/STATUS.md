# Infinity Canvas — Project Status

> Последнее обновление: 2026-07-10  
> Текущая фаза: **MVP research complete** (phases 1–10 core)  
> Residual: 9.5 UX · Playwright e2e · ARCHITECTURE/USER_GUIDE · icons/signing

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

## Фаза 6 — AST / DepGraph (backend deepen) ✅

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 6.0 | Demo + workspace unify (Load Demo keeps workspace) | ✅ |
| 6.1 | `depGraphBuilder.test.ts` — 8 tests on mini-project fixture | ✅ |
| 6.2 | `DepGraphService` — memory + disk cache (`.infinity-canvas/dep-graph.json`) | ✅ |
| 6.3 | IPC `workspace:depGraph` → `depGraphService.getEgo` (no full rebuild) | ✅ |
| 6.4 | `fs.watch` on workspace → `depGraphService.invalidate` | ✅ |
| 6.5 | Symbol-level spike — deferred to 7.x (optional) | ⏳ |

### DoD Фазы 6:
- [x] `pnpm typecheck` — 8/8 зелёные
- [x] `pnpm test` — 106 тестов
- [x] Load Demo НЕ сбрасывает workspace — Source + DepGraph работают
- [x] `DepGraphService`: getGraph, getEgo, invalidate (mem+disk)
- [x] Cache freshness: fingerprint (fileCount + max mtime) — stale cache → rebuild
- [x] `invalidate` чистит и memory, и disk
- [x] `fs.watch` recursive + debounce 300ms
- [x] `getEgo` пробует все anchors (не только первый)
- [x] RIGHT Codemap: реальные deps-in/derives-out из DepGraph
- [x] Fallback: static anchors когда нет workspace

### Known residual (Phase 6):
- [x] invalidate → disk delete + fingerprint freshness
- [x] fs.watch recursive + debounce 300ms
- [x] getEgo union all anchors (depth 1)
- [ ] fingerprint still needs indexWorkspace on cold path (acceptable)
- [ ] fixtures/mini-project may get `.infinity-canvas/` from tests — gitignore recommended
- [ ] 5.4 token refs still deferred
- [ ] Watch на Linux/macOS recursive работает; на некоторых FS — shallow fallback
- [ ] `.infinity-canvas/dep-graph.json` в fixtures — добавлен в `.gitignore`

---

## Фаза 7 — RIGHT Codemap + Source ✅

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 7.0 | Polish: empty states, labels, external node styling | ✅ |
| 7.1 | Codemap UX: depth toggle **wired to IPC**, Depends on/Used by, external muted | ✅ |
| 7.2 | `CodemapBuilder` + IPC `workspace:nodeCodemap` + RIGHT Traces UI + tests | ✅ |
| 7.3 | Nav stack **always push** + breadcrumb `Node › Codemap › file:line` + ← / Esc | ✅ |
| 7.4 | Source: scroll-to-line, Copy path, sticky header (Monaco deferred) | ✅ |
| 7.5 | Monaco editor — deferred | ⏳ |

### DoD Фазы 7:
- [x] `pnpm typecheck` — 8/8
- [x] `pnpm test` — **110** tests (schema 32, canvas-core 16, ast-graph 38, semantic 17, session 7)
- [x] Depth 1/2 passed to `getDepGraph(..., depth)` → `getEgo`
- [x] Structural codemap built + saved under `.infinity-canvas/codemaps/`
- [x] Content → Codemap → Source → Back works (navStack always pushes)
- [x] Breadcrumb under title
- [x] Source scroll + copy path

### Residual / next:
- [ ] Monaco RO (optional)
- [ ] Click dep → select LEFT node by anchor (7.5 optional)
- [x] 8.1–8.4 enrich + button + LEFT highlight + split cache
- [x] path normalize: highlight + neighborhood pack (abs/rel/basename)
- [x] **8.5** Export/Import folder bundle (not zip) + `.codemap` / langgraph
- [x] **8.6** Privacy `sendCodeSamples` + `redactSamples` (review-fixed: samples in enrich prompt; redact when ON)

## Фаза 8 — LLM Enrich Codemap ✅ (8.1–8.6)

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 8.1 | `enrichCodemap.ts` — Mock + LLM + allowedPaths | ✅ |
| 8.2 | IPC `enrich?: boolean` + pipeline | ✅ |
| 8.3 | RIGHT ✨ Enrich button | ✅ |
| 8.4 | Trace click → LEFT golden highlight | ✅ |
| 8.4b | path fuzzy match (highlight + neighborhood pack) | ✅ |
| 8.5 | Export/Import folder bundle + import .codemap / langgraph | ✅ |
| 8.6 | Privacy: `sendCodeSamples` + `redactSamples` + samples in enrich prompt | ✅ |

### DoD Фазы 8 (накопленный):
- [x] typecheck 8/8; tests green (canvas-core highlight + redactSamples units)
- [x] enrichCodemap + path allowlist (fuzzy)
- [x] IPC enrich + UI button + loading
- [x] LEFT highlight via fileAnchors (rel/abs/basename)
- [x] split cache structural / enriched
- [x] neighborhood pack uses **relative** paths (not abs-only)
- [x] Export bundle (folder, manifest.json) + Import .codemap / langgraph.codemap
- [x] Privacy default OFF (`INFINITY_LLM_SEND_SAMPLES` ≠ `1`): sample bodies → placeholder
- [x] Privacy ON: samples included in enrich prompt after `redactSamples()` (7 patterns)
- [x] Manifests always secret-redacted before enrich LLM call
- [x] `.env.example` documents `INFINITY_LLM_SEND_SAMPLES=0`
- [x] `isSendCodeSamplesEnabled()` + `redactSamples` exported from `@infinity-canvas/semantic`

### Residual deferred → Phase 9/10:
- [x] Privacy gate on semantic **map** path (`applyPrivacyToPack` shared with enrich)
- [ ] UI toggle for send samples (env-only today) → 9.5
- [ ] Import `.codemap` → auto-open traces in RIGHT → 9.5
- [ ] Ctrl+F node search + welcome copy (plan 9.3 extras, not done)
- [ ] Perf microbench numbers (plan 9.2 measure optional)

## Инварианты (не нарушать)

1. LEFT = infinite canvas ВСЕГДА (semantic map workspace)
2. RIGHT = реактивная панель к selectedNodeId + rightMode
3. Vendor dirs read-only
4. Одна фаза = один PR; этап N.M не смешивать с N.M+1
5. Mock LLM в dev/CI
6. После этапа: обновить docs/STATUS.md

---

## Фаза 9 — Perf / Polish / Minimap ✅ core (review-fixed)

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 9.1 | Privacy: `applyPrivacyToPack` → map + enrich | ✅ (+ unit tests) |
| 9.2 | Canvas cull: offscreen nodes/edges (CULL_MARGIN 200) | ✅ |
| 9.3 | Minimap LEFT (viewport rect + drag pan via main canvas size) | ✅ (viewport bug fixed) |
| 9.4 | Cache version (dep-graph v1) + LLM retry×1 + logs map/enrich/export | ✅ (logs expanded) |
| 9.5 | Optional: import UX, UI toggle samples, click-dep→LEFT, Ctrl+F | ⏳ |

### DoD Фазы 9 (накопленный):
- [x] `pnpm typecheck` — 8/8
- [x] `pnpm test` green (schema 32, canvas-core 18, ast-graph 38, semantic 28, session 7 ≈ **123**)
- [x] `applyPrivacyToPack(pack)` shared; map + enrich both call it
- [x] Canvas cull in `CanvasRenderer` (nodes + edges with either endpoint visible)
- [x] Minimap: bottom-right, pan, viewport uses **main** canvas `getCanvasSize()`
- [x] Cache `version: 1` in dep-graph disk cache (pre-existing)
- [x] LLM: `buildSemanticMap` retries once on parse fail (same prompt; not enrich re-ask)
- [x] Logs: `.infinity-canvas/logs/app.log` JSON lines; size from disk; map + enrich + export; sanitize secrets
- [ ] 9.5 UI toggle / import UX / click-dep / Ctrl+F

## Фаза 10 — Ship ✅ (MVP packaging + docs; not full production)

| Этап | Артефакт | Статус |
|------|----------|:------:|
| 10.1 | Unit test suite (vitest) — **not** Playwright e2e | ✅ (~123 tests) |
| 10.2 | electron-builder: AppImage/deb/dmg/nsis; `pack`/`dist:*` scripts; linux `--dir` verified | ✅ |
| 10.3 | README: features, LLM env, packaging cmds, phase table | ✅ |
| 10.4 | Demo: `docs/demo_project_map.canvas` (21 nodes, 34 edges) | ✅ (earlier phase) |

### DoD Фазы 10:
- [x] `pnpm typecheck` — 8/8
- [x] `pnpm test` — **123** (schema 32, canvas-core 18, ast-graph 38, semantic 28, session 7)
- [x] `electron-builder` in `apps/desktop/package.json` (linux/mac/win targets)
- [x] `pnpm build` (electron-vite) green; `electron-builder --dir --linux` produces `dist/linux-unpacked`
- [x] `executableName: infinity-canvas` (avoid `@infinity-canvasdesktop` binary name)
- [x] README: features, LLM, packaging (`cd apps/desktop && pnpm dist:linux`)
- [x] Demo canvas JSON present (21/34)
- [x] `.gitignore` covers `dist/`, `.env*`
- [ ] Playwright e2e (open fixture → map → codemap) — deferred
- [ ] ARCHITECTURE / USER_GUIDE / icons — deferred
- [ ] Signed releases / CI publish artifacts — deferred

## Проект Infinity Canvas — research MVP ✅

**Core phases 1–10 closed for research prototype.**  
Still open: **9.5** optional UX, real **e2e**, deeper docs, signed installers.

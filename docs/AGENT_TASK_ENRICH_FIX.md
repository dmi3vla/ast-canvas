# Agent Task — Fix LLM Enrich (parse + anchors + allowedPaths)

> **Priority:** high  
> **Scope:** only enrich path + related prompt/parse. Do **not** start Phase 9.5 / packaging.  
> **Evidence:** live prompt dumps under `.infinity-canvas/logs/prompts/` (2026-07-10).

---

## Master context (paste at session start)

```
Repo: /home/resu/Documents/dev/ast-canvas (Infinity Canvas monorepo, Electron).
LEFT = semantic canvas. RIGHT = content | codemap | source.
LLM: OpenAI-compatible via .env (localhost:20128), createProvider + prompt I/O logs.
Prompt logs: <workspace>/.infinity-canvas/logs/prompts/
  prompts.jsonl, <id>-in.json, <id>-out.txt, <id>-meta.json
  INFINITY_LLM_LOG_PROMPTS=1 (default on)

Problem: ✨ Enrich shows "success" but diagnostics.repaired=true and
metadata.generationSource = llm-enrich-mock — real LLM output is discarded.

You must fix enrich so live LLM responses are accepted when valid, and
structural codemap has real file anchors for semantic map nodes.
Update docs/STATUS.md after DoD. Mock stays default without key.
pnpm typecheck + pnpm test green.
```

---

## Evidence (from real logs — read these first)

| File | Role |
|------|------|
| `.infinity-canvas/logs/prompts/2026-07-10T10-00-08-733Z-0002-in.json` | enrich IN |
| `.infinity-canvas/logs/prompts/2026-07-10T10-00-08-733Z-0002-out.txt` | enrich OUT (~5k chars, good prose) |
| `.infinity-canvas/logs/app.log` | `enrich … repaired:true` |
| `.infinity-canvas/codemaps/*.enriched.codemap` | `generationSource: llm-enrich-mock` |

### Bug A — empty ALLOWED list in system prompt

System message ends with:

```
IMPORTANT: You may ONLY use locations with paths from this ALLOWED list:


Keep existing trace ids (1,2,3)...
```

**No paths listed.** Root cause likely empty `allowedPaths` when building enrich prompt for semantic nodes without anchors / bad neighborhood pack.

### Bug B — structural codemap is a placeholder

User payload includes:

```json
"title": "No structural data",
"description": "No dependencies or anchors for this node",
"locations": [{ "path": "schema", ... "Placeholder — open workspace with file anchors" }]
```

Node id like `schema` has **no fileAnchors** on semantic map → CodemapBuilder produces placeholder → enrich has nothing useful → LLM invents a full monorepo codemap.

### Bug C — LLM JSON rejected by Zod → silent mock fallback

OUT is valid-looking architecture JSON but:

1. Wrapped in ` ```json ` fences (strip exists but verify edge cases).
2. `"schemaVersion": "1.0"` (**string**) — schema likely expects **number `1`**.
3. New `id` / traces not matching structural ids — merge may drop useful data even if parse softens.
4. `safeParseCodemap` fails → `mockEnrich` + `repaired: true` + still `provider: openai-compatible` in logs (misleading).

### Bug D — diagnostics lie

`provider: openai-compatible` + `repaired: true` looks like LLM succeeded. Need clearer signal: `generationSource`, UI badge, and/or log parse error reason.

---

## Goals (DoD)

### 1. Anchors for semantic map nodes (feed structural codemap)

- When building/saving semantic map (or when opening codemap for a node), ensure nodes that represent packages/files get **`semantic.fileAnchors`** (paths under workspace).
- Prefer deriving anchors from node text / known package roots (`packages/schema`, `apps/desktop`, …) or from LLM response fields if already present.
- Minimum: for monorepo map, click node `schema` / `ast-graph` → structural codemap has **real paths**, not `"No structural data"`.

Files likely: `buildSemanticMap.ts`, `prompts.ts` / `projectCodemapToCanvas`, main IPC `workspace:nodeCodemap`, `CodemapBuilder.ts`.

### 2. `allowedPaths` never empty when enrich runs

- Build allowlist from: structural location paths ∪ node.fileAnchors ∪ neighborhood pack paths.
- If still empty after that → **do not call LLM**; return structural + clear diagnostic (`skipped: 'no-allowed-paths'`) instead of placeholder enrich.
- System prompt must list paths (bullet list), verified in unit test.

### 3. Robust parse of enrich LLM output

In `enrichCodemap.ts` (and shared helpers if useful):

- Strip markdown fences (including mid/trailing).
- Coerce `schemaVersion`: `"1"` / `"1.0"` → `1`.
- Optional: soft-repair missing required fields from **structural** (keep structural `id` / `stableId` / metadata).
- On parse fail: log **parse error + first 200 chars** via promptLog / console; set `diagnostics.parseError`.
- Prefer: if parse fails once, **one repair retry** (ask LLM: “fix JSON to schema…”) then mock — only if not overkill; minimum is better strip/coerce so current OUT accepts.

Use the saved OUT file as a fixture for a unit test:

```
packages/semantic/tests/fixtures/enrich-out-haiku-fenced.json.txt
# copy from 2026-07-10T10-00-08-733Z-0002-out.txt
```

Test: `parseEnrichResponse(raw)` → success after normalize (or enrichCodemap with fake LLM returning that string → `repaired: false`, `generationSource: 'llm-enrich'`).

### 4. Merge policy

- Keep structural trace ids when present.
- Merge in LLM `traceGuide`, improved titles/descriptions.
- Locations: prefer structural if LLM paths outside allowlist; don’t wipe structural locations to empty.

### 5. Observability

- Prompt log tag: `tag: 'enrich'` / `tag: 'semantic-map'` in `withPromptLogging` call sites (createProvider opts or complete wrappers in main).
- app.log enrich line: include `repaired`, `parseError?`, `allowedPathCount`.
- RIGHT UI (optional small): if repaired/mock, show “Enrich (fallback)” not pure ✨ success.

### 6. Tests + STATUS

- Unit tests for: fence strip, schemaVersion coerce, empty allowedPaths skip, fixture OUT parse.
- `pnpm typecheck` 8/8, `pnpm test` green.
- Update `docs/STATUS.md` residual: enrich live parse fixed; note still optional UI polish.

---

## Out of scope

- Phase 10 packaging, Monaco, Ctrl+F, Playwright e2e.
- Changing default privacy (`SEND_SAMPLES=0`).
- Rewriting whole semantic map prompt (only add anchors if needed).

---

## Suggested implementation order

1. **Reproduce offline:** load OUT fixture → `safeParseCodemap` → confirm fail reason (log Zod error).  
2. **Normalize + parse** helper + unit tests with real OUT.  
3. **allowedPaths** plumbing + empty skip.  
4. **fileAnchors** on map nodes / CodemapBuilder input.  
5. **Wire tags + diagnostics** in main enrich IPC.  
6. **Manual smoke:** Open Folder monorepo → node with anchors → Codemap → ✨ Enrich → check:
   - `*.enriched.codemap` → `generationSource: llm-enrich` (not mock)
   - `app.log` → `repaired: false`
   - `logs/prompts/*-out.txt` matches what was applied
   - guides are LLM text, not `*Auto-generated by Mock Enrich*`

---

## Acceptance checklist

- [ ] Real enrich OUT from logs parses after normalize (unit test)
- [ ] Empty ALLOWED list cannot happen when enrich is attempted; or enrich skipped with clear reason
- [ ] Semantic nodes used in UI have fileAnchors when map is LLM-built for this monorepo
- [ ] `repaired: false` on happy path with live Haiku
- [ ] Prompt dumps still work; secrets redacted
- [ ] typecheck + test green; STATUS updated

---

## Copy-paste agent prompt (short)

```
Fix Infinity Canvas LLM enrich. Evidence in .infinity-canvas/logs/prompts/ (2026-07-10 *0002* enrich):
1) system prompt ALLOWED list is EMPTY
2) structural input is placeholder "No structural data" / path "schema" (no fileAnchors)
3) LLM returns fenced JSON with schemaVersion "1.0" string → safeParseCodemap fails → silent mockEnrich (repaired:true, generationSource llm-enrich-mock) while app.log still says openai-compatible

Tasks:
- Normalize enrich LLM JSON (fences, schemaVersion coerce, keep structural ids) + unit test using real OUT fixture
- Ensure allowedPaths from anchors+locations; skip LLM if empty
- Populate semantic.fileAnchors on map nodes so CodemapBuilder is not placeholder
- Better diagnostics (parseError, tag enrich in prompt log)
- pnpm typecheck && pnpm test; update docs/STATUS.md

Do not do packaging/e2e/9.5. Read packages/semantic/src/enrichCodemap.ts and schema codemap Zod first.
```

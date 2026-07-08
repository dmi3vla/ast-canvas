

давай задачи для агента под тест-модель: 'kr/claude-haiku-4.5', API Base:   'http://localhost:20128/v1' apikey: 'sk-99e1d2510daa5159-d66de2-710a006b'

## Tools

- Execute: export PATH="/home/resu/.nvm/versions/node/v22.23.1/bin:$PATH"
ls -la /home/resu/Documents/dev/ast-canvas/packages/semantic/src/ 2>/dev/null
head -50 /home/resu/Documents/dev/ast-canvas/packages/semantic/src/llmProviders.ts 2>/dev/null
grep -n "createProvider\|baseUrl\|OPENROUTER\|buildSemanticMap\|config" /home/resu/Documents/dev/ast-canvas/packages/semantic/src/*.ts /home/resu/Documents/dev/ast-canvas/apps/desktop/src/main/*.ts 2>/dev/null | head -40
 (Inspect semantic LLM config for task accuracy)

## Assistant

# Задачи агента: тест-модель Haiku (localhost)

## Test target (не коммитить ключ в git)

| Param | Value |
|-------|--------|
| model | `kr/claude-haiku-4.5` |
| baseUrl | `http://localhost:20128/v1` |
| apiKey | `sk-99e1d2510daa5159-d66de2-710a006b` |

Секреты: только **env** / **userData config** / `.env.local` в `.gitignore`.  
В репо — пример `.env.example` **без** реального key.

**Сейчас:** `workspace:buildSemanticMap` жёстко зовёт **Mock** — для live-теста нужно снять этот hardcode.

---

## T0 — Smoke endpoint (5 мин, до кода)

```
Проверь что gateway жив (из shell, ключ в env):

export INFINITY_LLM_API_KEY='sk-99e1d2510daa5159-d66de2-710a006b'
export INFINITY_LLM_BASE_URL='http://localhost:20128/v1'
export INFINITY_LLM_MODEL='kr/claude-haiku-4.5'

curl -sS "$INFINITY_LLM_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $INFINITY_LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kr/claude-haiku-4.5",
    "messages": [{"role":"user","content":"Reply with exactly: pong"}],
    "max_tokens": 32
  }' | head -c 800

DoD: HTTP 200, content содержит pong (или аналог).
Если fail — не идти в T2; починить gateway/порт 20128.
```

---

## T1 — LLM config + OpenAI-compatible provider

```
Этап T1 ONLY. packages/semantic + desktop config.

1) Типы:
   LlmConfig {
     provider: 'mock' | 'openai-compatible'
     baseUrl?: string
     apiKey?: string
     model?: string
     timeoutMs?: number
   }

2) Env (приоритет):
   INFINITY_LLM_PROVIDER=openai-compatible|mock
   INFINITY_LLM_BASE_URL=http://localhost:20128/v1
   INFINITY_LLM_API_KEY=...
   INFINITY_LLM_MODEL=kr/claude-haiku-4.5
   (legacy: OPENROUTER_API_KEY как fallback apiKey)

3) OpenRouterProvider переименовать/обобщить → OpenAICompatibleProvider
   (или оставить alias): baseUrl + model + apiKey из options/env.
   POST {baseUrl}/chat/completions  (у вас уже так)
   model: options.model || env || default
   timeout: AbortSignal

4) createProvider(config?: Partial<LlmConfig>):
   - mock → MockLLMProvider
   - openai-compatible → OpenAICompatibleProvider
   - default: mock if no key, else openai-compatible

5) .env.example:
   INFINITY_LLM_PROVIDER=openai-compatible
   INFINITY_LLM_BASE_URL=http://localhost:20128/v1
   INFINITY_LLM_API_KEY=
   INFINITY_LLM_MODEL=kr/claude-haiku-4.5

6) .gitignore: .env .env.local
7) НЕ хардкодить sk-... в исходники.

DoD: unit test createProvider with fake config uses baseUrl/model;
     typecheck green; STATUS note T1.
```

---

## T2 — Wire main: buildSemanticMap uses config (не always mock)

```
Этап T2 ONLY. apps/desktop/src/main/index.ts

1) workspace:buildSemanticMap(workspacePath, options?: { force?: boolean; useMock?: boolean })
2) Provider:
   const cfg = await loadLlmConfig() // from env + config:get('llm')
   const llm = options?.useMock ? new MockLLMProvider() : createProvider(cfg)
3) Log (no secrets): provider name, model, baseUrl host only
4) On LLM fail: fallback Mock once + diagnostics.warning; OR surface error to UI
5) force=true: skip cache (regenerate)

DoD: with env set to localhost haiku, Open Folder / Regenerate
     calls real API (not mock) when provider=openai-compatible.
     Without key → mock. typecheck.
```

**Test env for agent shell:**
```bash
export INFINITY_LLM_PROVIDER=openai-compatible
export INFINITY_LLM_BASE_URL=http://localhost:20128/v1
export INFINITY_LLM_API_KEY='sk-99e1d2510daa5159-d66de2-710a006b'
export INFINITY_LLM_MODEL='kr/claude-haiku-4.5'
cd /home/resu/Documents/dev/ast-canvas && pnpm dev
# Open fixtures/mini-project, Regenerate
```

---

## T3 — Codemap-first prompt (few-shot) + optional canvas project

```
Этап T3 ONLY. packages/semantic prompts.

Цель первой генерации: формат langgraph.codemap
  область id "1","2" → узлы "1a","1b"...

1) packages/semantic/src/prompts.ts:
   - SYSTEM_CODEMAP (иерархия id, only JSON, rules)
   - EXAMPLE_CODEMAP_MINI (мини-пример 2 traces / 1a,1b,2a,2b)
   - buildCodemapUserPrompt(pack, projectName)

2) buildSemanticMap options:
   mode: 'canvas' | 'codemap'  (default: keep canvas for LEFT;
          add buildCodemap / mode codemap for test)

   Рекомендация для Haiku-теста:
   - mode='codemap' → parseCodemap from schema
   - then projectCodemapToCanvas(codemap) → CanvasDocument for LEFT
     (trace → semantic node id=trace.id; optional location nodes id=1a
      or fileAnchors only — MVP: area nodes + edges between related traces)

3) MVP projection:
   - one canvas node per trace (id "1","2")
   - text = title + description
   - semantic: { kind:'area', summary, traceIds:[id], fileAnchors: locations.map(path) }
   - edges: sequential 1→2→3 kind=semantic
   - grid layout

4) Tests:
   - mock still works for canvas mode
   - unit: projectCodemapToCanvas on EXAMPLE → nodes ids 1,2 present
   - optional live test skipped unless INFINITY_LLM_LIVE=1

DoD: prompts.ts exists; codemap mode parseCodemap validates;
     projection → parseCanvas OK. STATUS T3.
```

---

## T4 — Live integration test script (Haiku)

```
Этап T4 ONLY. Script + docs, не e2e Electron обязательно.

packages/semantic/scripts/live-haiku-smoke.ts (or tools/):

1) Read env INFINITY_*
2) indexWorkspace(fixtures/mini-project)
3) contextPacker
4) createProvider(openai-compatible, model kr/claude-haiku-4.5, base localhost:20128)
5) buildSemanticMap(..., mode codemap or canvas)
6) Write output to /tmp/infinity-haiku-map.json (and .canvas if projected)
7) Print: node count, edge count, first 3 titles, provider name
8) Exit 1 if parse fails

package.json script:
  "test:live-llm": "INFINITY_LLM_LIVE=1 tsx packages/semantic/scripts/live-haiku-smoke.ts"

Run only when gateway up.
DoD: script succeeds against real Haiku; document in STATUS.
Do NOT commit API key or /tmp artifacts.
```

---

## T5 — UI Settings (минимальный settings panel)

```
Этап T5 ONLY (optional after T2–T4).

Settings UI or config:set('llm', {...}):
  provider: mock | openai-compatible
  baseUrl, model, apiKey (password field)
  "Test connection" button → short complete("pong")
  Save to userData config/llm.json (not workspace git)

Wire createProvider from saved config in main.
DoD: can set localhost + haiku without export env every time.
```

---

## Порядок

```
T0 smoke curl
 → T1 config + provider
 → T2 main wire (drop forced mock)
 → T3 codemap few-shot prompts + projection
 → T4 live-haiku-smoke script
 → T5 settings UI (optional)
```

---

## Master prompt агенту

```
Проект: /home/resu/Documents/dev/ast-canvas

Тест-LLM (НЕ коммитить ключ в git):
  model:   kr/claude-haiku-4.5
  baseUrl: http://localhost:20128/v1
  apiKey:  из env INFINITY_LLM_API_KEY (user will export)
  provider: openai-compatible

Сейчас ТОЛЬКО этап: T1
(затем T2, T3, T4 по DoD)

Требования:
- OpenAI-compatible POST {baseUrl}/chat/completions
- createProvider(config) with baseUrl/model/apiKey
- workspace:buildSemanticMap must NOT always use Mock
- Codemap init prompt: areas "1","2" + nodes "1a","1b" + EXAMPLE few-shot
- Project codemap → canvas for LEFT
- .env.example without secrets; .gitignore .env*
- pnpm typecheck + unit tests green
- Live tests only if gateway responds

Update docs/STATUS.md. Append session notes.
```

---

## Env one-liner для пользователя

```bash
export INFINITY_LLM_PROVIDER=openai-compatible
export INFINITY_LLM_BASE_URL='http://localhost:20128/v1'
export INFINITY_LLM_API_KEY='sk-99e1d2510daa5159-d66de2-710a006b'
export INFINITY_LLM_MODEL='kr/claude-haiku-4.5'
```

После T1–T2: `pnpm dev` → Open `fixtures/mini-project` → Regenerate.  
После T4: `pnpm test:live-llm`.

---

## DoD «Haiku live OK»

- [ ] curl T0 green  
- [ ] Regenerate / smoke script: `parseCanvas` или `parseCodemap` OK  
- [ ] LEFT показывает ≥4 semantic/area nodes (не demo seed)  
- [ ] Ключ не в git history  
- [ ] Mock всё ещё default без env  

**Старт агента: T0 (curl) → T1.**
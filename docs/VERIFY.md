# Infinity Canvas — инструкция проверки (smoke)

> Цель: пройти **руками** MVP и сверить **два дерева** (план vs факт).  
> Не полагаться на чат агента — только этот чеклист + CI.

---

## 0. Перед стартом

```bash
cd /home/resu/Documents/dev/ast-canvas   # корень monorepo
pnpm install                            # если ещё не ставили
pnpm typecheck                          # ожидание: 8/8 Done
pnpm test                               # ~123 unit tests, 0 fail
```

| Проверка | Ожидание |
|----------|----------|
| typecheck | 8 пакетов зелёные |
| test | schema 32, canvas-core 18, ast-graph 38, semantic 28, session 7 |
| `docs/STATUS.md` | фазы 1–10 core ✅; 9.5 / e2e / full docs — residual |

Артефакты деревьев:

| Файл | Содержание |
|------|------------|
| `docs/plan_tree.canvas` | **только план** (`AGENT_PLAN.md`) |
| `docs/result_tree.canvas` | **только результат** (STATUS + review) |
| `docs/plan_vs_result.canvas` | **оба дерева** рядом (сравнение) |

В приложении: кнопка toolbar **Plan\|Result** → LEFT грузит `plan_vs_result`.

---

## 1. Запуск dev

```bash
pnpm dev
```

Открывается Electron. Если нет окна — смотреть stdout.

### 1.1 Два дерева (сравнение плана и факта)

1. Нажать **Plan|Result** (toolbar).
2. На LEFT:
   - **слева** дерево **PLAN** (фиолетовый корень) — что задумывалось;
   - **справа** дерево **RESULT** — что сдано;
   - цвета: 🟢 done · 🟡 partial · 🟠 gap · 🔴 missing.
3. Minimap (нижний правый угол): drag → pan; viewport-рамка должна масштабироваться с main canvas.
4. Клик по узлу → RIGHT content (summary).
5. Fit / pan / zoom — карта не должна «пропадать».

**Pass:** оба дерева видны, связи parent→child есть, RIGHT реагирует на select.

**Отдельно (файлы без app):** открыть `.canvas` в редакторе / сравнить JSON — структура идентична встроенной кнопке.

---

## 2. Demo monorepo-map (не plan/result)

1. **Demo** / **Reload Demo** → карта пакетов monorepo (`demo_project_map`, ~21 node).
2. Выбрать узел с `fileAnchors` (например apps/desktop).
3. RIGHT: content + action Codemap (если workspace не открыт — DepGraph/Source partial).

**Pass:** demo грузится; selection работает.

---

## 3. Open Folder (semantic map + AST)

1. **Open Folder** → выбрать **корень monorepo** `ast-canvas` (не `apps/desktop` alone, если хотите полные anchors).
2. Дождаться map (Mock без `.env`).
3. Toolbar: workspace path, fileCount, nodeCount, optional «from cache».
4. **Regenerate Map** → rebuild (не только cache).

**Pass:** LEFT ≥ нескольких semantic nodes; повторный open может `fromCache`.

### 3.1 RIGHT Codemap + depth

1. Select node с file anchors.
2. Codemap / traces.
3. Depth 1 ↔ 2 — запрос с depth доходит (deps меняются или хотя бы loading без error).
4. Depends on / Used by — списки (или empty если anchors не в графе).

**Pass:** нет crash; при mock/structure traces есть.

### 3.2 Enrich (privacy)

1. ✨ **Enrich** (нужен LLM env **или** mock path).
2. Default: `INFINITY_LLM_SEND_SAMPLES` ≠ `1` → samples не уходят сырыми.
3. После enrich: badge/cache enriched; traceGuide (mock добавляет guide).

**Pass:** enrich завершается; при ошибке LLM — fallback mock, app жив.

### 3.3 Trace → LEFT highlight

1. В Codemap клик по **trace**.
2. LEFT: золотая обводка связанных узлов (fuzzy path match).
3. Esc / select другого node → highlight сброс.

**Pass:** highlight виден на demo/map с matching anchors.

### 3.4 Source

1. Location / file → Source mode.
2. Scroll to line (если lineNumber есть).
3. Copy path.
4. ← / Esc → back stack.

**Pass:** файл читается **только** если Open Folder уже сделан; иначе понятный alert.

### 3.5 Export / Import

1. **Export** → папка bundle (`manifest.json`, canvas, codemaps…).
2. **Import** `.codemap` / JSON.
3. **langgraph** — только если в корне workspace есть `langgraph.codemap`.

**Pass:** export без error; import не роняет app (UX auto-show traces может быть partial — 9.5 residual).

### 3.6 Logs

После Open Folder + enrich/export:

```bash
ls -la .infinity-canvas/logs/app.log
tail -5 .infinity-canvas/logs/app.log   # JSON lines
```

**Pass:** файл появляется; нет raw `sk-...` / Bearer secrets в логе.

---

## 4. LLM local endpoint + canvas generation

```bash
# 1) config (repo root, gitignored)
cp .env.example .env
# defaults: BASE_URL=http://localhost:20128/v1  MODEL=kr/claude-haiku-4.5  KEY=local

# 2) curl smoke (models + chat + mini canvas JSON)
pnpm test:llm-curl
# или: ./scripts/llm-curl-smoke.sh

# 3) full pipeline: pack fixture → LLM → codemap → canvas
pnpm test:live-llm

# 4) app: restart after .env change
pnpm dev
# main log should show: [env] loaded: ... key=set
# Open Folder → map from real LLM (not Mock)
```

**Pass:** curl http=200; live smoke «Canvas: N nodes»; app toolbar не только Mock.

### Prompt debug logs (IN/OUT)

По умолчанию `INFINITY_LLM_LOG_PROMPTS=1`. После Open Folder / Regenerate / Enrich:

```bash
ls .infinity-canvas/logs/prompts/
# prompts.jsonl
# <id>-in.json   — system+user messages
# <id>-out.txt   — raw model response
# <id>-meta.json — model, duration, error

tail -f .infinity-canvas/logs/prompts/prompts.jsonl
# terminal main also prints: [llm-prompt IN …] / [llm-prompt OUT …]
```

Выключить: `INFINITY_LLM_LOG_PROMPTS=0`

## 4b. Privacy (env)

```bash
# safer default
# INFINITY_LLM_SEND_SAMPLES=0   # or unset

# optional full samples (still redacted secrets)
# INFINITY_LLM_SEND_SAMPLES=1
```

Перезапуск `pnpm dev` после смены env.

**Pass:** default OFF; unit tests `applyPrivacyToPack` зелёные.

---

## 5. Packaging smoke (Linux)

```bash
pnpm typecheck && pnpm test
pnpm build                              # electron-vite → apps/desktop/out
pnpm pack                               # electron-builder --dir
# или:
# pnpm --filter @infinity-canvas/desktop exec electron-builder --dir --linux

ls apps/desktop/dist/linux-unpacked/
# ожидание: infinity-canvas (executableName), resources/app.asar
```

Full installers (дольше, сеть):

```bash
pnpm dist:linux    # AppImage + deb
```

**Pass:** `linux-unpacked` собирается; бинарь **не** `@infinity-canvasdesktop`.

---

## 6. Что считать FAIL

| Симптом | Вероятная зона |
|---------|----------------|
| typecheck/test red | регрессия — не ship |
| Open Folder hang forever | main IPC / LLM hang (timeout) |
| Source ENOENT без workspace | regression path resolve |
| Enrich шлёт secrets при SAMPLES=0 | privacy regression |
| Minimap viewport «точка» | main canvas size bug |
| Plan\|Result пустой canvas | JSON load / parse |

---

## 7. Residual (не FAIL MVP, но не «100% plan»)

- [ ] 9.5: UI toggle send samples, import→RIGHT auto, click-dep→LEFT, Ctrl+F, welcome
- [ ] Monaco RO source
- [ ] Playwright e2e (plan 10.1)
- [ ] ARCHITECTURE / USER_GUIDE / icons / signed releases
- [ ] Perf microbench numbers (10k/2k budgets)

---

## 8. Быстрый one-pager (5 минут)

1. `pnpm typecheck && pnpm test`  
2. `pnpm dev` → **Plan|Result** → оба дерева  
3. **Demo** → monorepo map  
4. **Open Folder** monorepo → select → Codemap → Source  
5. Export bundle  
6. (opt) `pnpm pack` → `linux-unpacked`

Если 1–5 зелёные — **research MVP pass**.  
Если нужен «production ship» — закрыть residual §7.

---

## 9. Связанные файлы

- План: `AGENT_PLAN.md`
- Факт: `docs/STATUS.md`
- Деревья: `docs/plan_tree.canvas`, `docs/result_tree.canvas`, `docs/plan_vs_result.canvas`
- README: packaging + features
- Privacy: `.env.example` → `INFINITY_LLM_SEND_SAMPLES`

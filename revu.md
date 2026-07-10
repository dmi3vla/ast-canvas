
теперь по составлению первоночального канваса семантической карты что ни так?


• Посмотрю именно pipeline первоначальной semantic map: какие данные уходят в модель, как ответ превращается в nodes/edges и как назначаются
  координаты. После этого дам конкретный список того, что мешает получить карту уровня референса.

✔ You approved codex to always run commands that start with rg -n "projectCodemapToCanvas|buildCodemapUserPrompt|SYSTEM_CODEMAP|buildSema...

• Explored
  └ Read buildSemanticMap.ts, prompts.ts, contextPacker.ts, CanvasRenderer.ts, CanvasState.ts, demoCanvas.ts, planVsResultCanvas.ts
    Search projectCodemapToCanvas|buildCodemapUserPrompt|SYSTEM_CODEMAP|buildSemanticMap\( in apps
    Read CanvasRenderer.ts
    Read semanticMap.test.ts
    Read canvas.ts

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Сейчас первоначальная карта строится не как семантический граф, а как «LLM нарисовал JSON». Поэтому она может быть валидной, но выглядеть
  бессмысленно.

  Главные проблемы:

   Проблема                                           Где                                            Последствие
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Production использует старый прямой prompt         packages/semantic/src/buildSemanticMap.ts      Модель сама одновременно решает архитектуру,
   CanvasDocument                                                                                    связи и координаты — результат нестабилен.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Нормальный путь codemap → canvas уже есть, но      packages/semantic/src/prompts.ts               SYSTEM_CODEMAP и projectCodemapToCanvas()
   не используется приложением                                                                       используются только live-smoke скриптом, а не
                                                                                                     workspace:buildSemanticMap.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Связи навязаны как «все от root»                   buildSystemPrompt()                            Это не отражает реальный flow/import/call graph
                                                                                                     проекта; получается звезда, а не карта
                                                                                                     архитектуры.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Layout отдаётся модели                             x/y в prompt, applyGridLayout()                Fallback раскладывает только нулевые координаты.
                                                                                                     Коллизии, хаотичный порядок, пересечения и
                                                                                                     плохой initial viewport остаются. Layout должен
                                                                                                     быть детерминированным в коде.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Контекст выбирает большие файлы                    packages/semantic/src/contextPacker.ts         После entry-файлов берутся самые большие файлы,
                                                                                                     а не наиболее связанные модули. Модель видит
                                                                                                     объём, но теряет архитектурный сигнал.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Нет связи semantic map с реальным DepGraph         main/index.ts                                  AST dependency graph строится позже для RIGHT
                                                                                                     pane; initial canvas его не использует вовсе.
  ─────────────────────────────────────────────────  ─────────────────────────────────────────────  ──────────────────────────────────────────────────
   Тесты проверяют лишь «≥5 nodes, есть edges»        packages/semantic/tests/semanticMap.test.ts    Они не ловят бессмысленные связи, дубликаты,
                                                                                                     отсутствие anchors, плохую иерархию и коллизии.

  Правильная схема должна быть такой:

  workspace index + import graph
            ↓
  LLM: только смысловые области и их file anchors
            ↓
  детерминированный projector
  (root → areas → files/important modules)
            ↓
  layout engine + overlap check + fit view
            ↓
  LEFT initial canvas

  То есть LLM не должен выдавать координаты и произвольные edges. Его задача: «выдели 4–8 архитектурных областей, дай summary, назначь существующие
  файлы». Код затем:

  - валидирует anchors;
  - строит связи между областями по реальным import-зависимостям;
  - создаёт root и уровни;
  - раскладывает дерево/граф детерминированно;
  - добавляет node style по kind;
  - делает дочерние file nodes только для ключевых модулей.

  Самый важный фикс: перевести workspace:buildSemanticMap с buildSemanticMap() на путь SYSTEM_CODEMAP → parseCodemap → projectCodemapToCanvas(), а
  projector переписать с нынешних последовательных рёбер 1 → 2 → 3 на связи, вычисленные из DepGraph. Тогда initial canvas перестанет быть случайной
  презентацией от модели и станет читаемой картой проекта.

## Assistant

Сверю анализ с кодом pipeline semantic map и оформлю задачу агенту.

## Tools

- Read: /home/resu/Documents/dev/ast-canvas/packages/semantic/src/buildSemanticMap.ts
- Read: /home/resu/Documents/dev/ast-canvas/packages/semantic/src/prompts.ts (1-148)
- Search: buildSemanticMap|projectCodemapToCanvas|SYSTEM_CODEMAP|buildDepGraph
- Read: /home/resu/Documents/dev/ast-canvas/packages/semantic/src/contextPacker.ts (111-157)
- Edit: /home/resu/Documents/dev/ast-canvas/docs/AGENT_TASK_SEMANTIC_MAP.md

## Assistant

## Диагноз — **верный**

Проверил по коду: production действительно строит «LLM нарисовал JSON», а не карту архитектуры.

### Что не так (коротко)

| # | Проблема | Код |
|---|----------|-----|
| 1 | **Прямой CanvasDocument prompt** — модель сразу решает узлы, рёбра и `x/y` | `buildSemanticMap.ts` system: «Every node connected to root», grid coords |
| 2 | **Нормальный путь не в app** | `SYSTEM_CODEMAP` + `projectCodemapToCanvas` есть, main зовёт только `buildSemanticMap(pack, llm)` |
| 3 | **Даже projector слабый** | рёбра `1→2→3` sequential, не import graph |
| 4 | **Layout от модели** | `applyGridLayout` чинит только `(0,0)` |
| 5 | **Контекст = крупные файлы** | `contextPacker` pass 3: `sort by size desc` |
| 6 | **DepGraph не участвует** | граф только для RIGHT later |
| 7 | **Тесты слабые** | «≥5 nodes + edges» |
| 8 | **Нет fileAnchors** → Codemap/Enrich «No structural data» | связано с задачей enrich |

### Как должно быть

```
index + DepGraph
  → LLM: только области + summary + fileAnchors (без coords/edges)
  → projector: edges из real imports между anchor-sets
  → deterministic layout + fitView
  → LEFT
```

---

## Задача агенту

Полный план + copy-paste prompt:

**[`docs/AGENT_TASK_SEMANTIC_MAP.md`](docs/AGENT_TASK_SEMANTIC_MAP.md)**

Главный фикс:  
`workspace:buildSemanticMap` → **codemap LLM** → **`projectCodemapToCanvas(codemap, depGraph)`** (переписать edges/layout), а не текущий `buildSemanticMap` canvas prompt.

Параллельно/после: [`AGENT_TASK_ENRICH_FIX.md`](docs/AGENT_TASK_ENRICH_FIX.md) — anchors с map разблокируют enrich.

### Порядок работ для агента

1. Switch production → SYSTEM_CODEMAP path  
2. Rewrite projector (DepGraph edges + layout)  
3. Wire DepGraph in main  
4. Smarter contextPacker  
5. Tests + STATUS + smoke Open Folder
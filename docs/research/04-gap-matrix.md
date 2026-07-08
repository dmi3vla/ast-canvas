# 1.4 — Gap Matrix & ADR

> **Статус:** принято (read-only → architecture decisions)  
> **Источники:** `01-infinite-canvas.md`, `02-codemap-schema.md`, `03-code-canvas-extract.md`  
> **Цель:** свести 3 источника → target architecture, принять ключевые архитектурные решения

---

## Gap Matrix: Источники → Наша архитектура

| Capability | Infinite Canvas | Codemap (langgraph) | Code Canvas | **Наше (Infinity Canvas)** |
|------------|:---:|:---:|:---:|---|
| **Canvas pan/zoom** | ✅ Canvas2D | — | ✅ React Flow (xyflow) | **ADR-3** |
| **Nodes + Edges** | ✅ Obsidian format | — | ✅ React Flow nodes | ✅ Obsidian + extensions |
| **LLM semantic map** | partial (AI per node) | ✅ full schema | — | **core**: open workspace → LLM → canvas |
| **AST deps graph** | — | ✅ locations (by path) | ✅ ast-grep imports | **core**: packages/ast-graph |
| **Drill-down / detail** | — | ✅ traces → locations | ✅ token refs | **RIGHT pane**: content|codemap|source |
| **Split Layout** | — | — | — | **ADR-2**: LEFT canvas | RIGHT detail |
| **Platform** | VS Code ext | standalone JSON | VS Code ext | **ADR-1**: Electron |
| **File format** | `.canvas` (Obsidian) | `.codemap` (JSON) | `.canvas` (internal) | `.canvas` (Obsidian + extensions) |
| **Ignore rules** | — | — | ✅ config + .gitignore | ✅ WorkspaceIndexer |
| **File watch** | — | — | ✅ 500ms batch | ✅ chokidar в Electron |
| **Source viewer** | — | — | ✅ Monaco | ✅ Monaco в RIGHT |
| **Syntax highlight** | — | — | ✅ textmate/Monaco | ✅ Monaco |
| **Git diff** | — | — | ✅ `diff` lib | ❌ non-goal MVP |
| **Multiplayer** | — | — | ❌ | ❌ non-goal MVP |

---

## ADR-1: Electron vs VS Code Extension First

### Контекст
Исходные проекты — VS Code расширения. Нужно ли начинать как расширение или сразу standalone Electron?

### Решение: **Electron standalone (уже решено North Star)**

### Обоснование
1. **Полный контроль над UI** — split layout LEFT|RIGHT невозможен в рамках одного webview VS Code
2. **Независимость от VS Code API** — не нужны CustomTextEditorProvider, Language Providers
3. **Нативное IPC** — быстрее и надёжнее, чем postMessage через webview
4. **Кроссплатформенность** — Electron даёт Windows/Mac/Linux из коробки
5. **Code Canvas сам уходит в standalone** — см. readme: «⚠️ The Code Canvas VSCode extension will soon not be supported anymore»

### Риски
- Выше порог входа (установка отдельного приложения, а не расширения)
- Больше размер дистрибутива (~150MB vs ~5MB)

---

## ADR-2: Split Layout LEFT Canvas | RIGHT Detail

### Контекст
UX-инвариант из North Star: одно окно, split на две панели. Не drill-down вместо карты.

### Решение: **Фиксированный resizable split**

```
┌─ Toolbar ────────────────────────────────────────────┐
├──────────────────────┬────────────────────────────────┤
│  LEFT (~55-65%)      │  RIGHT (~35-45%)               │
│  Infinity Canvas     │  rightMode:                    │
│  ─────────────────   │  empty | content | codemap |   │
│  semantic map        │           source               │
│  pan/zoom/nodes      │                                │
│  NEVER unmounts      │  Реактивная панель              │
├──────────────────────┼────────────────────────────────┤
│◄── resizable split ─►│                                │
└──────────────────────┴────────────────────────────────┘
```

### Обоснование
1. **Контекст не теряется** — semantic map всегда видна
2. **Быстрая навигация** — click node → RIGHT обновляется, LEFT стабилен
3. **Ментальная модель** — карта + детали (как Finder/Explorer + preview)
4. **Persist ratio** — пользователь настраивает под себя

### Инварианты
- LEFT = infinite canvas **ВСЕГДА**
- RIGHT = реактивная панель к `selectedNodeId` + `rightMode`
- Esc → RIGHT empty (deselect)

### Риски
- На маленьких экранах (<1200px) может быть тесно
- Сложность синхронизации двух панелей

---

## ADR-3: Canvas Renderer — Canvas2D vs xyflow/React Flow

### Контекст
Infinite Canvas использует чистый Canvas2D. Code Canvas использует `@xyflow/react`. Что выбрать?

### Решение: **Canvas2D (портировать из Infinite Canvas) → позже рассмотреть xyflow**

### Обоснование
1. **Простота портирования** — InfiniteCanvasSimple уже работает на Canvas2D, ~1000 строк
2. **Нулевые зависимости** — не тянет React/xyflow/zustand в canvas-core пакет
3. **Производительность** — Canvas2D быстрее для тысяч узлов, чем DOM-узлы React Flow
4. **Контроль** — полный контроль над рендерингом, нет ограничений React Flow API
5. **Code Canvas уходит в WebGL** — xyflow-версия устаревает, WebGL v2 ещё не готов

### Когда пересмотреть:
- Если понадобится сложная интерактивность узлов (формы, кнопки внутри узлов)
- Если React Flow WebGL v2 станет стабильным
- Если понадобится вложенность групп (folders)

### Риски
- Нет готовых решений для вложенных групп
- Меньше готовых UI-компонентов для canvas

---

## ADR-4: LLM Provider Interface

### Контекст
Нужен единый интерфейс для вызова LLM (семантическая карта, генерация контента).

### Решение: **Абстрактный провайдер + mock для dev/CI**

```typescript
interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}
```

### Реализации:
| Провайдер | Статус | Приоритет |
|-----------|--------|-----------|
| `MockLLMProvider` | built-in, всегда доступен | **P0** — dev/CI |
| `OpenRouterProvider` | адаптация aiService.js | **P1** — MVP |
| `OllamaProvider` | локальный, бесплатный | **P2** — future |

### Обоснование
1. **Mock first** — разработка без API ключей и затрат
2. **OpenRouter** — единый API для всех моделей (Claude, GPT, Gemini) как в Infinite Canvas
3. **Ollama** — полностью локально, privacy-first

### Риски
- Зависимость от внешнего API (OpenRouter) для production
- Разные модели дают разное качество semantic map

---

## ADR-5: Local AST Engine (TS/JS First)

### Контекст
Нужно строить граф зависимостей локально, без отправки кода на сервер.

### Решение: **File-level imports first (regex/tsc/acorn); ast-grep napi — deferred до Фазы 6+**

> **Errata (2026-07-09):** изначально ADR предлагал сразу `@ast-grep/napi`.
> Это расширение scope (нативные бинарники, CI matrix) для MVP.
> Сужаем: file-level resolution сейчас, AST-grep — опционально позже.

### ADR-5a (MVP): File-level import resolution
- TS/JS: regex `import/export` + `require()` patterns
- Разрешение путей относительно файла (относительные, алиасы из tsconfig)
- Без AST-дерева: только имена файлов и импортируемые символы
- **Пакет:** `packages/ast-graph/` с `ImportResolver`, `DepGraph`, `WorkspaceIndexer`

### ADR-5b (Phase 6+): ast-grep napi (опционально)
1. **ast-grep доказал себя** — Code Canvas использует его для import graph
2. **Нативный парсинг** — tree-sitter на Rust, быстро
3. **Типизированный API** — TypeScript типы для AST узлов (из langgraph.codemap traces 5a-5g)
4. **Поддержка языков** — JS/TS из коробки, Python/C/Rust/Go/Java опционально

### Архитектура AST Engine (целевая):
```
packages/ast-graph/
├── index.ts          # public API
├── import-resolver.ts # file-level resolution (ADR-5a)
├── ast-parser.ts     # ast-grep wrapper (ADR-5b, deferred)
├── dep-graph.ts      # DepGraph построение (+ кэширование)
├── ignore.ts         # ignore rules (.gitignore + config)
└── types.ts          # DepNode, DepEdge, DepGraph
```

### Порядок языков:
1. **TypeScript/JavaScript** — MVP (file-level)
2. **Python** — Phase 2
3. **Rust, Go, Java** — Phase 3+

### Риски
- File-level regex не ловит re-export / динамические импорты (допустимо для MVP)
- ast-grep napi требует нативной компиляции под платформу (отложено)
- Не все языки имеют полную типизацию AST узлов (отложено)

---

## Сводка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|:---:|:---:|---|
| Electron размер дистрибутива | High | Medium | Принять как данность |
| Canvas2D не масштабируется на 10k+ узлов | Medium | Medium | Лимит узлов / виртуализация |
| LLM качество semantic map варьируется | Medium | High | Mock first, несколько провайдеров |
| ast-grep napi проблемы сборки | Medium | High | CI матрица платформ, fallback на regex |
| Split UI сложность синхронизации | Low | Medium | zustand единый store |
| Маленькие экраны (<1200px) | Low | Low | Минимальная ширина 1024px |

---

## Статус ADR

| ADR | Решение | Статус |
|-----|---------|--------|
| ADR-1: Platform | Electron standalone | ✅ Принято (North Star) |
| ADR-2: Layout | Split LEFT canvas \| RIGHT detail | ✅ Принято |
| ADR-3: Renderer | Canvas2D (порт из Infinite Canvas) | ✅ Принято |
| ADR-4: LLM Interface | Абстрактный провайдер + Mock | ✅ Принято |
| ADR-5: AST Engine | Tree-sitter через ast-grep napi | ✅ Принято |

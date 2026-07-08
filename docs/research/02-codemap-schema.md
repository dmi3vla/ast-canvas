# 1.2 — Codemap Schema (langgraph.codemap)

> **Статус:** read-only исследование  
> **Источник:** `langgraph.codemap`  
> **Цель:** формализовать схему для RIGHT pane (codemap mode)

---

## 1. Общая структура

`langgraph.codemap` — это JSON-документ, представляющий **семантическую карту кодовой базы**. Сгенерирован LLM (mode: SMART, generationSource: generationWithTraces).

Состоит из **корневого объекта** с метаданными и массива **traces** — семантических «нитей», каждая из которых описывает определённый аспект архитектуры с привязкой к конкретным локациям в коде.

---

## 2. JSON Schema

### Root Object
```typescript
interface Codemap {
  schemaVersion: number;          // 1
  id: string;                     // составной id: "___source___title___timestamp"
  stableId: string;               // UUID v4
  metadata: CodemapMetadata;
  title: string;                  // человекочитаемый заголовок
  description?: string;           // общее описание карты
  mermaidDiagram?: string;        // Mermaid JS диаграмма всей карты
  traces: Trace[];                // семантические трассы
}
```

### Metadata
```typescript
interface CodemapMetadata {
  cascadeId: string;              // UUID cascade
  generationSource: string;       // "generationWithTraces"
  generationTimestamp: string;    // ISO 8601: "2026-07-06T23:26:07+05:00"
  mode: string;                   // "SMART"
  originalPrompt: string;         // исходный промпт для генерации
}
```

### Trace (семантическая нить)
```typescript
interface Trace {
  id: string;                     // порядковый номер "1", "2", ...
  title: string;                  // название трассы
  description: string;            // краткое описание
  locations: Location[];          // привязанные локации в коде
  traceTextDiagram?: string;      // текстовая диаграмма (ASCII tree)
  traceGuide?: string;            // Markdown-гайд (Motivation + Details)
}
```

### Location (точка в коде)
```typescript
interface Location {
  id: string;                     // "1a", "1b", ... (traceId + letter)
  path: string;                   // абсолютный путь к файлу
  lineNumber: number;             // номер строки
  lineContent: string;            // содержимое строки
  title: string;                  // заголовок (роль этой локации)
  description: string;            // описание (что делает эта локация)
}
```

---

## 3. Required vs Optional поля

| Поле | Уровень | Required | Notes |
|------|---------|----------|-------|
| `schemaVersion` | root | ✅ | Всегда 1 |
| `id` | root | ✅ | Составной, включает timestamp |
| `stableId` | root | ✅ | UUID v4 для кэширования |
| `metadata` | root | ✅ | cascadeId, generationSource, etc. |
| `title` | root | ✅ | Заголовок карты |
| `description` | root | ❌ | Может отсутствовать |
| `mermaidDiagram` | root | ❌ | Mermaid диаграмма |
| `traces` | root | ✅ | Массив Trace (≥1) |
| `id` | trace | ✅ | Порядковый номер |
| `title` | trace | ✅ | Название трассы |
| `description` | trace | ✅ | Краткое описание |
| `locations` | trace | ✅ | Массив Location (≥1) |
| `traceTextDiagram` | trace | ❌ | ASCII-дерево |
| `traceGuide` | trace | ❌ | Markdown гайд |
| `id` | location | ✅ | Составной: traceId + буква |
| `path` | location | ✅ | Абсолютный путь |
| `lineNumber` | location | ✅ | Номер строки |
| `lineContent` | location | ✅ | Содержимое строки |
| `title` | location | ✅ | Роль в трассе |
| `description` | location | ✅ | Детали |

---

## 4. Mapping: Codemap → UI

### Codemap → Canvas (LEFT)
| Codemap | Canvas Node |
|---------|-------------|
| `Codemap.title` | Заголовок группы/карты |
| `Traces[]` | Узлы на canvas (один trace = один semantic-узел) |
| `Trace.title` | `text` узла |
| `Trace.description` | `node.semantic.summary` |
| `Trace.id` | `node.semantic.traceIds[0]` |
| Связи между traces (общие paths) | Edges `kind: 'semantic'` |

### Codemap → RIGHT Pane (Node Content)
| Codemap | RIGHT: NODE CONTENT |
|---------|---------------------|
| `Trace.title` | Заголовок панели |
| `Trace.description` | Основной текст |
| Количество `locations` | Бейдж «N локаций» |

### Codemap → RIGHT Pane (Codemap)
| Codemap | RIGHT: CODEMAP |
|---------|----------------|
| `Trace.traceTextDiagram` | Древовидная диаграмма (ASCII → структурированный вид) |
| `Trace.traceGuide` | Markdown-гайд (рендеринг) |
| `Trace.locations[]` | Список локаций с кликабельными строками |
| `mermaidDiagram` | Mermaid диаграмма всей карты |

### Codemap → RIGHT Pane (Source)
| Codemap | RIGHT: SOURCE |
|---------|---------------|
| `Location.path` | Путь к файлу для Monaco |
| `Location.lineNumber` | Номер строки для перехода |
| `Location.lineContent` | Контекст строки |

---

## 5. Edge Heuristics (связи между traces)

Связи между traces можно вывести эвристически:

1. **Общий path** — две локации из разных traces ссылаются на один файл
2. **Общий import/export** — через анализ lineContent (слова `import`, `export`, `require`)
3. **Последовательность** — Trace.id нумерация отражает логический порядок

---

## 6. Zod Schema (набросок для `packages/schema/`)

```typescript
import { z } from 'zod';

export const LocationSchema = z.object({
  id: z.string(),
  path: z.string(),
  lineNumber: z.number().int().positive(),
  lineContent: z.string(),
  title: z.string(),
  description: z.string(),
});

export const TraceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  locations: z.array(LocationSchema).min(1),
  traceTextDiagram: z.string().optional(),
  traceGuide: z.string().optional(),
});

export const CodemapMetadataSchema = z.object({
  cascadeId: z.string(),
  generationSource: z.string(),
  generationTimestamp: z.string(),
  mode: z.string(),
  originalPrompt: z.string(),
});

export const CodemapSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  stableId: z.string().uuid(),
  metadata: CodemapMetadataSchema,
  title: z.string(),
  description: z.string().optional(),
  mermaidDiagram: z.string().optional(),
  traces: z.array(TraceSchema).min(1),
});

export type Codemap = z.infer<typeof CodemapSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type Location = z.infer<typeof LocationSchema>;
```

---

## 7. Минимальный Example (2 traces)

```json
{
  "schemaVersion": 1,
  "id": "example___demo___20260709",
  "stableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "metadata": {
    "cascadeId": "x1y2z3-...",
    "generationSource": "generationWithTraces",
    "generationTimestamp": "2026-07-09T12:00:00+05:00",
    "mode": "SMART",
    "originalPrompt": "анализ структуры"
  },
  "title": "Архитектура парсинга",
  "traces": [
    {
      "id": "1",
      "title": "Парсинг исходного кода в AST",
      "description": "Входная точка: функция parse() принимает язык и строку кода, возвращает AST-дерево",
      "locations": [
        {
          "id": "1a",
          "path": "/src/parser.ts",
          "lineNumber": 42,
          "lineContent": "export function parse(lang: string, src: string): SgRoot {",
          "title": "Точка входа парсинга",
          "description": "Основная функция, преобразующая строку кода в AST"
        },
        {
          "id": "1b",
          "path": "/src/parser.ts",
          "lineNumber": 58,
          "lineContent": "  const tree = treeSitterParser.parse(src);",
          "title": "Вызов tree-sitter",
          "description": "Делегирование парсинга нативному tree-sitter парсеру"
        }
      ],
      "traceTextDiagram": "parse()\n├── выбор языка\n└── treeSitterParser.parse()",
      "traceGuide": "## Motivation\nПарсинг — первый шаг анализа кода..."
    },
    {
      "id": "2",
      "title": "Обход AST дерева",
      "description": "SgNode API: навигация по узлам, доступ к полям, поиск подузлов",
      "locations": [
        {
          "id": "2a",
          "path": "/src/node.ts",
          "lineNumber": 102,
          "lineContent": "  children(): SgNode[] {",
          "title": "Получение дочерних узлов",
          "description": "Возвращает всех прямых потомков AST узла"
        },
        {
          "id": "2b",
          "path": "/src/node.ts",
          "lineNumber": 115,
          "lineContent": "  field(name: string): SgNode | null {",
          "title": "Доступ к именованному полю",
          "description": "Получение дочернего узла по имени поля AST"
        }
      ]
    }
  ]
}
```

---

## 8. Выводы

1. **Схема стабильна** — 4 уровня вложенности, все поля строго типизированы
2. **Location → Source** — прямой mapping через path + lineNumber (кликабельный переход)
3. **Trace → Node** — одна трасса = один semantic-узел на canvas
4. **traceTextDiagram** даёт ASCII-дерево для отображения структуры в codemap view
5. **traceGuide** содержит полноценный Markdown для детального просмотра
6. **mermaidDiagram** на уровне карты даёт общую диаграмму — кандидат на отображение в RIGHT pane

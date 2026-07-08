# 1.3 — Code Canvas + source/ Extract

> **Статус:** read-only исследование  
> **Источники:** `alex-c.code-canvas-app-0.14.8/`, `source/`  
> **Цель:** извлечь паттерны AST/deps/layout для RIGHT pane

---

## 1. Технический стек Code Canvas

| Категория | Технологии |
|-----------|------------|
| Рендеринг графа | `@xyflow/react` v12 (React Flow) — DOM/SVG node graph (не WebGL; WebGL — будущий standalone v2) |
| State management | `zustand` v5 |
| UI framework | React 19 + `react-dom` 19 |
| AST парсинг | `@ast-grep/napi` v0.39 + tree-sitter lang packs |
| Доп. парсинг | `php-parser`, `@jscpd/core` (copy-paste detection) |
| UI компоненты | `@radix-ui/react-*`, `framer-motion`, `lucide-react`, `tailwindcss` v3 |
| Diff | `diff` v7 |
| Бандлер | Webpack 5 (два entry: extension + webview) |
| Другое | `react-markdown` + `remark-gfm`, `uuid`, `zod`, `hono`, `convex` |

---

## 2. Архитектура VS Code Extension

```
┌──────────────────────────────────────────────────────┐
│                  VS Code Extension Host               │
│  dist/extension.js (webpack bundle)                   │
│  ├─ TreeView: codeCanvasTree (sidebar)                │
│  ├─ Webview Panel: основное canvas-окно               │
│  ├─ Commands: openCanvas, openInCanvas, refreshTree,  │
│  │            showEditorTokenReferences, ...          │
│  ├─ File Watcher: отслеживание изменений (500ms batch)│
│  ├─ Git Integration: автообновление после коммитов    │
│  └─ Language Providers: symbols, references, defs     │
├──────────────────────────────────────────────────────┤
│                    Webview (React)                     │
│  ├─ React Flow canvas (основной граф)                 │
│  ├─ Floating action bar                               │
│  ├─ Token selection panel (T to toggle)               │
│  ├─ Sidebar (resizable)                               │
│  └─ Settings panels                                   │
└──────────────────────────────────────────────────────┘
```

---

## 3. Ключевые возможности (Capability Checklist)

| # | Возможность | Статус | Модули | Для нашего RIGHT pane |
|---|------------|--------|--------|----------------------|
| 1 | **File Graph** — файлы как узлы на canvas | ✅ | React Flow nodes | ✅ Отображать deps узла |
| 2 | **Import Dependencies** — рёбра импортов | ✅ | AST парсинг import/export | ✅ Codemap + DepGraph |
| 3 | **Token References** — references/defs/implementations | ✅ | VS Code Language Providers | ✅ Location → source |
| 4 | **Layout Algorithms** (hybrid, folders, DAG) | ✅ | Кастомные алгоритмы | ✅ DepGraph → layout |
| 5 | **Live File Watch** | ✅ | VS Code FileSystemWatcher | ✅ Electron watcher |
| 6 | **Git Diff** — подсветка изменений | ✅ | `diff` v7 lib | ❌ Non-goal MVP |
| 7 | **Folders** — группировка узлов | ✅ | React Flow groups | ❌ Non-goal MVP |
| 8 | **Syntax Highlighting** | ✅ | Monaco/textmate | ✅ Monaco в RIGHT |
| 9 | **Token Selection Panel** | ✅ | `T` hotkey, zustand store | ✅ В RIGHT codemap |
| 10 | **Multi-select** | ✅ | React Flow selection | ✅ Canvas selection |
| 11 | **Floating Action Bar** | ✅ | Draggable React toolbar | ❌ Свой toolbar |
| 12 | **Re-export/Barrel edges** | ✅ | AST анализ re-exports | ❌ Non-goal MVP |
| 13 | **Edge Styles** (gradients, arrows, backwards) | ✅ | React Flow edge types | ✅ Edges на canvas |
| 14 | **Ignore Patterns** (.gitignore, regex) | ✅ | VS Code config | ✅ WorkspaceIndexer |

---

## 4. Модули source/

### 4.1 source/*.js (36 файлов) — webpack runtime chunks

Это **webpack-разделённые чанки** (code splitting): React, CSS-лоадер, стили. Бизнес-логика canvas UI НЕ здесь.

### 4.2 source/deobfuscated.js — ОСНОВНОЙ webview бандл

`source/deobfuscated.js` — это **deobfuscated `dist/webview/main.js`** (~3.6 MB), содержащий **всю клиентскую логику** Code Canvas:

- **Продуктовые сущности:** `DependencyGraph`, `FolderDependencyGraph`, `GraphView`, `TOKEN_SELECTION`
- **UI графа зависимостей:** layout-алгоритмы, edge rendering, token selection panel
- **React-компоненты:** React Flow nodes/edges, floating action bar, settings panels

**Важно:** AST-парсинг (`@ast-grep/napi`) — **0 вхождений** в deobfuscated. Он находится в **`dist/extension.js`** (extension host, ~3.9 MB), а не в webview. Разделение:
- `dist/extension.js` → AST, import-resolve, file watching
- `source/deobfuscated.js` → UI графа, токены, layout, визуализация

### 4.3 Распределение source/*.js чанков по категориям:

### Распределение модулей по категориям:

| Категория | Кол-во | Модули | Релевантность |
|-----------|--------|--------|---------------|
| React core | 13 | 221, 247, 338, 434, 477, 493, 522, 540, 698, 848, 869, 888, 961, 982 | Инфраструктура |
| CSS инфраструктура | 8 | 72, 77, 113, 133, 159, 314, 601, 659, 825 | Не релевантно |
| CSS темы | 5 | 199, 280, 573, 677, 723 | Для стилизации |
| Утилиты | 4 | 229 (CSS-in-JS), 849 (deep merge), 917 (camelCase), 975 (path normalize) | Частично |
| State (zustand) | 2 | 162, 242 (useSyncExternalStoreWithSelector) | Ключевой для zustand |
| Безопасность | 1 | 56 (nonce) | Не релевантно |
| Таймеры | 1 | 606 (setTimeout shim) | Не релевантно |

---

## 5. AST-grep как движок зависимостей

Из `langgraph.codemap` и `package.json` видно, что Code Canvas использует `@ast-grep/napi` для:

### Построение Import Graph
```typescript
// Псевдокод на основе codemap traces
const jsTypes = require('@ast-grep/napi/lang/JavaScript');
const root = parse('JavaScript', fileContent);

// Найти все import statements
const imports = root.root().findAll({
  rule: { kind: 'import_statement' }
});

// Извлечь source (путь модуля)
imports.forEach(imp => {
  const source = imp.field('source').text(); // './utils/helpers'
  const specifiers = imp.findAll({ rule: { kind: 'import_specifier' } });
});
```

### Поиск Token References
```typescript
// Найти все использования символа
const refs = root.root().findAll({
  rule: {
    pattern: '$NAME',  // метапеременная
    kind: 'identifier'
  }
});
```

---

## 6. Как Deps UI должен жить в RIGHT Pane

### Текущее поведение Code Canvas (full-window):
- ВСЁ на одном canvas: файлы, папки, зависимости, токены
- При клике на файл — он открывается в editor group (другая панель)
- Token references показываются прямо на canvas (edges)

### Адаптация для Split UI (наш подход):
| Действие | Code Canvas (full) | Наш RIGHT Pane |
|----------|-------------------|----------------|
| Click node | Ничего / highlight | **NODE CONTENT**: summary, files, actions |
| Codemap | Нет аналога | **CODEMAP**: deps in + derives out + locations |
| Token refs | Edges на canvas | **CODEMAP**: список references/defs/implementations |
| Jump to source | Открыть в editor group | **SOURCE**: Monaco @ path:line |

### Deps UI в RIGHT:
```
┌─ RIGHT Pane (CODEPAM MODE) ──────────────────────┐
│  📦 Deps In (imports)                             │
│  ├─ src/utils/helpers.ts  →  formatDate()        │
│  ├─ src/types/index.ts    →  User, Config        │
│  └─ react                 →  useState, useEffect  │
│                                                    │
│  📤 Derives Out (used by)                         │
│  ├─ src/pages/Home.tsx    →  imports CurrentFile  │
│  └─ src/components/*      →  3 files              │
│                                                    │
│  📍 Locations (traces)                            │
│  ├─ [1a] src/parser.ts:42   parse() definition    │
│  ├─ [1b] src/parser.ts:58   tree-sitter call      │
│  └─ [2a] src/node.ts:102    children()            │
│                                                    │
│  📊 Mermaid Diagram                               │
│  ┌──────────────────────────┐                    │
│  │  graph TB               │                    │
│  │  A[Parser] --> B[AST]   │                    │
│  └──────────────────────────┘                    │
└──────────────────────────────────────────────────┘
```

---

## 7. Ignore Rules (для WorkspaceIndexer)

Из `package.json` Code Canvas:
```json
{
  "codeCanvas.ignoreFiles": [],        // имена файлов
  "codeCanvas.ignoreDirectories": [],   // имена директорий
  "codeCanvas.ignoreExtensions": [],    // расширения
  "codeCanvas.ignoreRegexPatterns": []  // regex паттерны
}
```

Дефолтные ignore (из .gitignore автоопределения):
- `node_modules`, `dist`, `build`, `.git`
- `package-lock.json`, `yarn.lock`
- Бинарные расширения: `.png`, `.jpg`, `.gif`, `.svg`, `.ico`, `.woff`, `.ttf`
- Minified: `*.min.js`, `*.min.css`

---

## 8. Layout Algorithm Hints

Из changelog v0.14.0:

1. **Hybrid**: уменьшает backward edges при циклических зависимостях через «net edge counting» между папками
2. **Folders**: контроль aspect ratio папок, вертикальное выравнивание, dependency sorting для leaf-папок
3. **Spacing gradients**: неравномерные отступы для логической группировки
4. **DAG-aware**: topologicalLayers для ациклических графов

---

## 9. Выводы и Extract Notes

### Что берём для нашего ast-graph:
1. **AST-grep как движок** — парсинг JS/TS через tree-sitter, поиск import/export
2. **Паттерн построения DepGraph**: parse → find imports → resolve paths → build graph
3. **Игнор-правила** из конфигурации Code Canvas

### Что HE берём:
1. React Flow / xyflow — у нас Canvas2D (или решение из п.1.4 ADR)
2. Webpack-чанки source/ — это runtime зависимости, не бизнес-логика
3. VS Code-specific: Language Providers, FileSystemWatcher API

### Ключевые module ID refs в source/*.js:
- **162.js** — `useSyncExternalStoreWithSelector` (ядро zustand) — если будем использовать zustand для state
- **869.js** — полный React 19 — если выбран React для UI
- **199.js** — CSS custom properties (темы) — для стилизации

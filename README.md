# Infinity Canvas

> **Electron Split App** — LEFT: semantic canvas | RIGHT: detail pane (empty|content|codemap|source)

## Quick Start

```bash
# Install dependencies
pnpm install

# Development (Electron + React dev server)
pnpm dev

# Build
pnpm build

# Type-check all packages
pnpm typecheck

# Run tests
pnpm test
```

## Project Structure

```
infinity-canvas/
├── apps/
│   └── desktop/           # Electron app (electron-vite + React + TS)
├── packages/
│   ├── canvas-core/       # Infinite canvas (LEFT pane)
│   ├── detail-pane/       # RIGHT pane: empty|content|codemap|source
│   ├── schema/            # Zod types + validators (.canvas + codemap)
│   ├── semantic/          # LLM context packer + codemap builder
│   ├── ast-graph/         # Workspace indexer + dep graph
│   ├── ipc/               # Electron IPC contracts
│   └── session/           # Session state + cache
├── fixtures/
│   └── mini-project/      # Test project for development
└── docs/
    ├── STATUS.md           # Project status
    └── research/           # Phase 1 research artifacts
```

## Architecture

```
┌─ Toolbar ────────────────────────────────────────────┐
├──────────────────────┬────────────────────────────────┤
│  LEFT (~55-65%)      │  RIGHT (~35-45%)               │
│  Infinity Canvas     │  rightMode:                    │
│  semantic map        │  empty | content | codemap |   │
│  pan/zoom/nodes      │           source               │
│  NEVER unmounts      │                                │
├──────────────────────┼────────────────────────────────┤
│◄── resizable split ─►│                                │
└──────────────────────┴────────────────────────────────┘
```

## Tech Stack

- **Platform:** Electron
- **Renderer:** React 19 + TypeScript
- **Canvas:** Canvas2D (ported from luisfernando.infinite-canvas)
- **Build:** electron-vite
- **Package manager:** pnpm (workspaces)

## Development Phases

| Phase | Status |
|-------|--------|
| 1 — Reverse Engineering | ✅ (accepted with errata) |
| 2 — Electron scaffold + Split shell | 🔄 In progress |
| 3 — Data model | ⏳ |
| 4 — LLM Semantic Map | ⏳ |
| 5 — AST Graph | ⏳ |
| 6 — Codemap integration | ⏳ |
| 7 — Source viewer (Monaco) | ⏳ |
| 8 — Session + cache | ⏳ |
| 9 — Polish + packaging | ⏳ |
| 10 — Release | ⏳ |

## License

MIT

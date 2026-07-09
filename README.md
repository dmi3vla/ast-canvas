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

- **Platform:** Electron 34
- **Renderer:** React 19 + TypeScript 5.7
- **Canvas:** Canvas2D (ported from luisfernando.infinite-canvas)
- **Build:** electron-vite + electron-builder
- **Package manager:** pnpm (workspaces)
- **Testing:** vitest (~123 unit tests; no Playwright e2e yet)

## Features

- **Semantic Map:** Open a folder → LLM generates a visual codebase map (Mock in dev/CI)
- **Split Layout:** LEFT = infinite canvas (always visible) | RIGHT = detail pane
- **Codemap:** Per-node dependency graph (deps-in / derives-out) + structural traces
- **LLM Enrich:** Optional AI-powered trace descriptions with privacy-safe defaults
- **Source Viewer:** Click-through to source files with line highlighting
- **Export/Import:** Bundle canvas + codemaps + manifest for research sharing
- **Privacy:** `redactSamples()` strips API keys/tokens; `INFINITY_LLM_SEND_SAMPLES=0` by default

## LLM Configuration

Copy `.env.example` to `.env`:

```bash
INFINITY_LLM_PROVIDER=openai-compatible  # or mock
INFINITY_LLM_BASE_URL=http://localhost:20128/v1
INFINITY_LLM_API_KEY=sk-...
INFINITY_LLM_MODEL=kr/claude-haiku-4.5
INFINITY_LLM_SEND_SAMPLES=0            # privacy: 0=safer, 1=full context
```

Without `.env`, Mock provider is used (no API needed).

## Packaging

```bash
# from monorepo root (or cd apps/desktop)
pnpm pack          # unpacked dir only (faster smoke)
pnpm dist:linux    # AppImage + deb
pnpm dist:mac      # dmg (mac host)
pnpm dist:win      # NSIS (win host / wine)
```

Requires network once for Electron binary download. Output: `apps/desktop/dist/`.

## Development Status

| Phase | Status |
|-------|:------:|
| 1 — Reverse Engineering | ✅ |
| 2 — Electron scaffold + Split shell | ✅ |
| 3 — Data model (Zod schemas) | ✅ |
| 4 — LLM Semantic Map (Mock + OpenAI-compatible) | ✅ |
| 5 — AST Graph (import resolver + DepGraph builder) | ✅ |
| 6 — DepGraph service (cache + watch) | ✅ |
| 7 — RIGHT Codemap + Source | ✅ |
| 8 — LLM Enrich + Export/Import + Privacy | ✅ |
| 9 — Perf (cull) + Minimap + Logs | ✅ |
| 10 — Ship (packaging config + README) | ✅ config / pack verified |

See [`docs/STATUS.md`](docs/STATUS.md) for detailed DoD per phase.

**Residual (optional):** 9.5 UX polish · true e2e · ARCHITECTURE / USER_GUIDE docs · app icons.

## License

MIT

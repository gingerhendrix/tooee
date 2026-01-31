# Tooee

Public npm org (`@tooee`) for terminal micro-apps built on OpenTUI.

## Repo Structure

Bun monorepo with workspaces:

```
packages/
  react/        # @tooee/react — shared components, hooks, theme
  commands/     # @tooee/commands — command system, hotkeys, palette
  view/         # @tooee/view — display markdown/code/text
  ask/          # @tooee/ask — gather input, output to stdout
  request/      # @tooee/request — input -> streaming response
apps/
  cli/          # @tooee/cli — CLI binary (tooee view/ask/request)
```

## Tech Stack

- **Runtime**: Bun
- **UI**: OpenTUI (`@opentui/core`, `@opentui/react`) — Zig native TUI renderer with React reconciler
- **Language**: TypeScript (strict, `noEmit`, `allowImportingTsExtensions`)
- **JSX**: `react-jsx` with `jsxImportSource: @opentui/react`

## Commands

```bash
bun install          # Install dependencies
bunx tsc -b          # Type check all packages
bun test             # Run tests
```

## Architecture

Each app package exports three things:
- **React component** — for library usage within a larger app
- **`launch()` function** — programmatic entry point with provider config
- **TypeScript interfaces** — content provider + interaction handler abstractions

Content/interaction abstraction separates _what_ from _how_: apps don't know where data comes from or what actions do. Consumers wire in providers.

## Key Patterns

- Vim-like navigation throughout (j/k, gg/G, /, n/N) via `@tooee/react` hooks
- Command system with hotkeys, sequences, leader keys via `@tooee/commands`
- Theme system via `ThemeProvider` in `@tooee/react`

## Documentation

Detailed docs in `docs/`:

| Doc | Content |
|-----|---------|
| [opentui-guide.md](docs/opentui-guide.md) | OpenTUI API reference — elements, hooks, types, tsconfig |

Read before making changes. The OpenTUI guide has actual type signatures and code examples for the TUI primitives.

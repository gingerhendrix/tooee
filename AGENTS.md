# Tooee

Terminal micro-apps built on OpenTUI, published under the `@tooee` npm org.

## Commands

```bash
bun install          # Install dependencies
bunx tsc -b          # Type check all packages
bun test             # Run tests
bun run lint         # Lint with oxlint
```

## Tech Stack

- **Runtime**: Bun
- **UI**: OpenTUI (`@opentui/core`, `@opentui/react`) — Zig native TUI renderer with React reconciler
- **Language**: TypeScript (strict, `noEmit`, `allowImportingTsExtensions`)
- **JSX**: `react-jsx` with `jsxImportSource: @opentui/react`

## Key Conventions

- Each app package (`view`, `ask`, `choose`) exports a React component, a `launch()` function, and TypeScript interfaces
- Actions use `ActionDefinition[]` from `@tooee/commands` — no per-app action types
- `useCommand()` registers commands; `useModalNavigationCommands()` provides vim-style navigation
- Config: three-tier resolution (global `~/.config/tooee/`, project `.tooee/`, overrides)
- Themes: OpenCode-compatible JSON with `ui`, `syntax`, `diff`, `markdown` color groups
- `@tooee/shell` is the composition layer — `TooeeProvider` wraps all providers, `launchCli()` creates renderers
- Hotkey format: `ctrl+x`, sequences `g g`, leader keys `<leader>n`
- **Raw `useKeyboard` policy**: app-level `useKeyboard` handlers MUST guard with `useHasOverlay()` (from `@tooee/overlays`) or be ported to `useCommand`. Raw handlers subscribe before the command dispatcher (child effects run first), so modal command surfaces cannot suspend them and `key.preventDefault()` does not protect them — an unguarded handler double-handles keys while an overlay is open. See the `@tooee/commands` README.
- **Store conventions**: stateful interaction systems use `@xstate/store` event stores with thin React adapters — see [docs/store-conventions.md](docs/store-conventions.md) for when to use a store vs `useState` vs an effect, file layout, testing, and selector discipline.

## Documentation

- [docs/testing.md](docs/testing.md) — Testing guide (component tests with testRender, e2e tests with tuistory)
- [docs/store-conventions.md](docs/store-conventions.md) — Store conventions (`@xstate/store` usage, selectors, testing pattern)

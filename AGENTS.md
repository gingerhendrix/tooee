# Tooee

Terminal micro-apps built on OpenTUI, published under the `@tooee` npm org.

## Repo Structure

Bun monorepo with workspaces:

```
packages/
  config/       # @tooee/config — layered config loading and React context
  commands/     # @tooee/commands — modal command system with hotkeys and sequences
  react/        # @tooee/react — components, hooks, theme system, clipboard
  shell/        # @tooee/shell — composition layer: providers, standard commands, modal navigation
  view/         # @tooee/view — display markdown/code/text
  ask/          # @tooee/ask — gather input, output to stdout
  request/      # @tooee/request — input → streaming response
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

### Package Dependency Graph

```
@tooee/config          (no @tooee deps)
@tooee/commands        (no @tooee deps)
@tooee/react           → config
@tooee/shell           → config, react, commands
@tooee/view            → react, commands, shell
@tooee/ask             → react, commands, shell
@tooee/request         → react, commands, shell
@tooee/cli             → view, ask, request
```

### App Pattern

Each app package (`view`, `ask`, `request`) exports:

- **React component** (`View`, `Ask`, `Request`) — pure UI, receives providers as props
- **`launch()` function** — creates an OpenTUI renderer, wraps with `TooeeProvider`, renders the component
- **TypeScript interfaces** — content provider and interaction handler abstractions

Content/interaction abstraction separates _what_ from _how_: apps don't know where data comes from or what actions do. Consumers wire in providers.

### Config System

`@tooee/config` loads JSON config with three-tier resolution:

1. **Global**: `~/.config/tooee/config.json`
2. **Project**: `.tooee/config.json`
3. **Overrides**: passed programmatically

Config shape (`TooeeConfig`):

```typescript
{
  theme?: { name?: string; mode?: "dark" | "light" }
  keys?: Record<string, string>   // command ID → hotkey override
  view?: { wrap?: boolean; gutter?: boolean }
  request?: { autoScroll?: boolean }
}
```

Accessed via `ConfigProvider` and hooks: `useConfig()`, `useThemeConfig()`, `useKeymapConfig()`.

To add a config option: extend `TooeeConfig` in `packages/config/src/types.ts`, add a hook if needed, consume it where relevant.

### Command System

`@tooee/commands` provides a vim-inspired modal command system.

**Modes**: `"command"` | `"cursor"` | `"insert"` | `"select"`

**Registering commands**: use `useCommand()` for a single command or `useActions()` for a batch:

```typescript
useCommand({
  id: "view.scroll-down",
  title: "Scroll down",
  hotkey: "j",
  modes: ["command"],
  handler: () => scrollDown(),
})
```

**Command definition fields**: `id`, `title`, `handler`, `hotkey?`, `defaultHotkey?`, `modes?`, `when?`, `category?`, `group?`, `icon?`, `hidden?`

**Hotkey format**: modifier keys (`ctrl+`, `alt+`, `shift+`), sequences (`g g`), leader keys (`<leader>n`).

**Keymap overrides**: set `keys` in config to remap commands:
```json
{ "keys": { "view.scroll-down": "ctrl+d" } }
```

The `CommandProvider` handles keyboard dispatch, sequence tracking, and mode filtering. It receives `keymap` from config to apply overrides.

### Theme System

`@tooee/react` manages themes.

**Theme sources** (merged in order):
1. Bundled: `packages/react/src/themes/*.json` (39 themes)
2. Global: `~/.config/tooee/themes/*.json`
3. Project: `.tooee/themes/*.json`

**Theme JSON format**: OpenCode-compatible. Defines `ui`, `syntax`, `diff`, `markdown` color groups with support for `$ref` cross-references and `dark`/`light` variants.

**Runtime**: `ThemeProvider` exposes `useTheme()` returning a `Theme` with `name`, `mode`, `colors` (resolved `ResolvedTheme`), and `syntax` (`SyntaxStyle`). `ThemeSwitcherProvider` adds `useThemeSwitcher()` for cycling themes with persistence.

### Shell Layer

`@tooee/shell` is the composition layer that wires everything together.

**`TooeeProvider`**: root provider combining `ConfigProvider` + `ThemeSwitcherProvider` + `ModeProvider` + `CommandProvider`. All apps use this as their root.

**`launchCli()`**: creates an OpenTUI renderer and root element for CLI usage.

**Standard command hooks**:
- `useThemeCommands()` — `t`/`T` to cycle themes
- `useQuitCommand()` — `q` to exit
- `useCopyCommand()` — `y` to copy

**`useModalNavigationCommands()`**: complete modal navigation system providing:
- **Command mode**: `j`/`k` scroll, `gg`/`G` jump, `/` search, `n`/`N` next/prev match, `c` enter cursor mode
- **Cursor mode**: `j`/`k` move cursor, `v` enter select, `Escape` back to command
- **Select mode**: `j`/`k` extend selection, `y` copy selection, `Escape` back to cursor

Returns `{ mode, scrollOffset, cursor, selection, searchQuery, searchActive }` for the consuming component to render.

## Key Patterns

### Creating a New App Package

1. Create `packages/<name>/src/` with `types.ts`, `<Name>.tsx`, `launch.tsx`, `index.ts`
2. Define `<Name>ContentProvider` and `<Name>InteractionHandler` interfaces in `types.ts`
3. Build the component accepting providers as props, using `useModalNavigationCommands()` from `@tooee/shell`
4. Export component, `launch()`, and types from `index.ts`
5. Add to `apps/cli/src/main.ts` if it should be a CLI subcommand

### Adding a New Command

1. Call `useCommand()` or `useActions()` in the relevant component
2. Set `modes` to control when the command is active
3. Use `defaultHotkey` for the built-in binding (overridable via config `keys`)

### Adding a Config Option

1. Extend `TooeeConfig` in `packages/config/src/types.ts`
2. Add a `use<X>Config()` hook in `packages/config/src/context.tsx` if needed
3. Consume the hook in the relevant component

### How Themes Work

Themes are JSON files with color definitions across `ui`, `syntax`, `diff`, and `markdown` groups. `resolveTheme()` flattens refs and picks the active variant (`dark`/`light`). Components access colors via `useTheme().colors.<key>`. Users switch themes at runtime with `t`/`T`; the selection persists to config.

## Documentation

- [docs/opentui-guide.md](docs/opentui-guide.md) — OpenTUI primitives (elements, hooks, types, tsconfig)
- [docs/testing.md](docs/testing.md) — Testing guide (component tests with testRender, e2e tests with tuistory)

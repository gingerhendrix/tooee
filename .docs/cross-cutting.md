---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# Cross-Cutting Concerns

Shared behaviour that all tooee apps and components inherit. Lives primarily in `@tooee/react` and `@tooee/commands`.

## Keyboard Navigation (Vim-like)

Standard navigation available everywhere there's scrollable/selectable content:

| Key | Action |
|-----|--------|
| `j` / `k` | Move down / up |
| `g g` | Jump to top |
| `G` | Jump to bottom |
| `Ctrl+d` / `Ctrl+u` | Half-page down / up |
| `/` | Search |
| `n` / `N` | Next / previous search match |
| `q` / `Escape` | Quit / back |

Provided as hooks and built into scrollable components. Apps opt in, not forced.

## Selection

For content with selectable items (list items, code blocks, search results, sections):

| Key | Action |
|-----|--------|
| `j` / `k` | Move selection |
| `Enter` | Activate selected item |
| `Space` | Toggle select (multi-select mode) |
| `v` | Enter visual/selection mode |
| `y` | Copy selected |

```typescript
interface SelectableOptions {
  items: unknown[]
  multiSelect?: boolean
  onSelect?: (item: unknown, index: number) => void
  onActivate?: (item: unknown, index: number) => void
}
```

## Command System (@tooee/commands)

Already specced in the opentui-commands implementation plan. Key pieces:

- **Command registry** — `useCommand` hook registers commands
- **Command palette** — searchable list of all commands (`:` or `Ctrl+Shift+P`)
- **Hotkeys** — modifier combos (`Ctrl+s`), sequences (`g g`), leader key (`<leader>n`)
- **CommandProvider** — React context, configures leader key and scopes
- **useCommandContext** — exposes registry for palette/help screen

## Theme Support

Pluggable colour and styling system.

```typescript
interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
    muted: string
    accent: string
    error: string
    warning: string
    success: string
  }
  syntax: SyntaxTheme       // code highlighting
  border: "single" | "double" | "rounded" | "none"
}
```

- `<ThemeProvider theme={myTheme}>` wraps an app
- Components read from theme context
- Ships with a default theme
- Personal-tui provides its own theme

## Shortcut Keys

App-level shortcuts beyond navigation. Managed through the command system:

- Each app registers its own commands (quit, copy, actions)
- `?` shows help overlay with all available shortcuts
- Shortcuts are discoverable via command palette
- Custom actions from interaction handlers appear alongside built-in shortcuts

## Where Things Live

| Concern | Package |
|---------|---------|
| Vim navigation hooks | `@tooee/react` |
| Selection hooks/components | `@tooee/react` |
| Scrollable containers | `@tooee/react` |
| Command system | `@tooee/commands` |
| Theme provider + default theme | `@tooee/react` |
| Help overlay | `@tooee/commands` |

---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# Tooee Repo Plan

## Structure

```
tooee/
├── package.json            # Bun workspaces root
├── tsconfig.json           # Base TS config
├── packages/
│   ├── react/              # @tooee/react — shared components, hooks
│   ├── commands/           # @tooee/commands — command system, hotkeys
│   ├── view/               # @tooee/view — view component + launch fn
│   ├── ask/                # @tooee/ask — ask component + launch fn
│   └── request/            # @tooee/request — request component + launch fn
├── apps/
│   └── cli/                # @tooee/cli — CLI binary wrapping all apps
└── examples/
    └── ...                 # Example launcher scripts, custom providers
```

## Bun Workspaces

```json
{
  "name": "tooee",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

## Packages

| Package | npm Name | Purpose |
|---------|----------|---------|
| `packages/react` | `@tooee/react` | Shared components (MarkdownView, CodeView, StatusBar, TitleBar), hooks, layout primitives |
| `packages/commands` | `@tooee/commands` | Command registry, hotkey parser, sequence tracker, leader keys, CommandProvider |

## App Packages

| Package | npm Name | Purpose |
|---------|----------|---------|
| `packages/view` | `@tooee/view` | Display markdown/code/text |
| `packages/ask` | `@tooee/ask` | Gather input, output to stdout |
| `packages/request` | `@tooee/request` | Input → streaming response |

Each app package exports:
- A **React component** (for library usage within a larger app)
- A **launch function** (programmatic entry point — configure and run from code)
- **TypeScript interfaces** for content/interaction abstraction

## CLI

| App | npm Name | Purpose |
|-----|----------|---------|
| `apps/cli` | `@tooee/cli` | CLI binary wrapping all app packages |

The CLI is a separate package that imports app packages and exposes them as commands (`tooee view`, `tooee ask`, `tooee request`).

### Launch Function

```typescript
import { launch } from "@tooee/request"

launch({
  contentProvider: myStreamingProvider,
  interactionHandler: myActions,
})
```

This is the primary way personal-tui wires up tooee apps — a launcher script that imports `launch`, passes in custom providers, and runs.

## Dependencies

```
@opentui/core
@opentui/react
  └── @tooee/react (shared components)
        ├── @tooee/commands
        ├── @tooee/view
        ├── @tooee/ask
        └── @tooee/request
```

## Build

- `tsc -b` for type checking across all packages
- CLI app builds as a single binary
- Packages are consumed as TypeScript source within the monorepo

## Testing

- **[tuistory](https://github.com/remorses/tuistory)** for TUI snapshot testing (already used in commands package)
- **bun:test** for unit tests (parsers, matchers, logic)

## Later Additions

- `packages/themes` — shared color/styling system
- `packages/choose` — fuzzy picker
- `packages/form` — structured input

---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# Tooee Architecture

## Two Packages

| Package | Visibility | npm Org | Purpose |
|---------|-----------|---------|---------|
| **tooee** | Public | `@tooee` | Micro-apps and components |
| **personal-tui** | Private | `@personal-tui` | Personal backends, launcher scripts, config |

## Tooee (@tooee)

### Micro-Apps

Self-contained terminal apps with pluggable content and interaction. Each app ships with sensible defaults and examples.

| App | Purpose |
|-----|---------|
| **view** | Display content — markdown, code, images |
| **ask** | Gather input, output to stdout |
| **request** | Input -> streaming response -> rendered output |
| **choose** | Fuzzy picker from a list |
| **form** | Structured input collection |

### Core Components

General-purpose building blocks used across apps:

- Markdown and code rendering
- Selection and keyboard navigation
- Command system (palette, hotkeys, leader keys)

### Three Usage Modes

1. **CLI** — run directly, configure via args
2. **Launcher script** — thin wrapper that configures a tooee app for a specific use case
3. **Library** — import components and apps into your own OpenTUI project

### Abstraction Model

Each app separates **content** and **interaction** from presentation:

- **Content**: where data comes from (API, local file, stdin, etc.)
- **Interaction**: what happens on actions (open in editor, send to API, copy, etc.)
- **Presentation**: the TUI rendering (provided by tooee)

Tooee provides defaults for content and interaction. Consumers override them to wire up their own backends.

## Personal-TUI (@personal-tui)

### Role

Wires tooee apps to personal infrastructure:

- **auto-agent** as a backend for request
- **personal-vault** as a content source for view/choose
- Custom interaction handlers (send to agent, save to vault, etc.)

### Launcher Scripts

Personal-TUI apps are mostly thin launchers over tooee apps. For example:

| Personal App | Tooee App | What it Adds |
|-------------|-----------|-------------|
| web-search | `@tooee/request` | auto-agent web search backend |
| vault-view | `@tooee/view` | vault file picker + viewer |
| workspace-launcher | `@tooee/choose` | worktree list + launch actions |

### Development Flow

1. Build features in personal-tui first (fast iteration, wired to real systems)
2. Extract generic pieces to tooee when stable
3. Personal-tui depends on tooee for the reusable bits

## Tech Stack

- **Runtime**: Bun
- **UI Framework**: OpenTUI — Zig native renderer, Yoga flexbox layout, React reconciler (`@opentui/react`)
- **Packages**: All published under `@tooee/*`

OpenTUI provides the low-level TUI primitives (`<box>`, `<text>`, `<scrollbox>`, `<code>`, `<input>`, etc.) and hooks (`useKeyboard`, `useRenderer`). Tooee builds higher-level micro-apps and components on top.

## Package Structure (Planned)

```
@tooee/react          # Core framework — hooks, base components
@tooee/commands       # Command system, hotkeys, palette
@tooee/view           # View app
@tooee/ask            # Ask app
@tooee/request        # Request app (streaming)
@tooee/choose         # Fuzzy picker app
@tooee/form           # Form app
```

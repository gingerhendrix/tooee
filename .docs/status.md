---
type: status
status: active
project: personal-tui
created: 2026-01-30
---

# Tooee / Personal-TUI Status

## Current State

Single monorepo `personal-tui` with everything in one place. No public `tooee` repo yet. The `@tooee` npm org has been registered.

### Repository: personal-tui

**Worktrees:**
- `main` — current working state
- `opentui-commands` — commands package in progress (uncommitted)

**Apps (main):**

| App | State | Notes |
|-----|-------|-------|
| **dictate** | Working | Voice transcription TUI. Audio capture, ElevenLabs + LLM transcription, SSE server. Most developed app. |
| **view** | Skeleton | Markdown viewer, just a main.tsx |

**Packages (main):**

| Package | State | Notes |
|---------|-------|-------|
| **opentui-components** | Basic | MarkdownRenderer, clipboard utils |

**Packages (opentui-commands worktree):**

| Package | State | Notes |
|---------|-------|-------|
| **opentui-commands** | In progress | Command system with hotkeys, sequences, leader keys. Parser, matcher, sequence tracker, React context, useCommand hook. Not yet committed. |

### Not Yet Started

- **tooee repo** — no public repo created
- **@tooee packages** — no packages published
- **Apps**: ask, request, choose, form
- **Content/interaction abstraction** — the pluggable backend model
- **Launcher script pattern** — thin wrappers wiring tooee apps to personal backends

## What Exists vs Where It Needs To Go

| Current | Target |
|---------|--------|
| `opentui-components` in personal-tui | Split: generic components → `@tooee/*`, personal wiring stays |
| `dictate` app in personal-tui | Becomes launcher over a tooee app (or stays personal-only initially) |
| `view` app in personal-tui | Generic view → `@tooee/view`, personal-tui adds vault integration |
| `opentui-commands` package | → `@tooee/commands` |
| No public repo | Create tooee repo, publish `@tooee/*` packages |

## Next Steps

1. **Finish and commit opentui-commands** on its worktree branch
2. **Create tooee repo** — public monorepo for `@tooee/*` packages
3. **Extract first packages** — commands and core components into tooee
4. **Build content/interaction abstraction** — the pluggable model that makes apps generic
5. **First public apps** — view, ask, request (specced and ready for prototyping)

---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# @tooee/ask — Spec

A terminal app for gathering input. Displays a prompt, accepts user input, outputs to stdout. Designed to be piped to other commands.

## Usage Modes

### CLI
```bash
# Simple prompt
tooee ask "Search for:"

# Pipe to another tooee app
tooee ask "Query:" | tooee request --backend web-search

# Pipe to any command
tooee ask "Commit message:" | xargs git commit -m
```

### Launcher Script
```bash
#!/bin/bash
# web-search: ask then stream results
query=$(tooee ask "Search:")
tooee request --backend web-search "$query"
```

### Library
```tsx
import { Ask } from "@tooee/ask"

<Ask
  prompt="Enter query:"
  onSubmit={(value) => console.log(value)}
/>
```

## Content Abstraction

Ask is purely an input gatherer — no content provider needed. The prompt is the only "content".

```typescript
interface AskOptions {
  /** Prompt text displayed to the user */
  prompt?: string
  /** Placeholder/hint text in the input */
  placeholder?: string
  /** Pre-filled value */
  defaultValue?: string
}
```

## Interaction Abstraction

```typescript
interface AskInteractionHandler {
  actions: AskAction[]
}

interface AskAction {
  id: string
  title: string
  hotkey?: string
  handler: (input: string) => void
}
```

### Default Actions

- **Enter** — submit, output to stdout, exit
- **Escape** — cancel, exit with no output

### Custom Actions

```typescript
// Multiple submit modes via different keys
const personalActions: AskInteractionHandler = {
  actions: [
    { id: "search", title: "Web Search", hotkey: "ctrl+s", handler: launchSearch },
    { id: "ask-agent", title: "Ask Agent", hotkey: "ctrl+a", handler: askAgent },
  ]
}
```

## UI

- Prompt text
- Text input field
- Minimal chrome — this is a transient utility, not a persistent app
- Exits immediately on submit or cancel

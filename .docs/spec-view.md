---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# @tooee/view — Spec

A terminal app for displaying content: markdown, code, plain text.

## Usage Modes

### CLI
```bash
# File
tooee view README.md

# Stdin
cat README.md | tooee view

# With options
tooee view --theme dark README.md
```

### Launcher Script
```bash
#!/bin/bash
# vault-view: view a vault file with personal config
tooee view --theme personal "$@"
```

### Library
```tsx
import { View } from "@tooee/view"

<View content={myContent} />
```

## Content Abstraction

The view app doesn't know where content comes from. A content provider supplies it.

```typescript
interface ViewContentProvider {
  /** Load content to display */
  load(): Promise<ViewContent> | ViewContent
}

interface ViewContent {
  body: string
  format: "markdown" | "code" | "text"
  language?: string        // for code format
  title?: string
}
```

### Default Provider

Reads from file path (first arg) or stdin.

### Custom Providers

```typescript
// Personal: view a vault document
const vaultProvider: ViewContentProvider = {
  load: () => fetchVaultDoc(path)
}
```

## Interaction Abstraction

Actions the user can take on the content.

```typescript
interface ViewInteractionHandler {
  actions: ViewAction[]
}

interface ViewAction {
  id: string
  title: string
  hotkey?: string
  handler: (content: ViewContent) => void
}
```

### Default Actions

- **q / Escape** — quit
- **y** — copy content to clipboard

### Custom Actions

```typescript
// Personal: open in neovim, send to agent
const personalActions: ViewInteractionHandler = {
  actions: [
    { id: "edit", title: "Edit in Neovim", hotkey: "e", handler: openInNeovim },
    { id: "send", title: "Send to Agent", hotkey: "s", handler: sendToAgent },
  ]
}
```

## Features

- Markdown rendering with syntax-highlighted code blocks
- Line numbers for code
- Scrollable content (keyboard: j/k, page up/down)
- Search within content (/)
- Title bar showing filename/title
- Status bar showing format, line count, scroll position

## Components Extracted to @tooee/react

These are general-purpose and shared across apps:

- `<MarkdownView>` — rendered markdown with scroll
- `<CodeView>` — syntax-highlighted code with line numbers
- `<StatusBar>` — bottom bar with contextual info
- `<TitleBar>` — top bar with title

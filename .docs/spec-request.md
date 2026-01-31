---
type: note
status: active
project: personal-tui
created: 2026-01-30
---

# @tooee/request — Spec

A terminal app for input → streaming response → progressive render.

## Usage Modes

### CLI
```bash
# Interactive
tooee request

# With initial input
tooee request "Explain how React reconciliation works"

# Pipe
echo "Write a haiku about terminals" | tooee request
```

### Launcher Script
```bash
#!/bin/bash
# web-search: stream web search results from auto-agent
tooee request --backend web-search "$@"
```

### Library
```tsx
import { Request } from "@tooee/request"

<Request
  contentProvider={myStreamingProvider}
  interactionHandler={myHandler}
/>
```

## Content Abstraction

The key difference from ask: content arrives as a stream.

```typescript
interface RequestContentProvider {
  /** Submit input, receive streaming response */
  submit(input: string): AsyncIterable<RequestChunk>
}

interface RequestChunk {
  /** Incremental text to append */
  delta: string
}
```

The app accumulates chunks and progressively renders the growing response as markdown.

### Default Provider

No default — requires a backend. Ships with example providers (SSE endpoint, OpenAI-compatible streaming API).

### Custom Providers

```typescript
// Personal: web search via auto-agent
const webSearchProvider: RequestContentProvider = {
  submit: async function*(input) {
    for await (const chunk of agent.streamWebSearch(input)) {
      yield { delta: chunk.text }
    }
  }
}

// Public example: OpenAI streaming
const openaiProvider: RequestContentProvider = {
  submit: async function*(input) {
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: input }],
      stream: true,
    })
    for await (const chunk of stream) {
      yield { delta: chunk.choices[0]?.delta?.content ?? "" }
    }
  }
}
```

## Interaction Abstraction

```typescript
interface RequestInteractionHandler {
  actions: RequestAction[]
}

interface RequestAction {
  id: string
  title: string
  hotkey?: string
  handler: (input: string, response: string) => void
}
```

### Default Actions

- **q / Escape** — quit (or cancel if streaming)
- **y** — copy response to clipboard
- **Ctrl+c** — cancel current stream
- **Ctrl+n** — new request

### Custom Actions

```typescript
// Personal: save, continue, open links
const personalActions: RequestInteractionHandler = {
  actions: [
    { id: "save", title: "Save to Vault", hotkey: "s", handler: saveToVault },
    { id: "follow", title: "Follow Up", hotkey: "f", handler: followUp },
  ]
}
```

## UI Flow

1. **Input phase**: text input with prompt
2. **Streaming phase**: markdown renders progressively as chunks arrive, auto-scrolling
3. **Complete phase**: full response rendered, scrollable, actions available
4. **Cancel**: Ctrl+c stops the stream, shows partial response

## Streaming UX

- Progressive markdown rendering — content re-renders as it grows
- Auto-scroll follows new content (disable by scrolling up manually)
- Cursor/spinner at the end of content while streaming
- Smooth: avoid flicker during re-renders

## Composability

Request pairs naturally with ask — `tooee ask "Query:" | tooee request` — where ask gathers input and request handles the streaming response. They can also be used independently.

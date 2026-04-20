# Tooee

A framework for building TUI apps using OpenTUI and React.

Tooee provides a set of common primitives for building consistent TUI experiences.  It can be used as a cli, a typescript library, or a react component library.

## Apps

- View - A line-based interface for displaying information such as files, tables, logs etc, with built-in support for code highlighting, markdown rendering, and more.
- Choose - A menu-based interface for selecting from a list of options
- Ask - A text based interface for asking questions and getting user input

## CLI

Tooee can be used as a cli to quickly build TUI apps without writing any code.

Example - view a markdown file:

```bash
bunx @tooee/cli view README.md
```

## Launcher

For more control, you can use the Tooee Launcher to build and run your TUI apps.

Example - render git log in a table:

```typescript
import { launch, type ContentProvider, type Content } from "@tooee/view"

const contentProvider: ContentProvider = {
  async load(): Promise<Content> {
    // Use %x00 (null byte) as delimiter for safe parsing
    const proc = Bun.spawn(["git", "log", "--format=%h%x00%s%x00%an%x00%ar"])

    const text = await new Response(proc.stdout).text()

    const columns = [
      { key: "hash", header: "Hash" },
      { key: "message", header: "Message" },
      { key: "author", header: "Author" },
      { key: "date", header: "Date" },
    ]

    const lines = text.trim().split("\n").filter(Boolean)

    const rows = lines.map((line) => {
      const [hash, subject, author, date] = line.split("\x00")
      const preview = subject.length > 120 ? `${subject.slice(0, 120)}...` : subject
      return {
        hash,
        message: preview,
        author,
        date,
      }
    })

    return { format: "table", columns, rows, title: "Git Log" }
  },
}

launch({ contentProvider })
```

## React

Tooee can also be used as a React component library to build TUI apps with React.

```tsx
```

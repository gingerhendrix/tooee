#!/usr/bin/env bun
/**
 * view-markdown.ts - Demonstrates @tooee/view with markdown content
 *
 * This example shows:
 * - Creating a ViewContentProvider with inline content
 * - Rendering markdown with headings, code blocks, lists, and emphasis
 * - The load() method can return content synchronously or as a Promise
 *
 * Run: bun examples/view-markdown.ts
 * Controls: j/k scroll, q quit, t/T cycle themes
 */

import { launch, type ContentProvider } from "@tooee/view"

// Create a content provider with inline markdown
const contentProvider: ContentProvider = {
  load: () => ({
    title: "Tooee Example",
    format: "markdown",
    markdown: `# Welcome to Tooee

Tooee is a collection of **terminal micro-apps** built on OpenTUI.

## Features

- **Markdown rendering** with syntax highlighting
- **Modal navigation** inspired by vim
- **Themeable** with 39+ built-in themes

## Quick Start

\`\`\`bash
# Install tooee globally
bun add -g @tooee/cli

# View a markdown file
tooee view README.md

# Get user input
tooee ask "What's your name?"
\`\`\`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| \`j\` / \`k\` | Scroll down / up |
| \`g g\` | Jump to top |
| \`G\` | Jump to bottom |
| \`t\` / \`T\` | Next / previous theme |
| \`q\` | Quit |

## Learn More

Check out the other examples in this directory to see the full API surface.

---

*Press \`q\` to quit this viewer.*
`,
  }),
}

// Launch the viewer with our content provider
launch({ contentProvider })

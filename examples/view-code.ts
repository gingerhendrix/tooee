#!/usr/bin/env bun
/**
 * view-code.ts - Demonstrates @tooee/view with syntax-highlighted code
 *
 * This example shows:
 * - Using format: "code" for syntax highlighting
 * - Specifying the language for proper highlighting
 * - Line numbers and code navigation
 *
 * Run: bun examples/view-code.ts
 * Controls: j/k scroll, q quit, t/T cycle themes
 */

import { launch, type ContentProvider } from "@tooee/view"

// Create a content provider with inline TypeScript code
const contentProvider: ContentProvider = {
  load: () => ({
    title: "example.ts",
    format: "code",
    language: "typescript",
    code: `/**
 * A simple reactive state management system
 */

type Listener<T> = (value: T) => void

interface Signal<T> {
  get(): T
  set(value: T): void
  subscribe(listener: Listener<T>): () => void
}

function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue
  const listeners = new Set<Listener<T>>()

  return {
    get() {
      return value
    },

    set(newValue: T) {
      if (newValue !== value) {
        value = newValue
        listeners.forEach((listener) => listener(value))
      }
    },

    subscribe(listener: Listener<T>) {
      listeners.add(listener)
      // Return unsubscribe function
      return () => listeners.delete(listener)
    },
  }
}

// Usage example
const count = createSignal(0)

const unsubscribe = count.subscribe((value) => {
  console.log(\`Count changed to: \${value}\`)
})

count.set(1) // logs: "Count changed to: 1"
count.set(2) // logs: "Count changed to: 2"

unsubscribe()
count.set(3) // no log - unsubscribed
`,
  }),
}

// Launch the viewer with our code content
launch({ contentProvider })

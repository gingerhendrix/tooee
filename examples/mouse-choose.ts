#!/usr/bin/env bun
/**
 * mouse-choose.ts - Demonstrates left-click row select in @tooee/choose
 *
 * The Choose list is keyboard-first (j/k + Enter), but you can now also use
 * the mouse: left-click any row to make it the active selection, then press
 * Enter to confirm. This pairs with the table mouse demo (mouse-demo.ts),
 * which covers right-click context menus and overlay close buttons.
 *
 * Run: bun examples/mouse-choose.ts
 *
 * Controls:
 *   left-click row   highlight (make active) that row
 *   j / k            move the highlight down / up
 *   Enter            confirm the highlighted row
 *   /                filter
 *   Escape           cancel
 */

import { launch, createStaticProvider, type ChooseItem } from "@tooee/choose"

const frameworks: ChooseItem[] = [
  { text: "OpenTUI", value: "opentui", icon: "\u{1F5A5}", description: "Zig-native terminal renderer" },
  { text: "React", value: "react", icon: "\u{269B}", description: "Declarative UI via the reconciler" },
  { text: "Solid", value: "solid", icon: "\u{1F9F1}", description: "Fine-grained reactivity" },
  { text: "Bun", value: "bun", icon: "\u{1F35E}", description: "Fast all-in-one runtime" },
  { text: "TypeScript", value: "typescript", icon: "\u{1F4D8}", description: "Typed JavaScript" },
  { text: "Tailwind", value: "tailwind", icon: "\u{1F3A8}", description: "Utility-first styling" },
]

async function main() {
  const result = await launch({
    contentProvider: createStaticProvider(frameworks),
    options: { prompt: "Left-click a row, then press Enter" },
  })

  if (result === null) {
    console.log("Selection cancelled")
  } else {
    const selected = result.items[0]
    console.log(`You chose: ${selected.text} (${selected.value})`)
  }
}

main()

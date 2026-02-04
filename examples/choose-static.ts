#!/usr/bin/env bun
/**
 * choose-static.ts - Demonstrates @tooee/choose with a static list
 *
 * This example shows:
 * - Using createStaticProvider() for inline item lists
 * - ChooseItem structure with text, value, icon, and description
 * - Getting the selected result (returns null if cancelled)
 * - Multi-select mode option
 *
 * Run: bun examples/choose-static.ts
 * Controls: j/k navigate, Enter select, / filter, Escape cancel
 */

import { launch, createStaticProvider, type ChooseItem } from "@tooee/choose"

// Define items with icons and descriptions
const colors: ChooseItem[] = [
  {
    text: "Red",
    value: "red",
    icon: "\u{1F534}", // Red circle emoji
    description: "A warm, energetic color",
  },
  {
    text: "Green",
    value: "green",
    icon: "\u{1F7E2}", // Green circle emoji
    description: "The color of nature and growth",
  },
  {
    text: "Blue",
    value: "blue",
    icon: "\u{1F535}", // Blue circle emoji
    description: "A calm, trustworthy color",
  },
  {
    text: "Yellow",
    value: "yellow",
    icon: "\u{1F7E1}", // Yellow circle emoji
    description: "Bright and cheerful",
  },
  {
    text: "Purple",
    value: "purple",
    icon: "\u{1F7E3}", // Purple circle emoji
    description: "Royal and creative",
  },
]

async function main() {
  // Launch returns the selected item(s) or null if cancelled
  const result = await launch({
    // createStaticProvider wraps an array as a ChooseContentProvider
    contentProvider: createStaticProvider(colors),

    options: {
      prompt: "Pick your favorite color",
      // Enable multi-select (uncomment to allow multiple selections)
      // multi: true,
    },
  })

  if (result === null) {
    console.log("Selection cancelled")
  } else {
    // result.items contains the selected ChooseItem(s)
    const selected = result.items[0]
    console.log(`You chose: ${selected.text} (${selected.value})`)
  }
}

main()

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

import { launch, createStaticProvider } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";

// Define items with icons and descriptions
const colors: ChooseItem[] = [
  {
    description: "A warm, energetic color",
    icon: "\u{1F534}", // Red circle emoji
    text: "Red",
    value: "red",
  },
  {
    description: "The color of nature and growth",
    icon: "\u{1F7E2}", // Green circle emoji
    text: "Green",
    value: "green",
  },
  {
    description: "A calm, trustworthy color",
    icon: "\u{1F535}", // Blue circle emoji
    text: "Blue",
    value: "blue",
  },
  {
    description: "Bright and cheerful",
    icon: "\u{1F7E1}", // Yellow circle emoji
    text: "Yellow",
    value: "yellow",
  },
  {
    description: "Royal and creative",
    icon: "\u{1F7E3}", // Purple circle emoji
    text: "Purple",
    value: "purple",
  },
];

const main = async function main() {
  // Launch returns the selected item(s) or null if cancelled
  const result = await launch({
    // createStaticProvider wraps an array as a ChooseContentProvider
    contentProvider: createStaticProvider(colors),

    options: {
      prompt: "Pick your favorite color",
      // Enable multi-select (uncomment to allow multiple selections)
      // multi: true,
    },
  });

  if (result === null) {
    console.log("Selection cancelled");
  } else {
    // result.items contains the selected ChooseItem(s)
    const selected = result.items[0];
    console.log(`You chose: ${selected.text} (${selected.value})`);
  }
};

main();

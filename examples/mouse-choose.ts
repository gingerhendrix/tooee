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

import { launch, createStaticProvider } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";

const frameworks: ChooseItem[] = [
  {
    description: "Zig-native terminal renderer",
    icon: "\u{1F5A5}",
    text: "OpenTUI",
    value: "opentui",
  },
  {
    description: "Declarative UI via the reconciler",
    icon: "\u{269B}",
    text: "React",
    value: "react",
  },
  { description: "Fine-grained reactivity", icon: "\u{1F9F1}", text: "Solid", value: "solid" },
  { description: "Fast all-in-one runtime", icon: "\u{1F35E}", text: "Bun", value: "bun" },
  { description: "Typed JavaScript", icon: "\u{1F4D8}", text: "TypeScript", value: "typescript" },
  { description: "Utility-first styling", icon: "\u{1F3A8}", text: "Tailwind", value: "tailwind" },
];

const main = async function main() {
  const result = await launch({
    contentProvider: createStaticProvider(frameworks),
    options: { prompt: "Left-click a row, then press Enter" },
  });

  if (result === null) {
    console.log("Selection cancelled");
  } else {
    const [selected] = result.items;
    console.log(`You chose: ${selected.text} (${selected.value})`);
  }
};

await main();

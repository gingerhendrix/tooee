#!/usr/bin/env bun
/**
 * view-outline.ts - Demonstrates the Markdown heading outline panel
 *
 * This example shows:
 * - Loading a long Markdown document with headings at depths 1 to 6
 * - Opening the outline panel at start with the `outline` launch option
 * - Skipped heading levels, setext headings, empty sections and long headings
 * - `#` lines inside code fences, which the outline does not list
 *
 * Run: bun examples/view-outline.ts
 * Controls: g o open or focus the outline, j/k move, enter jump,
 *           escape back to the document, z c/z o/z M/z R folds, q quit
 */

import { launch } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";

const showcasePath = new URL("outline-showcase.md", import.meta.url);

const contentProvider: ContentProvider = {
  async load() {
    return {
      format: "markdown",
      markdown: await Bun.file(showcasePath).text(),
      title: "Harbour Light · Outline Demo",
    };
  },
};

await launch({ contentProvider, outline: true });

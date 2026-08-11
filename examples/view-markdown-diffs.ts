#!/usr/bin/env bun
/**
 * view-markdown-diffs.ts - Demonstrates Hunk-backed patches inside Markdown
 *
 * This example shows:
 * - Loading a Markdown document from a separate file
 * - Rendering real `diff` and `patch` fences through @tooee/diff
 * - Selecting split, hidden-line-number, and wrapped layouts per fence
 * - Falling back to a code block when a diff fence is not a unified patch
 *
 * Run: bun examples/view-markdown-diffs.ts
 * Controls: j/k move, h/l pan, q quit, t/T cycle themes
 */

import { launch } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";

const showcasePath = new URL("diff-showcase.md", import.meta.url);

const contentProvider: ContentProvider = {
  async load() {
    return {
      format: "markdown",
      markdown: await Bun.file(showcasePath).text(),
      title: "Pocket Tasks · Patch Review",
    };
  },
};

await launch({ contentProvider });

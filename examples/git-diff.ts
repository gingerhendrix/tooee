#!/usr/bin/env bun
/**
 * git-diff.ts - View staged or unstaged git diff
 *
 * Shows the diff with syntax highlighting. Pass --staged for staged changes.
 *
 * Run: bun examples/git-diff.ts           # unstaged changes
 * Run: bun examples/git-diff.ts --staged  # staged changes
 * Controls: j/k scroll, q quit, t/T themes
 */

import { launch, type ViewContentProvider } from "@tooee/view"

const staged = process.argv.includes("--staged")

const contentProvider: ViewContentProvider = {
  async load() {
    const args = staged ? ["git", "diff", "--staged"] : ["git", "diff"]
    const proc = Bun.spawn(args)

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      return {
        body: "Not a git repository or git not installed",
        format: "text" as const,
        title: "Git Diff",
      }
    }

    if (!text.trim()) {
      return {
        body: staged
          ? "No staged changes. Stage files with `git add`."
          : "No unstaged changes. Working tree is clean.",
        format: "text" as const,
        title: "Git Diff",
      }
    }

    return {
      body: text,
      format: "code" as const,
      language: "diff",
      title: staged ? "Staged Changes" : "Unstaged Changes",
    }
  },
}

launch({ contentProvider })

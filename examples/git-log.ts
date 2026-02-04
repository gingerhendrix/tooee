#!/usr/bin/env bun
/**
 * git-log.ts - View recent commits in a table
 *
 * Displays git log in a navigable table format.
 *
 * Run: bun examples/git-log.ts
 * Controls: j/k scroll, h/l columns, q quit
 */

import { launch, type TableContentProvider, type TableContent } from "@tooee/table"

const contentProvider: TableContentProvider = {
  async load(): Promise<TableContent> {
    // Use %x00 (null byte) as delimiter for safe parsing
    const proc = Bun.spawn(["git", "log", "--format=%h%x00%s%x00%an%x00%ar", "-n", "50"])

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      return {
        headers: ["Error"],
        rows: [["Not a git repository or git not installed"]],
        title: "Git Log",
        format: "unknown",
      }
    }

    const lines = text.trim().split("\n").filter(Boolean)

    if (lines.length === 0) {
      return {
        headers: ["Info"],
        rows: [["No commits found"]],
        title: "Git Log",
        format: "unknown",
      }
    }

    const rows = lines.map((line) => {
      const [hash, subject, author, date] = line.split("\x00")
      return [hash, subject.slice(0, 60) + (subject.length > 60 ? "..." : ""), author, date]
    })

    return {
      headers: ["Hash", "Message", "Author", "Date"],
      rows,
      title: "Git Log",
      format: "unknown",
    }
  },
}

launch({ contentProvider })

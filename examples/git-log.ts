#!/usr/bin/env bun
/**
 * git-log.ts - View recent commits in a table
 *
 * Displays git log in a navigable table format.
 *
 * Run: bun examples/git-log.ts
 * Controls: j/k scroll, h/l columns, q quit
 */

import { launch, type ContentProvider, type Content } from "@tooee/view"

const contentProvider: ContentProvider = {
  async load(): Promise<Content> {
    // Use %x00 (null byte) as delimiter for safe parsing
    const proc = Bun.spawn(["git", "log", "--format=%h%x00%s%x00%an%x00%ar", "-n", "50"])

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    const headers = ["Hash", "Message", "Author", "Date"]

    if (exitCode !== 0) {
      const body = [headers.join("\t"), ["Error", "Not a git repository or git not installed", "", ""].join("\t")].join("\n")
      return { body, format: "table", title: "Git Log" }
    }

    const lines = text.trim().split("\n").filter(Boolean)

    if (lines.length === 0) {
      const body = [headers.join("\t"), ["Info", "No commits found", "", ""].join("\t")].join("\n")
      return { body, format: "table", title: "Git Log" }
    }

    const rows = lines.map((line) => {
      const [hash, subject, author, date] = line.split("\x00")
      return [hash, subject.slice(0, 60) + (subject.length > 60 ? "..." : ""), author, date].join("\t")
    })

    const body = [headers.join("\t"), ...rows].join("\n")
    return { body, format: "table", title: "Git Log" }
  },
}

launch({ contentProvider })

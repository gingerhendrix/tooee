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

    const columns = [
      { key: "hash", header: "Hash" },
      { key: "message", header: "Message" },
      { key: "author", header: "Author" },
      { key: "date", header: "Date" },
    ]

    if (exitCode !== 0) {
      return {
        format: "table",
        title: "Git Log",
        columns,
        rows: [
          {
            hash: "Error",
            message: "Not a git repository or git not installed",
            author: "",
            date: "",
          },
        ],
      }
    }

    const lines = text.trim().split("\n").filter(Boolean)

    if (lines.length === 0) {
      return {
        format: "table",
        title: "Git Log",
        columns,
        rows: [
          {
            hash: "Info",
            message: "No commits found",
            author: "",
            date: "",
          },
        ],
      }
    }

    const rows = lines.map((line) => {
      const [hash, subject, author, date] = line.split("\x00")
      const preview = subject.length > 60 ? `${subject.slice(0, 60)}...` : subject
      return {
        hash,
        message: preview,
        author,
        date,
      }
    })

    return { format: "table", columns, rows, title: "Git Log" }
  },
}

launch({ contentProvider })

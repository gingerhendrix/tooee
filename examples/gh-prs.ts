#!/usr/bin/env bun
/**
 * gh-prs.ts - View pull requests in current repo
 *
 * Wraps `gh pr list` to display PRs in a navigable table.
 * Requires: gh CLI (https://cli.github.com)
 *
 * Run: bun examples/gh-prs.ts
 * Controls: j/k scroll, h/l columns, q quit
 */

import { launch, type ContentProvider, type Content } from "@tooee/view"

interface PR {
  number: number
  title: string
  author: { login: string }
  state: string
  createdAt: string
}

const contentProvider: ContentProvider = {
  async load(): Promise<Content> {
    const proc = Bun.spawn([
      "gh",
      "pr",
      "list",
      "--json",
      "number,title,author,state,createdAt",
      "--limit",
      "50",
    ])

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    const columns = [
      { key: "number", header: "#" },
      { key: "title", header: "Title" },
      { key: "author", header: "Author" },
      { key: "state", header: "State" },
      { key: "created", header: "Created" },
    ]

    if (exitCode !== 0) {
      return {
        format: "table",
        title: "Pull Requests",
        columns,
        rows: [
          {
            number: "Error",
            title: "Failed to fetch PRs. Is `gh` installed and authenticated?",
            author: "",
            state: "",
            created: "",
          },
        ],
      }
    }

    const prs: PR[] = JSON.parse(text || "[]")

    if (prs.length === 0) {
      return {
        format: "table",
        title: "Pull Requests",
        columns,
        rows: [
          {
            number: "Info",
            title: "No open pull requests",
            author: "",
            state: "",
            created: "",
          },
        ],
      }
    }

    const rows = prs.map((pr) => ({
      number: String(pr.number),
      title: pr.title.length > 60 ? `${pr.title.slice(0, 60)}...` : pr.title,
      author: pr.author.login,
      state: pr.state,
      created: new Date(pr.createdAt).toLocaleDateString(),
    }))

    return { format: "table", columns, rows, title: "Pull Requests" }
  },
}

launch({ contentProvider })

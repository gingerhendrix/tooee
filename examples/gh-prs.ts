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

import { launch, type ViewContentProvider, type ViewContent } from "@tooee/view"

interface PR {
  number: number
  title: string
  author: { login: string }
  state: string
  createdAt: string
}

const contentProvider: ViewContentProvider = {
  async load(): Promise<ViewContent> {
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

    const headers = ["#", "Title", "Author", "State", "Created"]

    if (exitCode !== 0) {
      const body = [headers.join("\t"), ["Error", "Failed to fetch PRs. Is `gh` installed and authenticated?", "", "", ""].join("\t")].join("\n")
      return { body, format: "table", title: "Pull Requests" }
    }

    const prs: PR[] = JSON.parse(text || "[]")

    if (prs.length === 0) {
      const body = [headers.join("\t"), ["Info", "No open pull requests", "", "", ""].join("\t")].join("\n")
      return { body, format: "table", title: "Pull Requests" }
    }

    const rows = prs.map((pr) =>
      [
        String(pr.number),
        pr.title.slice(0, 60) + (pr.title.length > 60 ? "..." : ""),
        pr.author.login,
        pr.state,
        new Date(pr.createdAt).toLocaleDateString(),
      ].join("\t"),
    )

    const body = [headers.join("\t"), ...rows].join("\n")
    return { body, format: "table", title: "Pull Requests" }
  },
}

launch({ contentProvider })

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

import { launch, type TableContentProvider, type TableContent } from "@tooee/table"

interface PR {
  number: number
  title: string
  author: { login: string }
  state: string
  createdAt: string
}

const contentProvider: TableContentProvider = {
  async load(): Promise<TableContent> {
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

    if (exitCode !== 0) {
      return {
        headers: ["Error"],
        rows: [["Failed to fetch PRs. Is `gh` installed and authenticated?"]],
        title: "Pull Requests",
        format: "json",
      }
    }

    const prs: PR[] = JSON.parse(text || "[]")

    if (prs.length === 0) {
      return {
        headers: ["Info"],
        rows: [["No open pull requests"]],
        title: "Pull Requests",
        format: "json",
      }
    }

    return {
      headers: ["#", "Title", "Author", "State", "Created"],
      rows: prs.map((pr) => [
        String(pr.number),
        pr.title.slice(0, 60) + (pr.title.length > 60 ? "..." : ""),
        pr.author.login,
        pr.state,
        new Date(pr.createdAt).toLocaleDateString(),
      ]),
      title: "Pull Requests",
      format: "json",
    }
  },
}

launch({ contentProvider })

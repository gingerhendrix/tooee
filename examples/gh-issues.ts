#!/usr/bin/env bun
/**
 * gh-issues.ts - Browse and view GitHub issues
 *
 * Choose an issue from a list, then view its details.
 * Requires: gh CLI (https://cli.github.com)
 *
 * Run: bun examples/gh-issues.ts
 * Controls: j/k navigate, / filter, Enter select, q quit
 */

import { launch as launchChoose, type ChooseItem } from "@tooee/choose"
import { launch as launchView, type ContentProvider } from "@tooee/view"

interface Issue {
  number: number
  title: string
  author: { login: string }
  state: string
  labels: { name: string }[]
}

const issueProvider = {
  async load(): Promise<ChooseItem[]> {
    const proc = Bun.spawn([
      "gh",
      "issue",
      "list",
      "--json",
      "number,title,author,state,labels",
      "--limit",
      "50",
    ])

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      return [{ text: "Failed to fetch issues. Is `gh` installed?", value: "" }]
    }

    const issues: Issue[] = JSON.parse(text || "[]")

    if (issues.length === 0) {
      return [{ text: "No open issues", value: "" }]
    }

    return issues.map((issue) => ({
      text: `#${issue.number} ${issue.title}`,
      value: String(issue.number),
      icon: issue.state === "OPEN" ? "\u{1F7E2}" : "\u{1F534}",
      description: issue.labels.map((l) => l.name).join(", ") || undefined,
    }))
  },
}

async function viewIssue(issueNumber: string) {
  const contentProvider: ContentProvider = {
    async load() {
      const proc = Bun.spawn(["gh", "issue", "view", issueNumber])
      const text = await new Response(proc.stdout).text()

      return {
        body: text,
        format: "markdown" as const,
        title: `Issue #${issueNumber}`,
      }
    },
  }

  await launchView({ contentProvider })
}

async function main() {
  const result = await launchChoose({
    contentProvider: issueProvider,
    options: { prompt: "Select an issue to view" },
  })

  if (result && result.items[0].value) {
    await viewIssue(result.items[0].value)
  }
}

main()

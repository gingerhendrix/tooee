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

import { launch as launchChoose } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";
import { launch as launchView } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";

interface Issue {
  number: number;
  title: string;
  author: { login: string };
  state: string;
  labels: { name: string }[];
}

const isIssue = function isIssue(value: unknown): value is Issue {
  return (
    typeof value === "object" &&
    value !== null &&
    "number" in value &&
    typeof value.number === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "author" in value &&
    typeof value.author === "object" &&
    value.author !== null &&
    "login" in value.author &&
    typeof value.author.login === "string" &&
    "state" in value &&
    typeof value.state === "string" &&
    "labels" in value &&
    Array.isArray(value.labels) &&
    value.labels.every(
      (label) =>
        typeof label === "object" &&
        label !== null &&
        "name" in label &&
        typeof label.name === "string",
    )
  );
};

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
    ]);

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return [{ text: "Failed to fetch issues. Is `gh` installed?", value: "" }];
    }

    const parsed: unknown = JSON.parse(text || "[]");
    if (!Array.isArray(parsed) || !parsed.every(isIssue)) {
      throw new Error("GitHub returned invalid issue data");
    }
    const issues = parsed;

    if (issues.length === 0) {
      return [{ text: "No open issues", value: "" }];
    }

    return issues.map((issue) => ({
      description: issue.labels.map((l) => l.name).join(", ") || undefined,
      icon: issue.state === "OPEN" ? "\u{1F7E2}" : "\u{1F534}",
      text: `#${issue.number} ${issue.title}`,
      value: String(issue.number),
    }));
  },
};

const viewIssue = async function viewIssue(issueNumber: string) {
  const contentProvider: ContentProvider = {
    async load() {
      const proc = Bun.spawn(["gh", "issue", "view", issueNumber]);
      const text = await new Response(proc.stdout).text();

      return {
        format: "markdown" as const,
        markdown: text,
        title: `Issue #${issueNumber}`,
      };
    },
  };

  await launchView({ contentProvider });
};

const main = async function main() {
  const result = await launchChoose({
    contentProvider: issueProvider,
    options: { prompt: "Select an issue to view" },
  });

  if (result && result.items[0].value !== undefined && result.items[0].value !== "") {
    await viewIssue(result.items[0].value);
  }
};

await main();

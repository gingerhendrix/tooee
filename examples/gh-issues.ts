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

/**
 * Decode the `gh issue list --json ...` payload once, here at the process
 * boundary. The requested field set is a stable CLI contract, so this example
 * checks the envelope shape and then trusts it with a single documented cast
 * rather than re-validating every field at each use site.
 */
const decodeIssues = function decodeIssues(text: string): Issue[] {
  const parsed: unknown = JSON.parse(text === "" ? "[]" : text);
  if (!Array.isArray(parsed)) {
    throw new TypeError("GitHub returned invalid issue data");
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- one-off cast at the gh CLI boundary
  return parsed as Issue[];
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

    const issues = decodeIssues(text);

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

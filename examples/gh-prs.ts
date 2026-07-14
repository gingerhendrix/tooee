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

import { launch } from "@tooee/view";
import type { ContentProvider, Content } from "@tooee/view";

interface PR {
  number: number;
  title: string;
  author: { login: string };
  state: string;
  createdAt: string;
}

const isPR = function isPR(value: unknown): value is PR {
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
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
};

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
    ]);

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    const columns = [
      { header: "#", key: "number" },
      { header: "Title", key: "title" },
      { header: "Author", key: "author" },
      { header: "State", key: "state" },
      { header: "Created", key: "created" },
    ];

    if (exitCode !== 0) {
      return {
        columns,
        format: "table",
        rows: [
          {
            author: "",
            created: "",
            number: "Error",
            state: "",
            title: "Failed to fetch PRs. Is `gh` installed and authenticated?",
          },
        ],
        title: "Pull Requests",
      };
    }

    const parsed: unknown = JSON.parse(text || "[]");
    if (!Array.isArray(parsed) || !parsed.every(isPR)) {
      throw new Error("GitHub returned invalid pull request data");
    }
    const prs = parsed;

    if (prs.length === 0) {
      return {
        columns,
        format: "table",
        rows: [
          {
            author: "",
            created: "",
            number: "Info",
            state: "",
            title: "No open pull requests",
          },
        ],
        title: "Pull Requests",
      };
    }

    const rows = prs.map((pr) => ({
      author: pr.author.login,
      created: new Date(pr.createdAt).toLocaleDateString(),
      number: String(pr.number),
      state: pr.state,
      title: pr.title.length > 60 ? `${pr.title.slice(0, 60)}...` : pr.title,
    }));

    return { columns, format: "table", rows, title: "Pull Requests" };
  },
};

await launch({ contentProvider });

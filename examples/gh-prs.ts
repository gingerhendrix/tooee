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

type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;

interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

const parseJsonDocument = function parseJsonDocument(text: string): JsonValue {
  // SAFETY: JSON.parse without a reviver produces only the JSON grammar represented by JsonValue.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the standard JSON parser establishes the local JSON grammar
  return JSON.parse(text) as JsonValue;
};

const isJsonObject = function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value instanceof Object && !Array.isArray(value);
};

const isJsonArray = function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
};

const isJsonNumber = function isJsonNumber(value: JsonValue | undefined): value is number {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive representation check is contained in the gh JSON boundary decoder
  return typeof value === "number";
};

const isJsonString = function isJsonString(value: JsonValue | undefined): value is string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive representation check is contained in the gh JSON boundary decoder
  return typeof value === "string";
};

const decodePR = function decodePR(value: JsonValue): PR | null {
  if (!isJsonObject(value) || !isJsonObject(value.author)) {
    return null;
  }

  const { author, createdAt, number, state, title } = value;
  if (
    !isJsonNumber(number) ||
    !isJsonString(title) ||
    !isJsonString(author.login) ||
    !isJsonString(state) ||
    !isJsonString(createdAt)
  ) {
    return null;
  }

  return { author: { login: author.login }, createdAt, number, state, title };
};

const decodePullRequests = function decodePullRequests(text: string): PR[] {
  const parsed = parseJsonDocument(text === "" ? "[]" : text);
  if (!isJsonArray(parsed)) {
    // oxlint-disable-next-line unicorn/prefer-type-error -- preserve the example's existing invalid-payload Error contract
    throw new Error("GitHub returned invalid pull request data");
  }

  const pullRequests: PR[] = [];
  for (const value of parsed) {
    const pullRequest = decodePR(value);
    if (pullRequest === null) {
      throw new Error("GitHub returned invalid pull request data");
    }
    pullRequests.push(pullRequest);
  }
  return pullRequests;
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

    const prs = decodePullRequests(text);

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

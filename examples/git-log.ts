#!/usr/bin/env bun
/**
 * git-log.ts - View recent commits in a table
 *
 * Displays git log in a navigable table format.
 *
 * Run: bun examples/git-log.ts
 * Controls: j/k scroll, h/l columns, q quit
 */

import { launch } from "@tooee/view";
import type { ContentProvider, Content } from "@tooee/view";

const contentProvider: ContentProvider = {
  async load(): Promise<Content> {
    // Use %x00 (null byte) as delimiter for safe parsing
    const proc = Bun.spawn(["git", "log", "--format=%h%x00%s%x00%an%x00%ar"]);

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    const columns = [
      { header: "Hash", key: "hash" },
      { header: "Message", key: "message" },
      { header: "Author", key: "author" },
      { header: "Date", key: "date" },
    ];

    if (exitCode !== 0) {
      return {
        columns,
        format: "table",
        rows: [
          {
            author: "",
            date: "",
            hash: "Error",
            message: "Not a git repository or git not installed",
          },
        ],
        title: "Git Log",
      };
    }

    const lines = text.trim().split("\n").filter(Boolean);

    if (lines.length === 0) {
      return {
        columns,
        format: "table",
        rows: [
          {
            author: "",
            date: "",
            hash: "Info",
            message: "No commits found",
          },
        ],
        title: "Git Log",
      };
    }

    const rows = lines.map((line) => {
      const [hash, subject, author, date] = line.split("\u0000");
      const preview = subject.length > 120 ? `${subject.slice(0, 120)}...` : subject;
      return {
        author,
        date,
        hash,
        message: preview,
      };
    });

    return { columns, format: "table", rows, title: "Git Log" };
  },
};

launch({ contentProvider });

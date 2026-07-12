#!/usr/bin/env bun
/**
 * custom-marks.ts - Demonstrates the @tooee/marks system
 *
 * This example shows:
 * - Static marks via ContentProvider (diagnostics, bookmarks)
 * - Streaming marks via async content chunks
 * - User marks via CommandContext actions (toggle bookmark on current line)
 * - MarkSetBuilder for constructing mark sets
 * - Multiple namespaces with different priorities and styles
 *
 * Run: bun examples/custom-marks.ts
 * Controls:
 *   j/k     — scroll up/down
 *   c       — enter cursor mode
 *   b       — toggle bookmark on current line (cursor mode)
 *   d       — add diagnostic mark on current line (cursor mode)
 *   D       — clear all diagnostics
 *   B       — clear all bookmarks
 *   x       — clear all user marks
 *   q       — quit
 *   t/T     — cycle themes
 */

import { launch } from "@tooee/view";
import type { ContentProvider, ContentChunk } from "@tooee/view";
import { MarkSetBuilder, MarkPriorities } from "@tooee/marks";
import type { ActionDefinition } from "@tooee/commands";
import type { MarkSet } from "@tooee/marks";

// === Sample source code to annotate ===

const SOURCE_CODE = `// server.ts — A tiny HTTP server with diagnostics
import { serve } from "bun"

interface Config {
  port: number
  hostname: string
  maxConnections: number    // warning: unused field
}

const config: Config = {
  port: 3000,
  hostname: "localhost",
  maxConnections: 100,
}

function handleRequest(req: Request): Response {
  const url = new URL(req.url)

  if (url.pathname === "/") {
    return new Response("Hello, World!")
  }

  if (url.pathname === "/api/health") {
    return Response.json({ status: "ok", uptime: process.uptime() })
  }

  if (url.pathname === "/api/users") {
    // TODO: implement user endpoint
    const users = null   // error: should not be null
    return Response.json(users)
  }

  if (url.pathname === "/api/config") {
    // info: this endpoint exposes internal config
    return Response.json(config)
  }

  // hint: consider adding a 404 handler with a helpful message
  return new Response("Not Found", { status: 404 })
}

const server = serve({
  port: config.port,
  fetch: handleRequest,
})

console.log(\`Server running at http://\${server.hostname}:\${server.port}\`)

// Performance notes:
// Line 42: hot path — called on every request
// Line 18: cold path — called once at startup
// Lines 47-49: potential issue — returning null as JSON
`;

// === Build static diagnostic marks (simulating a linter) ===

const buildDiagnosticMarks = function buildDiagnosticMarks(): MarkSet {
  const builder = new MarkSetBuilder();

  // Warning on line 7 (0-indexed line 6): unused field
  builder.addLine(
    6,
    {
      background: "#4a3800",
      signBefore: "W",
    },
    { message: "maxConnections is declared but never used", severity: "warning" },
  );

  // Error on line 30 (0-indexed line 29): null assignment
  builder.addLine(
    29,
    {
      background: "#4a0000",
      signBefore: "E",
    },
    { message: "Variable 'users' should not be null — use an empty array", severity: "error" },
  );

  // Info on line 34 (0-indexed line 33): exposes config
  builder.addLine(
    33,
    {
      background: "#003040",
      signBefore: "I",
    },
    { message: "This endpoint exposes internal configuration", severity: "info" },
  );

  // Hint on line 38 (0-indexed line 37): 404 handler
  builder.addLine(
    37,
    {
      background: "#1a3a1a",
      signBefore: "H",
    },
    { message: "Consider adding a helpful 404 page", severity: "hint" },
  );

  return builder.build("diagnostics", MarkPriorities.DIAGNOSTIC);
};

// === Build static bookmark marks ===

const buildInitialBookmarks = function buildInitialBookmarks(): MarkSet {
  const builder = new MarkSetBuilder();

  // Pre-bookmark the main handler function and the server startup
  builder.addLine(16, { signBefore: "\u2691" });
  builder.addLine(42, { signBefore: "\u2691" });

  return builder.build("bookmarks", MarkPriorities.USER);
};

// === Streaming marks: simulate a slow analysis that adds marks over time ===

const streamContent = async function* streamContent(): AsyncIterable<ContentChunk> {
  // First, deliver the code content
  yield {
    data: SOURCE_CODE,
    format: "code",
    language: "typescript",
    type: "append",
  };

  // After a short delay, stream in "hot path" analysis marks
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const hotPathBuilder = new MarkSetBuilder();
  // Highlight the hot path range (handleRequest body, lines 17-39)
  hotPathBuilder.addRange(
    { line: 17 },
    { line: 39 },
    { gutterBackground: "#2a2a00" },
    { analysis: "hot path — called on every request" },
  );
  yield {
    set: hotPathBuilder.build("analysis:hotpath", 50),
    type: "marks",
  };

  // After another delay, stream in "coverage" marks
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const coverageBuilder = new MarkSetBuilder();
  // Mark uncovered lines (the TODO block)
  coverageBuilder.addRange(
    { line: 27 },
    { line: 31 },
    { gutterBackground: "#3a0000", signBefore: "\u00D7" },
    { covered: false },
  );
  // Mark well-covered lines
  coverageBuilder.addLine(20, { signBefore: "\u2713" }, { covered: true, hits: 1200 });
  coverageBuilder.addLine(24, { signBefore: "\u2713" }, { covered: true, hits: 800 });
  coverageBuilder.addLine(34, { signBefore: "\u2713" }, { covered: true, hits: 150 });

  yield {
    set: coverageBuilder.build("analysis:coverage", 75),
    type: "marks",
  };
};

// === Content provider: uses streaming to deliver content + marks ===

const contentProvider: ContentProvider = {
  load: () => streamContent(),
  // Static marks applied immediately when content loads
  marks: [buildDiagnosticMarks(), buildInitialBookmarks()],
  title: "server.ts — Custom Marks Demo",
};

// === User actions: toggle bookmarks and diagnostics via keybindings ===

// Track user-added bookmarks (line -> boolean)
const userBookmarks = new Set<number>();
const userDiagnostics = new Set<number>();

const rebuildUserBookmarks = function rebuildUserBookmarks(): MarkSet {
  const builder = new MarkSetBuilder();
  for (const line of userBookmarks) {
    builder.addLine(line, { background: "#1a1a3a", signBefore: "\u2605" });
  }
  return builder.build("user:bookmarks", MarkPriorities.USER + 10);
};

const rebuildUserDiagnostics = function rebuildUserDiagnostics(): MarkSet {
  const builder = new MarkSetBuilder();
  for (const line of userDiagnostics) {
    builder.addLine(line, { background: "#4a2800", signBefore: "!" });
  }
  return builder.build("user:diagnostics", MarkPriorities.USER + 5);
};

const actions: ActionDefinition[] = [
  {
    handler: (ctx) => {
      const line = ctx.document?.cursor;
      if (line == null) return;

      if (userBookmarks.has(line)) {
        userBookmarks.delete(line);
      } else {
        userBookmarks.add(line);
      }
      ctx.view.marks.setMarkSet(rebuildUserBookmarks());
      ctx.toast?.toast({
        id: "bookmark-toggle",
        level: "info",
        message: userBookmarks.has(line)
          ? `Bookmark added on line ${line + 1}`
          : `Bookmark removed from line ${line + 1}`,
      });
    },
    hotkey: "b",
    id: "marks.toggle-bookmark",
    modes: ["cursor"],
    title: "Toggle bookmark",
  },
  {
    handler: (ctx) => {
      const line = ctx.document?.cursor;
      if (line == null) return;

      if (userDiagnostics.has(line)) {
        userDiagnostics.delete(line);
      } else {
        userDiagnostics.add(line);
      }
      ctx.view.marks.setMarkSet(rebuildUserDiagnostics());
      ctx.toast?.toast({
        id: "diagnostic-toggle",
        level: "warning",
        message: userDiagnostics.has(line)
          ? `Diagnostic added on line ${line + 1}`
          : `Diagnostic removed from line ${line + 1}`,
      });
    },
    hotkey: "d",
    id: "marks.add-diagnostic",
    modes: ["cursor"],
    title: "Add diagnostic on line",
  },
  {
    handler: (ctx) => {
      userDiagnostics.clear();
      ctx.view.marks.clearNamespace("user:diagnostics");
      ctx.toast?.toast({ level: "info", message: "All user diagnostics cleared" });
    },
    hotkey: "D",
    id: "marks.clear-diagnostics",
    modes: ["cursor"],
    title: "Clear all diagnostics",
  },
  {
    handler: (ctx) => {
      userBookmarks.clear();
      ctx.view.marks.clearNamespace("user:bookmarks");
      ctx.toast?.toast({ level: "info", message: "All user bookmarks cleared" });
    },
    hotkey: "B",
    id: "marks.clear-bookmarks",
    modes: ["cursor"],
    title: "Clear all bookmarks",
  },
  {
    handler: (ctx) => {
      userBookmarks.clear();
      userDiagnostics.clear();
      ctx.view.marks.clearAll();
      ctx.toast?.toast({ level: "info", message: "All user marks cleared" });
    },
    hotkey: "x",
    id: "marks.clear-all",
    modes: ["cursor"],
    title: "Clear all user marks",
  },
];

// === Launch ===

launch({ actions, contentProvider });

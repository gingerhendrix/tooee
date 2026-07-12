import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  findNewDiagnosticCounts,
  findNewDiagnostics,
  mapInheritedLine,
  parseHunks,
} from "./check-staged-quality.ts";

const diagnostic = (line: number, message = "inherited", column?: number) => ({
  code: "test(rule)",
  filename: "sample.ts",
  labels: [{ span: { column, line } }],
  message,
});

describe("staged diagnostic comparison", () => {
  test("unchanged debt maps through inserted staged lines", () => {
    expect(mapInheritedLine(3, parseHunks("@@ -1,0 +2,1 @@\n+added\n"))).toBe(4);
  });

  test("inherited debt maps through a formatter line wrap", () => {
    expect(
      mapInheritedLine(176, [{ newCount: 66, newStart: 140, oldCount: 64, oldStart: 140 }]),
    ).toBe(177);
  });

  test("removed diagnostics need no staged match", () => {
    expect(findNewDiagnostics([diagnostic(1)], [], [], ".", ".")).toEqual([]);
  });

  test("explicit snapshots make unstaged files irrelevant", () => {
    expect(findNewDiagnostics([], [], [], "/does/not/exist", "/does/not/exist")).toEqual([]);
  });

  test("proven formatter output permits moved inherited diagnostics but not count growth", () => {
    expect(findNewDiagnosticCounts([diagnostic(1)], [diagnostic(20)])).toEqual([]);
    expect(findNewDiagnosticCounts([diagnostic(1)], [diagnostic(20), diagnostic(21)])).toEqual([
      diagnostic(21),
    ]);
  });

  test("consumes an unchanged span after an inserted preceding line", () => {
    const root = mkdtempSync(join(tmpdir(), "tooee-staged-quality-mapper-"));
    mkdirSync(join(root, "head"), { recursive: true });
    mkdirSync(join(root, "index"), { recursive: true });
    try {
      writeFileSync(join(root, "head/sample.ts"), "const ready = true;\n  run();\n");
      writeFileSync(join(root, "index/sample.ts"), "const ready = true;\ninserted();\n  run();\n");
      const inherited = {
        code: "test(rule)",
        filename: "sample.ts",
        labels: [{ span: { column: 3, line: 2, length: 5, offset: 22 } }],
        message: "inherited",
      };
      const staged = {
        ...inherited,
        labels: [{ span: { column: 3, line: 3, length: 5, offset: 42 } }],
      };
      expect(
        findNewDiagnostics(
          [inherited],
          [staged],
          [
            {
              headPath: "sample.ts",
              indexPath: "sample.ts",
              hunks: [{ oldCount: 0, oldStart: 2, newCount: 1, newStart: 2 }],
            },
          ],
          join(root, "head"),
          join(root, "index"),
        ),
      ).toEqual([]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test("consumes unchanged-line span drift after a later edit", () => {
    const root = mkdtempSync(join(tmpdir(), "tooee-staged-quality-mapper-"));
    mkdirSync(join(root, "head"), { recursive: true });
    mkdirSync(join(root, "index"), { recursive: true });
    try {
      writeFileSync(join(root, "head/sample.ts"), "const ready = true;\n  run();\n");
      writeFileSync(join(root, "index/sample.ts"), "const ready = true;\ninserted();\n  run();\n");
      const inherited = {
        code: "test(rule)",
        filename: "sample.ts",
        labels: [{ span: { column: 3, line: 2, length: 5, offset: 22 } }],
        message: "inherited",
      };
      const staged = {
        ...inherited,
        labels: [{ span: { column: 7, line: 3, length: 9, offset: 42 } }],
      };
      expect(
        findNewDiagnostics(
          [inherited],
          [staged],
          [
            {
              headPath: "sample.ts",
              indexPath: "sample.ts",
              hunks: [{ oldCount: 0, oldStart: 2, newCount: 1, newStart: 2 }],
            },
          ],
          join(root, "head"),
          join(root, "index"),
        ),
      ).toEqual([]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test.each([
    ["curly", "Expected a block statement."],
    ["typescript(no-invalid-void-type)", "Remove `void` from this union type constituent."],
    ["eslint(no-lonely-if)", "Unexpected `if` as the only statement in an `else` block"],
  ])("does not misattribute a changed %s span", (code, message) => {
    const root = mkdtempSync(join(tmpdir(), "tooee-staged-quality-mapper-"));
    mkdirSync(join(root, "head"), { recursive: true });
    mkdirSync(join(root, "index"), { recursive: true });
    try {
      writeFileSync(join(root, "head/sample.ts"), "const ready = true;\n  run();\n");
      writeFileSync(
        join(root, "index/sample.ts"),
        "const ready = true;\ninserted();\n    run();\n",
      );
      const inherited = {
        code,
        filename: "sample.ts",
        labels: [{ span: { column: 3, line: 2, length: 5, offset: 22 } }],
        message,
      };
      const staged = {
        code,
        filename: "sample.ts",
        labels: [{ span: { column: 5, line: 3, length: 5, offset: 42 } }],
        message,
      };
      expect(
        findNewDiagnostics(
          [inherited],
          [staged],
          [
            {
              headPath: "sample.ts",
              indexPath: "sample.ts",
              hunks: [{ oldCount: 1, oldStart: 2, newCount: 2, newStart: 2 }],
            },
          ],
          join(root, "head"),
          join(root, "index"),
        ),
      ).toEqual([staged]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("staged snapshot integration", () => {
  let root = "";
  afterEach(() => {
    if (root) rmSync(root, { force: true, recursive: true });
  });

  const command = (args: string[]) =>
    Bun.spawnSync(args, { cwd: root, stderr: "pipe", stdout: "pipe" });
  const write = (path: string, content: string) => Bun.write(join(root, path), content);
  const stage = (content: string) => {
    write("sample.ts", content);
    expect(command(["git", "add", "sample.ts"]).exitCode).toBe(0);
  };
  const check = () => command(["bun", resolve("scripts/check-staged-quality.ts")]);

  const setupRepository = () => {
    root = mkdtempSync(join(tmpdir(), "tooee-staged-quality-test-"));
    mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
    write(
      "node_modules/.bin/oxlint",
      `#!/usr/bin/env bun
const paths = process.argv.slice(2).filter((value) => value.endsWith(".ts"));
const diagnostics = [];
for (const path of paths) {
  const lines = (await Bun.file(path).text()).split("\\n");
  for (const [index, line] of lines.entries()) {
    for (const [marker, message] of [["DEBT", "DEBT"], ["NEW", "NEW"], ["SAME", "DEBT"]]) if (line.includes(marker)) diagnostics.push({ code: "test(rule)", filename: path, labels: [{ span: { line: index + 1 } }], message });
  }
}
console.log(JSON.stringify({ diagnostics }));
process.exit(diagnostics.length ? 1 : 0);
`,
    );
    write(
      "node_modules/.bin/oxfmt",
      `#!/usr/bin/env bun
for (const path of process.argv.slice(2).filter((value) => !value.startsWith("-"))) {
  const source = await Bun.file(path).text();
  if (source.includes("BADFMT")) await Bun.write(path, source.replaceAll("BADFMT", "formatted"));
}
`,
    );
    chmodSync(join(root, "node_modules/.bin/oxlint"), 0o755);
    chmodSync(join(root, "node_modules/.bin/oxfmt"), 0o755);
    write("sample.ts", "DEBT\nBADFMT\n");
    expect(command(["git", "init", "-q"]).exitCode).toBe(0);
    expect(command(["git", "config", "user.email", "test@example.com"]).exitCode).toBe(0);
    expect(command(["git", "config", "user.name", "Test"]).exitCode).toBe(0);
    expect(command(["git", "add", "sample.ts"]).exitCode).toBe(0);
    expect(command(["git", "commit", "-qm", "fixture"]).exitCode).toBe(0);
  };

  test("unchanged debt and removed diagnostics pass", () => {
    setupRepository();
    stage("added\nDEBT\nBADFMT\n");
    expect(check().exitCode).toBe(0);
    stage("added\nBADFMT\n");
    expect(check().exitCode).toBe(0);
  });

  test("formatter wrapping shifts inherited debt without making it new", () => {
    setupRepository();
    stage("wrapped prefix\n  DEBT\nBADFMT\n");
    expect(check().exitCode).toBe(0);
  });

  test("a genuinely new diagnostic fails", () => {
    setupRepository();
    stage("DEBT\nNEW\nBADFMT\n");
    const result = check();
    expect(result.stderr.toString()).toContain("new test(rule)");
    expect(result.exitCode).toBe(1);
  });

  test("a new same-rule and same-message location fails", () => {
    setupRepository();
    stage("DEBT\nSAME\nBADFMT\n");
    expect(check().exitCode).toBe(1);
  });

  test("formatter punctuation maps inherited content by occurrence", () => {
    setupRepository();
    stage("DEBT;\nBADFMT\n");
    expect(check().exitCode).toBe(0);
  });

  test("unchanged duplicate content keeps its exact location", () => {
    setupRepository();
    stage("DEBT\nBADFMT;\n");
    expect(check().exitCode).toBe(0);
  });

  test("unstaged diagnostics do not affect the staged snapshot", () => {
    setupRepository();
    stage("added\nDEBT\nBADFMT\n");
    write("sample.ts", "added\nDEBT\nNEW\nBADFMT\n");
    expect(check().exitCode).toBe(0);
  });

  test("formatting regressions in staged lines fail", () => {
    setupRepository();
    stage("DEBT\nBADFMT\nclean\nBADFMT\n");
    expect(check().exitCode).toBe(1);
  });

  test("empty, renamed, deleted, and added file sets are safe", () => {
    setupRepository();
    expect(check().exitCode).toBe(0);
    expect(command(["git", "mv", "sample.ts", "renamed.ts"]).exitCode).toBe(0);
    const renamed = check();
    expect(`${renamed.stdout.toString()}${renamed.stderr.toString()}`).not.toContain(
      "new test(rule)",
    );
    expect(renamed.exitCode).toBe(0);
    expect(command(["git", "commit", "-qm", "rename"]).exitCode).toBe(0);
    expect(command(["git", "rm", "-q", "renamed.ts"]).exitCode).toBe(0);
    expect(check().exitCode).toBe(0);
    expect(command(["git", "commit", "-qm", "delete"]).exitCode).toBe(0);
    write("added.ts", "clean\n");
    expect(command(["git", "add", "added.ts"]).exitCode).toBe(0);
    expect(check().exitCode).toBe(0);
  });
});

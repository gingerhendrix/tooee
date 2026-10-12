import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { listFileCandidates } from "../file-candidates.js";

const write = function write(root: string, file: string, text = "x"): void {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};

describe("listFileCandidates", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-files-"));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  test("outside Git, walks the tree and skips hidden entries, node_modules, and spaces", async () => {
    write(dir, "b.md");
    write(dir, "src/a.ts");
    write(dir, ".env");
    write(dir, ".cache/x.txt");
    write(dir, "node_modules/pkg/index.js");
    write(dir, "my notes.txt");

    expect(await listFileCandidates(dir)).toEqual(["b.md", "src/a.ts"]);
  });

  test("in a Git work tree, lists tracked and untracked files that Git does not ignore", async () => {
    execFileSync("git", ["init", "--quiet"], { cwd: dir });
    write(dir, ".gitignore", "dist/\n");
    write(dir, "dist/out.js");
    write(dir, "src/a.ts");
    write(dir, ".github/ci.yml");

    expect(await listFileCandidates(dir)).toEqual([".github/ci.yml", ".gitignore", "src/a.ts"]);
  });
});

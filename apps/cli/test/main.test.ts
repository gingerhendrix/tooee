import { describe, expect, test } from "bun:test";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CLI = path.resolve(REPO_ROOT, "apps/cli/src/main.ts");

const runCli = function runCli(...args: string[]) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "--conditions=@tooee/source", CLI, ...args],
    cwd: REPO_ROOT,
    stderr: "pipe",
    stdout: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
};

describe("tooee command surface", () => {
  test("help advertises table rendering only through view", () => {
    const result = runCli("--help");

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("tooee view --renderer table data.csv");
    expect(result.stdout).not.toContain("table [file]");
    expect(result.stdout).not.toContain("tooee table data.csv");
  });

  test("table is no longer a command", () => {
    const result = runCli("table");

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command: table");
    expect(result.stdout).not.toContain("table [file]");
  });
});

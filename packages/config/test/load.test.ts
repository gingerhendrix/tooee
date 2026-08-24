import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "../src/load.js";

const originalCwd = process.cwd();
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
let tempRoot = "";
let globalConfigHome = "";

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "tooee-config-"));
  globalConfigHome = path.join(tempRoot, "global");
  process.env.XDG_CONFIG_HOME = globalConfigHome;
});

afterEach(() => {
  process.chdir(originalCwd);
  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
  }
  rmSync(tempRoot, { force: true, recursive: true });
});

const writeConfig = function writeConfig(configPath: string, value: unknown): void {
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(value));
};

describe("view.diffLayout config loading", () => {
  test("loads split from the isolated global config", () => {
    writeConfig(path.join(globalConfigHome, "tooee", "config.json"), {
      view: { diffLayout: "split" },
    });
    process.chdir(tempRoot);

    expect(loadConfig().view?.diffLayout).toBe("split");
  });

  test("lets an isolated project config override the global layout", () => {
    writeConfig(path.join(globalConfigHome, "tooee", "config.json"), {
      view: { diffLayout: "split" },
    });
    const project = path.join(tempRoot, "project");
    writeConfig(path.join(project, ".tooee", "config.json"), {
      view: { diffLayout: "stack" },
    });
    process.chdir(project);

    expect(loadConfig().view?.diffLayout).toBe("stack");
  });

  test("ignores invalid persisted layouts", () => {
    writeConfig(path.join(globalConfigHome, "tooee", "config.json"), {
      view: { diffLayout: "sideways", gutter: true },
    });
    process.chdir(tempRoot);

    expect(loadConfig().view).toEqual({ gutter: true });
  });
});

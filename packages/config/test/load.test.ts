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

/** Write a config document verbatim, so tests can also write invalid JSON. */
const writeConfigText = function writeConfigText(configPath: string, text: string): void {
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, text);
};

const globalConfigPath = function globalConfigPath(): string {
  return path.join(globalConfigHome, "tooee", "config.json");
};

describe("view.diffLayout config loading", () => {
  test("loads split from the isolated global config", () => {
    writeConfigText(globalConfigPath(), JSON.stringify({ view: { diffLayout: "split" } }));
    process.chdir(tempRoot);

    expect(loadConfig().view?.diffLayout).toBe("split");
  });

  test("lets an isolated project config override the global layout", () => {
    writeConfigText(globalConfigPath(), JSON.stringify({ view: { diffLayout: "split" } }));
    const project = path.join(tempRoot, "project");
    writeConfigText(
      path.join(project, ".tooee", "config.json"),
      JSON.stringify({ view: { diffLayout: "stack" } }),
    );
    process.chdir(project);

    expect(loadConfig().view?.diffLayout).toBe("stack");
  });

  test("ignores invalid persisted layouts", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({ view: { diffLayout: "sideways", gutter: true } }),
    );
    process.chdir(tempRoot);

    expect(loadConfig().view).toEqual({ gutter: true });
  });
});

describe("config document decoding", () => {
  test("decodes every documented field", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({
        keys: { "view.quit": "q", "view.search": "/" },
        theme: { mode: "light", name: "gruvbox" },
        view: { copyOnSelect: "primary", diffLayout: "split", gutter: false, wrap: true },
      }),
    );
    process.chdir(tempRoot);

    expect(loadConfig()).toEqual({
      keys: { "view.quit": "q", "view.search": "/" },
      theme: { mode: "light", name: "gruvbox" },
      view: { copyOnSelect: "primary", diffLayout: "split", gutter: false, wrap: true },
    });
  });

  test("falls back to the defaults when the document root is not an object", () => {
    process.chdir(tempRoot);
    const defaults = loadConfig();

    for (const text of ['["theme"]', '"theme"', "42", "null"]) {
      writeConfigText(globalConfigPath(), text);
      expect(loadConfig()).toEqual(defaults);
    }
  });

  test("falls back to the defaults when the document is not JSON", () => {
    process.chdir(tempRoot);
    const defaults = loadConfig();
    writeConfigText(globalConfigPath(), "{ not json");

    expect(loadConfig()).toEqual(defaults);
  });

  test("drops fields with the wrong representation but keeps the section", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({
        theme: { mode: "blue", name: 5 },
        view: { copyOnSelect: "sometimes", diffLayout: 1, gutter: "yes", wrap: null },
      }),
    );
    process.chdir(tempRoot);

    const config = loadConfig();
    expect(config.theme).toEqual({ mode: "dark", name: "tokyonight" });
    expect(config.view).toEqual({});
  });

  test("drops a section that is not an object", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({ keys: ["q"], theme: "gruvbox", view: null }),
    );
    process.chdir(tempRoot);

    const config = loadConfig();
    expect(config.theme).toEqual({ mode: "dark", name: "tokyonight" });
    expect(config.keys).toBeUndefined();
    expect(config.view).toBeUndefined();
  });

  test("rejects the whole keys map when one value is not a string", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({ keys: { "view.quit": "q", "view.search": 1 } }),
    );
    process.chdir(tempRoot);

    expect(loadConfig().keys).toBeUndefined();
  });

  test("merges theme fields across layers instead of replacing the section", () => {
    writeConfigText(
      globalConfigPath(),
      JSON.stringify({ theme: { mode: "light", name: "gruvbox" } }),
    );
    const project = path.join(tempRoot, "project");
    writeConfigText(
      path.join(project, ".tooee", "config.json"),
      JSON.stringify({ theme: { mode: "dark" } }),
    );
    process.chdir(project);

    expect(loadConfig().theme).toEqual({ mode: "dark", name: "gruvbox" });
  });
});

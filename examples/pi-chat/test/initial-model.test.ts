import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { defaultModelRef, loadReadOnlySettings, pickInitialModel } from "../initial-model.js";

const models = [
  { id: "gpt-x", provider: "openai-codex" },
  { id: "google/gemini-3.6-flash", provider: "openrouter" },
];

describe("pickInitialModel", () => {
  test("prefers the settings default when it is available", () => {
    const preferred = { id: "google/gemini-3.6-flash", provider: "openrouter" };

    expect(pickInitialModel(models, preferred)).toBe(models[1]);
  });

  test("falls back to the first available model", () => {
    expect(pickInitialModel(models, { id: "gone", provider: "openrouter" })).toBe(models[0]);
    expect(pickInitialModel(models)).toBe(models[0]);
  });

  test("returns undefined when no model is available", () => {
    const none: typeof models = [];

    expect(pickInitialModel(none)).toBeUndefined();
  });
});

describe("loadReadOnlySettings", () => {
  let dir = "";

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  test("reads the default model and drops writes", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-settings-"));
    const settingsPath = path.join(dir, "settings.json");
    const original = JSON.stringify({ defaultModel: "m1", defaultProvider: "p1" });
    writeFileSync(settingsPath, original);

    const settings = loadReadOnlySettings(settingsPath);

    expect(defaultModelRef(settings)).toEqual({ id: "m1", provider: "p1" });

    settings.setDefaultModelAndProvider("p2", "m2");
    await settings.flush();

    expect(readFileSync(settingsPath, "utf-8")).toBe(original);
  });

  test("a missing settings file gives no default", () => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-settings-"));

    const settings = loadReadOnlySettings(path.join(dir, "settings.json"));

    expect(defaultModelRef(settings)).toBeUndefined();
  });
});

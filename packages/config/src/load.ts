import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { TooeeConfig } from "./types.js";

const DEFAULTS: TooeeConfig = {
  theme: {
    mode: "dark",
    name: "tokyonight",
  },
};

const isRecord = function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readStringRecord = function readStringRecord(
  value: unknown,
): Record<string, string> | undefined {
  if (!isRecord(value) || Object.values(value).some((entry) => typeof entry !== "string")) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
};

const validateConfig = function validateConfig(value: unknown): Partial<TooeeConfig> {
  if (!isRecord(value)) {
    return {};
  }

  const config: Partial<TooeeConfig> = {};
  if (isRecord(value.theme)) {
    const theme: NonNullable<TooeeConfig["theme"]> = {};
    if (typeof value.theme.name === "string") {
      theme.name = value.theme.name;
    }
    if (value.theme.mode === "dark" || value.theme.mode === "light") {
      theme.mode = value.theme.mode;
    }
    config.theme = theme;
  }
  const keys = readStringRecord(value.keys);
  if (keys !== undefined) {
    config.keys = keys;
  }
  if (isRecord(value.view)) {
    const view: NonNullable<TooeeConfig["view"]> = {};
    if (typeof value.view.wrap === "boolean") {
      view.wrap = value.view.wrap;
    }
    if (typeof value.view.gutter === "boolean") {
      view.gutter = value.view.gutter;
    }
    if (
      typeof value.view.copyOnSelect === "boolean" ||
      value.view.copyOnSelect === "primary" ||
      value.view.copyOnSelect === "clipboard"
    ) {
      view.copyOnSelect = value.view.copyOnSelect;
    }
    config.view = view;
  }
  return config;
};

const mergeConfig = function mergeConfig(
  target: Partial<TooeeConfig>,
  source: Partial<TooeeConfig>,
): TooeeConfig {
  return {
    ...target,
    ...source,
    ...(target.theme === undefined && source.theme === undefined
      ? {}
      : { theme: { ...target.theme, ...source.theme } }),
    ...(target.keys === undefined && source.keys === undefined
      ? {}
      : { keys: { ...target.keys, ...source.keys } }),
    ...(target.view === undefined && source.view === undefined
      ? {}
      : { view: { ...target.view, ...source.view } }),
  };
};

const readJsonFile = function readJsonFile(configPath: string): Partial<TooeeConfig> {
  try {
    if (!existsSync(configPath)) {
      return {};
    }
    const parsed: unknown = JSON.parse(readFileSync(configPath, "utf-8"));
    return validateConfig(parsed);
  } catch {
    return {};
  }
};

const getGlobalConfigPath = function getGlobalConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? "", ".config");
  return path.join(xdg, "tooee", "config.json");
};

const findProjectConfig = function findProjectConfig(): Partial<TooeeConfig> {
  let dir = process.cwd();
  const seen = new Set<string>();
  while (dir && !seen.has(dir)) {
    seen.add(dir);
    const configPath = path.join(dir, ".tooee", "config.json");
    if (existsSync(configPath)) {
      return readJsonFile(configPath);
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return {};
};

export const loadConfig = function loadConfig(overrides?: Partial<TooeeConfig>): TooeeConfig {
  let config: TooeeConfig = { ...DEFAULTS };
  config = mergeConfig(config, readJsonFile(getGlobalConfigPath()));
  config = mergeConfig(config, findProjectConfig());
  if (overrides) {
    config = mergeConfig(config, overrides);
  }
  return config;
};

export const writeGlobalConfig = function writeGlobalConfig(partial: Partial<TooeeConfig>): void {
  const configPath = getGlobalConfigPath();
  const dir = path.dirname(configPath);
  try {
    const existing = readJsonFile(configPath);
    const merged = mergeConfig(existing, partial);
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`);
  } catch {
    // ignore write errors
  }
};

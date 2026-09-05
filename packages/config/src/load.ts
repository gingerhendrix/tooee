import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { TooeeConfig } from "./types.js";

const DEFAULTS: TooeeConfig = {
  theme: {
    mode: "dark",
    name: "tokyonight",
  },
};

// ---------------------------------------------------------------------------
// JSON boundary
// ---------------------------------------------------------------------------

/** The JSON grammar, exactly as `JSON.parse` produces it without a reviver. */
type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;

/** A JSON object. A key that is absent from the document reads as `undefined`. */
interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

const parseJsonDocument = function parseJsonDocument(text: string): JsonValue {
  // SAFETY: `JSON.parse` without a reviver produces only the JSON grammar: strings,
  // finite numbers, booleans, null, arrays, and plain objects. `JsonValue` is that
  // grammar, so the assertion restates the parser's own contract and narrows nothing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse is typed `any`; the SAFETY note above states the invariant
  return JSON.parse(text) as JsonValue;
};

const isJsonObject = function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value instanceof Object && !Array.isArray(value);
};

const isJsonString = function isJsonString(value: JsonValue | undefined): value is string {
  // The config decoder is the one place that inspects a JSON value's representation;
  // every caller branches on the decoded domain value instead.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive check inside the boundary decoder
  return typeof value === "string";
};

// ---------------------------------------------------------------------------
// Config decoding
// ---------------------------------------------------------------------------

type ThemeSettings = NonNullable<TooeeConfig["theme"]>;
type ViewSettings = NonNullable<TooeeConfig["view"]>;

const decodeTheme = function decodeTheme(json: JsonObject): ThemeSettings {
  const theme: ThemeSettings = {};
  const { mode, name } = json;
  if (isJsonString(name)) {
    theme.name = name;
  }
  if (mode === "dark" || mode === "light") {
    theme.mode = mode;
  }
  return theme;
};

/** Every value must be a string; one wrong value rejects the whole map. */
const decodeKeys = function decodeKeys(json: JsonObject): TooeeConfig["keys"] {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(json)) {
    if (!isJsonString(value)) {
      return undefined;
    }
    entries.push([key, value]);
  }
  return Object.fromEntries(entries);
};

const decodeView = function decodeView(json: JsonObject): ViewSettings {
  const view: ViewSettings = {};
  const { copyOnSelect, diffLayout, gutter, wrap } = json;
  if (wrap === true || wrap === false) {
    view.wrap = wrap;
  }
  if (gutter === true || gutter === false) {
    view.gutter = gutter;
  }
  if (diffLayout === "split" || diffLayout === "stack") {
    view.diffLayout = diffLayout;
  }
  if (
    copyOnSelect === true ||
    copyOnSelect === false ||
    copyOnSelect === "primary" ||
    copyOnSelect === "clipboard"
  ) {
    view.copyOnSelect = copyOnSelect;
  }
  return view;
};

/**
 * Decode one config document. A section that is present as an object is kept
 * even when none of its fields decode, so `{ "view": {} }` yields `view: {}`;
 * a section with the wrong representation is dropped as if it were absent.
 */
const decodeConfig = function decodeConfig(json: JsonValue): Partial<TooeeConfig> {
  if (!isJsonObject(json)) {
    return {};
  }
  const config: Partial<TooeeConfig> = {};
  const { keys, theme, view } = json;
  if (isJsonObject(theme)) {
    config.theme = decodeTheme(theme);
  }
  if (isJsonObject(keys)) {
    const decodedKeys = decodeKeys(keys);
    if (decodedKeys !== undefined) {
      config.keys = decodedKeys;
    }
  }
  if (isJsonObject(view)) {
    config.view = decodeView(view);
  }
  return config;
};

// ---------------------------------------------------------------------------
// Layering
// ---------------------------------------------------------------------------

const mergeConfig = function mergeConfig(
  target: Partial<TooeeConfig>,
  source: Partial<TooeeConfig>,
): TooeeConfig {
  const merged: TooeeConfig = { ...target, ...source };
  if (target.theme !== undefined || source.theme !== undefined) {
    merged.theme = { ...target.theme, ...source.theme };
  }
  if (target.keys !== undefined || source.keys !== undefined) {
    merged.keys = { ...target.keys, ...source.keys };
  }
  if (target.view !== undefined || source.view !== undefined) {
    merged.view = { ...target.view, ...source.view };
  }
  return merged;
};

const readJsonFile = function readJsonFile(configPath: string): Partial<TooeeConfig> {
  try {
    if (!existsSync(configPath)) {
      return {};
    }
    return decodeConfig(parseJsonDocument(readFileSync(configPath, "utf-8")));
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

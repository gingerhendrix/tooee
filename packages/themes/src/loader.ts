import type { SyntaxStyle } from "@opentui/core";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { ColorMode } from "@tooee/config";
import { resolveTheme } from "./types.js";
import type { ThemeJSON, ResolvedTheme } from "./types.js";
import { buildSyntaxStyle } from "./syntax-rules.js";

// ---------------------------------------------------------------------------
// Theme loading
// ---------------------------------------------------------------------------

export interface Theme {
  name: string;
  mode: ColorMode;
  colors: ResolvedTheme;
  syntax: SyntaxStyle;
}

/** Cache of loaded theme JSONs by name */
const themeJsonCache = new Map<string, ThemeJSON>();

const loadJsonThemesFromDir = function loadJsonThemesFromDir(
  dir: string,
  target: Map<string, ThemeJSON>,
) {
  try {
    if (!existsSync(dir)) {
      return;
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const name = path.basename(file, ".json");
      try {
        const content = readFileSync(path.join(dir, file), "utf-8");
        // SAFETY: the file is not validated here on purpose. Its only consumer is
        // `resolveTheme`, which reads each key with a per-key fallback, and
        // `buildTheme` catches every malformed value and returns the hardcoded
        // theme, so a document that is not a ThemeJSON cannot escape this module.
        // A strict decoder would also drop malformed files from `getThemeNames`,
        // which is a behaviour change reserved for a separate decision.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- tolerant consumer boundary; see the SAFETY note
        target.set(name, JSON.parse(content) as ThemeJSON);
      } catch {
        // skip invalid files
      }
    }
  } catch {
    // dir not readable
  }
};

/** Load all bundled themes from packages/themes/themes/ */
const loadBundledThemes = function loadBundledThemes(): Map<string, ThemeJSON> {
  if (themeJsonCache.size > 0) {
    return themeJsonCache;
  }

  // Bundled themes
  const bundledDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "themes");
  loadJsonThemesFromDir(bundledDir, themeJsonCache);

  // XDG config: ~/.config/tooee/themes/
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? "", ".config");
  loadJsonThemesFromDir(path.join(xdgConfig, "tooee", "themes"), themeJsonCache);

  // Project-local: search upward for .tooee/themes/
  let dir = process.cwd();
  const seen = new Set<string>();
  while (dir && !seen.has(dir)) {
    seen.add(dir);
    loadJsonThemesFromDir(path.join(dir, ".tooee", "themes"), themeJsonCache);
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return themeJsonCache;
};

export const loadThemes = function loadThemes(): Map<string, ThemeJSON> {
  return loadBundledThemes();
};

export const getThemeNames = function getThemeNames(): string[] {
  return [...loadThemes().keys()].toSorted();
};

// ---------------------------------------------------------------------------
// Default theme
// ---------------------------------------------------------------------------

export const DEFAULT_THEME_NAME = "tokyonight";
export const DEFAULT_MODE: ColorMode = "dark";

// SAFETY: this package owns the bundled theme document. resolveTheme validates
// every consumed color and fills every omitted key from FALLBACKS.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- trusted package-owned JSON boundary
const bundledDefaultThemeJson = JSON.parse(
  readFileSync(new URL("../themes/tokyonight.json", import.meta.url), "utf-8"),
) as ThemeJSON;

const buildBundledDefaultTheme = function buildBundledDefaultTheme(mode: ColorMode): Theme {
  const colors = resolveTheme(bundledDefaultThemeJson, mode);
  return { colors, mode, name: DEFAULT_THEME_NAME, syntax: buildSyntaxStyle(colors) };
};

export const defaultTheme: Theme = buildBundledDefaultTheme(DEFAULT_MODE);

export const buildTheme = function buildTheme(name: string, mode: ColorMode): Theme {
  const themes = loadThemes();
  const json = themes.get(name);
  if (!json) {
    // Fall back to tokyonight, then first available, then the bundled default.
    const fallbackJson = themes.get(DEFAULT_THEME_NAME) ?? themes.values().next().value;
    if (fallbackJson) {
      const resolved = resolveTheme(fallbackJson, mode);
      return { colors: resolved, mode, name, syntax: buildSyntaxStyle(resolved) };
    }
    return buildBundledDefaultTheme(mode);
  }
  try {
    const resolved = resolveTheme(json, mode);
    return { colors: resolved, mode, name, syntax: buildSyntaxStyle(resolved) };
  } catch {
    return buildBundledDefaultTheme(mode);
  }
};

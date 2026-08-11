import type { HunkDiffThemeName } from "hunkdiff/opentui";
import type { ResolvedTheme } from "@tooee/themes";

/**
 * Hunk resolves one of its own bundled palettes by name; it accepts no custom
 * colour table, so a Tooee theme is matched to the closest bundled Hunk theme
 * rather than reproduced exactly.
 *
 * Every Tooee theme ships both a light and a dark variant, and which one is
 * active depends on the terminal, so each entry names a Hunk theme per variant
 * and the resolved background decides between them.
 */
export interface HunkThemePair {
  dark: HunkDiffThemeName;
  light: HunkDiffThemeName;
}

const GITHUB: HunkThemePair = { dark: "github-dark", light: "github-light" };

/** Closest bundled Hunk theme for each theme shipped with `@tooee/themes`. */
export const HUNK_THEME_MAP: Record<string, HunkThemePair> = {
  aura: { dark: "laserwave", light: "min-light" },
  ayu: { dark: "ayu-dark", light: "ayu-light" },
  catppuccin: { dark: "catppuccin-mocha", light: "catppuccin-latte" },
  "catppuccin-frappe": { dark: "catppuccin-frappe", light: "catppuccin-latte" },
  "catppuccin-macchiato": { dark: "catppuccin-macchiato", light: "catppuccin-latte" },
  cobalt2: { dark: "dark-plus", light: "light-plus" },
  cursor: { dark: "vitesse-dark", light: "vitesse-light" },
  dracula: { dark: "dracula", light: "min-light" },
  everforest: { dark: "everforest-dark", light: "everforest-light" },
  flexoki: { dark: "vitesse-dark", light: "vitesse-light" },
  github: GITHUB,
  "github-light": { dark: "github-dark", light: "github-light" },
  gruvbox: { dark: "gruvbox-dark-medium", light: "gruvbox-light-medium" },
  kanagawa: { dark: "kanagawa-wave", light: "kanagawa-lotus" },
  "lucent-orng": { dark: "vesper", light: "min-light" },
  material: { dark: "material-theme", light: "material-theme-lighter" },
  matrix: { dark: "vitesse-black", light: "min-light" },
  mercury: { dark: "min-dark", light: "min-light" },
  monokai: { dark: "monokai", light: "min-light" },
  nightowl: { dark: "night-owl", light: "night-owl-light" },
  nord: { dark: "nord", light: "min-light" },
  "one-dark": { dark: "one-dark-pro", light: "one-light" },
  opencode: { dark: "vitesse-dark", light: "vitesse-light" },
  "opencode-light": { dark: "vitesse-dark", light: "vitesse-light" },
  orng: { dark: "vesper", light: "min-light" },
  "osaka-jade": { dark: "everforest-dark", light: "everforest-light" },
  palenight: { dark: "material-theme-palenight", light: "material-theme-lighter" },
  rosepine: { dark: "rose-pine", light: "rose-pine-dawn" },
  solarized: { dark: "solarized-dark", light: "solarized-light" },
  synthwave84: { dark: "synthwave-84", light: "min-light" },
  tokyonight: { dark: "tokyo-night", light: "min-light" },
  vercel: { dark: "vitesse-black", light: "vitesse-light" },
  vesper: { dark: "vesper", light: "min-light" },
  zenburn: { dark: "gruvbox-dark-soft", light: "gruvbox-light-soft" },
};

const HEX_COLOR = /^#(?<digits>[0-9a-f]{3}|[0-9a-f]{6})$/iu;
/** Rec. 601 luma above this counts as a light background. */
const LIGHT_LUMA = 128;

/** `true` when `color` is a hex colour bright enough to read as a light background. */
export const isLightBackground = function isLightBackground(color: string): boolean {
  const digits = HEX_COLOR.exec(color.trim())?.groups?.digits;
  if (digits === undefined) {
    // Named or transparent backgrounds carry no brightness: assume dark.
    return false;
  }
  // #abc expands to #aabbcc; the pattern only ever matches ASCII hex digits.
  const full = digits.length === 3 ? digits.replaceAll(/[0-9a-f]/giu, "$&$&") : digits;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > LIGHT_LUMA;
};

/**
 * The bundled Hunk theme to render a diff with. Unmapped themes (user themes
 * from `~/.config/tooee/themes`) fall back to GitHub's palette on the same
 * light/dark side as the active theme's background.
 */
export const resolveHunkDiffTheme = function resolveHunkDiffTheme(
  themeName: string,
  theme: ResolvedTheme,
): HunkDiffThemeName {
  const pair = HUNK_THEME_MAP[themeName] ?? GITHUB;
  return isLightBackground(theme.background) ? pair.light : pair.dark;
};

/**
 * Map the active Tooee theme onto termcn's ThemeProvider tokens, so the live
 * demos follow the Tooee theme picker. The token shape mirrors termcn's
 * `registry/bases/opentui/ui/types.ts` (Theme), which stays in vendor/.
 */

import type { ResolvedTheme } from "@tooee/themes";

export interface TermcnColorTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  focusRing: string;
  selection: string;
  selectionForeground: string;
}

export interface TermcnTheme {
  name: string;
  colors: TermcnColorTokens;
  spacing: { 0: number; 1: number; 2: number; 3: number; 4: number; 6: number; 8: number };
  typography: { bold: boolean; sm: string; base: string; lg: string; xl: string };
  border: { style: "single" | "double" | "rounded" | "heavy"; color: string; focusColor: string };
}

/** termcn tokens for a Tooee theme. Foregrounds on filled colors use the Tooee background. */
export const toTermcnTheme = function toTermcnTheme(
  name: string,
  theme: ResolvedTheme
): TermcnTheme {
  const onFill = theme.background;

  return {
    border: { color: theme.border, focusColor: theme.borderActive, style: "rounded" },
    colors: {
      accent: theme.accent,
      accentForeground: onFill,
      background: theme.background,
      border: theme.border,
      error: theme.error,
      errorForeground: onFill,
      focusRing: theme.borderActive,
      foreground: theme.text,
      info: theme.info,
      infoForeground: onFill,
      muted: theme.backgroundElement,
      mutedForeground: theme.textMuted,
      primary: theme.primary,
      primaryForeground: onFill,
      secondary: theme.secondary,
      secondaryForeground: onFill,
      selection: theme.selection,
      selectionForeground: theme.text,
      success: theme.success,
      successForeground: onFill,
      warning: theme.warning,
      warningForeground: onFill,
    },
    name: `tooee-${name}`,
    spacing: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 6: 6, 8: 8 },
    typography: { base: "", bold: true, lg: "bold", sm: "dim", xl: "bold" },
  };
};

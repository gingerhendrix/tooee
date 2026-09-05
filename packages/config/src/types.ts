export type ColorMode = "dark" | "light";

/** @deprecated Use `ColorMode` instead. */
export type Mode = ColorMode;

export interface TooeeConfig {
  theme?: {
    name?: string;
    mode?: ColorMode;
  };
  keys?: Record<string, string>;
  view?: {
    wrap?: boolean;
    gutter?: boolean;
    copyOnSelect?: boolean | "primary" | "clipboard";
    /** Initial layout for diff content. Defaults to "stack" (unified). */
    diffLayout?: "split" | "stack";
  };
}

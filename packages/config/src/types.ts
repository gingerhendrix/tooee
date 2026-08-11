export type Mode = "dark" | "light";

export interface TooeeConfig {
  theme?: {
    name?: string;
    mode?: Mode;
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

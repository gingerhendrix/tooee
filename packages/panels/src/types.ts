import type { ReactNode } from "react";
import type { BoxProps } from "@opentui/react";
import type { Mode } from "@tooee/commands";

/** Switch shortcuts for a panel group. Set the whole prop to `null` to disable built-in switching. */
export interface PanelSwitchKeys {
  /** Hotkey for "next panel" (default `"tab"`). */
  next?: string;
  /** Hotkey for "previous panel" (default `"shift+tab"`). */
  previous?: string;
}

export interface PanelGroupProps {
  /** Stable group id; defaults to a generated id (fine for a single group). */
  id?: string;
  /** Uncontrolled initial active panel. Defaults to the first registered panel. */
  defaultActivePanelId?: string;
  /** Controlled active panel. A string selects that panel; null explicitly selects none. */
  activePanelId?: string | null;
  /** Non-null uncontrolled resolved changes or controlled activation requests; never echoes props. */
  onActivePanelChange?: (panelId: string) => void;
  /**
   * Switch shortcuts. Defaults: next `"tab"`, previous `"shift+tab"`. Set to
   * `null` to disable built-in switching (apps then call `usePanels().next`).
   */
  switchKeys?: PanelSwitchKeys | null;
  /** Modes in which switch keys are live. Default: `["cursor", "select"]`. */
  switchModes?: Mode[];
  /** Wrap from last to first (default true). */
  wrap?: boolean;
  /** Activate a panel on mouse-down inside it (default true; only with default chrome). */
  activateOnMouseDown?: boolean;
  children: ReactNode;
}

export interface PanelProps {
  id: string;
  /** Chrome title. */
  title?: string;
  /** Excluded from activation and switching; renders inactive/disabled chrome. */
  disabled?: boolean;
  /** Initial local mode (default "cursor"), as CommandSurfaceProvider today. */
  initialMode?: Mode;
  /**
   * `"border"` (default): render a bordered box with active/inactive/disabled
   * treatment. `"none"`: render no chrome; the app reads `usePanelState()` and
   * renders its own (mouse activation is then the app's responsibility).
   */
  chrome?: "border" | "none";
  /** Layout props forwarded to the chrome box (flexGrow, width, ...). */
  style?: BoxProps["style"];
  children: ReactNode;
}

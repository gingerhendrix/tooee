import { createContext, useContext } from "react";
import type { Mode } from "@tooee/commands";

/**
 * The interface a `PanelGroup` exposes to the `Panel`s and hooks beneath it.
 * `activeId` is the resolved active panel (reactive); `register`/`setDisabled`
 * synchronize a panel's membership and activatable state with the group.
 */
export interface PanelGroupContextValue {
  groupId: string;
  /** The resolved active panel id, or null when the group has no activatable panel. */
  activeId: string | null;
  /** All registered panel ids in registration (source) order. */
  panelIds: readonly string[];
  /** Activate a panel (ignored if unknown/disabled). */
  activate: (panelId: string) => void;
  /** Activate the next activatable panel (source order; wraps per `wrap`). */
  next: () => void;
  /** Activate the previous activatable panel. */
  previous: () => void;
  /** Register a panel; returns the unregister cleanup. Assigns registration order. */
  register: (panelId: string) => () => void;
  /** Update a panel's disabled (non-activatable) flag. */
  setDisabled: (panelId: string, disabled: boolean) => void;
  /** Whether panels should activate on mouse-down (default chrome only). */
  activateOnMouseDown: boolean;
  /** Whether the built-in next/previous commands are registered on each panel surface. */
  switchEnabled: boolean;
  /** Built-in next-panel hotkey. */
  nextHotkey: string;
  /** Built-in previous-panel hotkey. */
  previousHotkey: string;
  /** Local modes in which the built-in switch commands dispatch. */
  switchModes: Mode[];
}

export const PanelGroupContext = createContext<PanelGroupContextValue | null>(null);

export const usePanelGroupContext = function usePanelGroupContext(): PanelGroupContextValue {
  const ctx = useContext(PanelGroupContext);
  if (!ctx) {
    throw new Error("usePanelGroupContext must be used within a PanelGroup");
  }
  return ctx;
};

export const useOptionalPanelGroupContext =
  function useOptionalPanelGroupContext(): PanelGroupContextValue | null {
    return useContext(PanelGroupContext);
  };

export interface PanelContextValue {
  id: string;
  title?: string;
  groupId: string;
}

export const PanelContext = createContext<PanelContextValue | null>(null);

export const useOptionalPanelContext =
  function useOptionalPanelContext(): PanelContextValue | null {
    return useContext(PanelContext);
  };

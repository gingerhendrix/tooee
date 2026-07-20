import { useContext, useMemo } from "react";
import { PanelContext, useOptionalPanelGroupContext, usePanelGroupContext } from "./context.js";

export interface PanelState {
  id: string;
  title?: string;
  /** Reactive: true while this panel is its group's active panel. */
  isActive: boolean;
  /** Activate this panel. */
  activate: () => void;
}

/** State of the nearest enclosing `Panel`. */
export const usePanelState = function usePanelState(): PanelState {
  const panel = useContext(PanelContext);
  const group = usePanelGroupContext();
  if (!panel) {
    throw new Error("usePanelState must be used within a Panel");
  }
  const isActive = group.activeId === panel.id;
  const { activate } = group;
  const { id, title } = panel;
  return useMemo<PanelState>(
    () => ({
      activate: () => {
        activate(id);
      },
      id,
      isActive,
      title,
    }),
    [activate, id, title, isActive],
  );
};

export interface PanelsControls {
  panelIds: readonly string[];
  activePanelId: string | null;
  activate: (id: string) => void;
  next: () => void;
  previous: () => void;
}

/** Group-level access, usable inside or outside panels (nearest group). */
export const usePanels = function usePanels(): PanelsControls {
  const group = usePanelGroupContext();
  const { panelIds, activeId, activate, next, previous } = group;
  return useMemo<PanelsControls>(
    () => ({ activate, activePanelId: activeId, next, panelIds, previous }),
    [panelIds, activeId, activate, next, previous],
  );
};

/** Convenience: true when inside the active panel (or when there is no enclosing panel). */
export const usePanelActive = function usePanelActive(): boolean {
  const panel = useContext(PanelContext);
  const group = useOptionalPanelGroupContext();
  if (!panel || !group) {
    return true;
  }
  return group.activeId === panel.id;
};

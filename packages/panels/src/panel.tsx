import { useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { CommandSurfaceProvider, ScreenScopeProvider, useCommand } from "@tooee/commands";
import { useTheme } from "@tooee/themes";
import { PanelContext, usePanelGroupContext } from "./context.js";
import type { PanelContextValue, PanelGroupContextValue } from "./context.js";
import type { PanelProps } from "./types.js";

const PanelSwitchCommands = function PanelSwitchCommands({
  group,
}: {
  group: PanelGroupContextValue;
}): null {
  useCommand({
    enabled: group.switchEnabled,
    handler: group.next,
    hotkey: group.nextHotkey,
    id: "panels.next",
    modes: group.switchModes,
    title: "Next panel",
  });
  useCommand({
    enabled: group.switchEnabled,
    handler: group.previous,
    hotkey: group.previousHotkey,
    id: "panels.previous",
    modes: group.switchModes,
    title: "Previous panel",
  });
  return null;
};

/**
 * A visible, mounted region that owns a command surface, a local mode, and
 * optional chrome. Its `useCommand`/`useMode` children register on the panel's
 * surface, so they only dispatch while this panel is its group's active panel —
 * the same containment property overlays have. Children stay mounted across
 * activation changes (local state, panel-local router stacks, and mode persist).
 */
export const Panel = function Panel({
  id,
  title,
  disabled,
  initialMode,
  chrome = "border",
  style,
  children,
}: PanelProps): ReactNode {
  const group = usePanelGroupContext();
  const { theme } = useTheme();
  const disabledValue = disabled ?? false;

  // `register`/`setDisabled`/`activate` are referentially stable; depend on them
  // (not the whole group object, whose identity changes on every activation) so
  // membership is registered once on mount, not re-registered on each switch.
  const { register, setDisabled, activate: activatePanel, groupId, activeId } = group;

  useEffect(() => register(id), [register, id]);
  useEffect(() => {
    setDisabled(id, disabledValue);
  }, [setDisabled, id, disabledValue]);

  const isActive = activeId === id && !disabledValue;
  const activate = useCallback(() => {
    activatePanel(id);
  }, [activatePanel, id]);

  const panelContext = useMemo<PanelContextValue>(
    () => ({ groupId, id, title }),
    [groupId, id, title],
  );

  const inner = (
    <PanelContext value={panelContext}>
      <CommandSurfaceProvider
        id={id}
        role="panel"
        groupId={group.groupId}
        initialMode={initialMode ?? "cursor"}
      >
        <PanelSwitchCommands group={group} />
        <ScreenScopeProvider active={isActive}>{children}</ScreenScopeProvider>
      </CommandSurfaceProvider>
    </PanelContext>
  );

  if (chrome === "none") {
    return inner;
  }

  // Chrome uses existing theme tokens only. Active: `borderActive` + a `▸`
  // marker (a non-color cue). Disabled: `borderSubtle` + muted title. Inactive:
  // `border` + muted title.
  const activeBorder = isActive ? theme.borderActive : theme.border;
  const borderColor = disabledValue ? theme.borderSubtle : activeBorder;
  const titleColor = isActive ? theme.borderActive : theme.textMuted;
  let displayTitle: string | undefined;
  if (title !== undefined) {
    displayTitle = isActive ? `▸ ${title}` : title;
  }
  const canActivateOnMouseDown = group.activateOnMouseDown && !disabledValue;

  return (
    <box
      border
      borderColor={borderColor}
      title={displayTitle}
      titleColor={titleColor}
      backgroundColor={theme.backgroundPanel}
      onMouseDown={canActivateOnMouseDown ? activate : undefined}
      style={style}
    >
      {inner}
    </box>
  );
};

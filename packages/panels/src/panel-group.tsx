import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCommandStore } from "@tooee/commands";
import {
  PanelGroupContext,
  useOptionalPanelContext,
  useOptionalPanelGroupContext,
} from "./context.js";
import type { PanelGroupContextValue } from "./context.js";
import type { PanelGroupProps } from "./types.js";

interface Registration {
  id: string;
  /** Monotonic registration order = Tab-cycle order (source order in practice). */
  order: number;
  disabled: boolean;
}

const DEFAULT_SWITCH_MODES: PanelGroupContextValue["switchModes"] = ["cursor", "select"];

/**
 * A set of peer panels among which exactly one is active. Renders no box of its
 * own — layout belongs to the app. It owns activation state (controlled or
 * uncontrolled), tracks panel registration order for Tab cycling, repairs
 * activation when the active panel unmounts or is disabled, publishes the active
 * panel to the command store, and registers the switch commands.
 */
export const PanelGroup = function PanelGroup({
  id,
  defaultActivePanelId,
  activePanelId,
  onActivePanelChange,
  switchKeys,
  switchModes,
  wrap,
  activateOnMouseDown,
  children,
}: PanelGroupProps): ReactNode {
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const commandStore = useCommandStore();
  const enclosingPanel = useOptionalPanelContext();
  const enclosingGroup = useOptionalPanelGroupContext();
  const isInActiveAncestry =
    enclosingPanel === null || enclosingGroup?.activeId === enclosingPanel.id;

  const isControlled = activePanelId !== undefined;
  const wrapEnabled = wrap ?? true;

  const [registrations, setRegistrations] = useState<readonly Registration[]>([]);
  const orderCounterRef = useRef(0);
  const [uncontrolledActive, setUncontrolledActive] = useState<string | null>(
    defaultActivePanelId ?? null,
  );
  // Order of the last resolved active panel, so removal repair can pick the
  // next-in-order (else previous) panel rather than always jumping to the first.
  const lastActiveOrderRef = useRef(-1);

  const register = useCallback((panelId: string): (() => void) => {
    const order = orderCounterRef.current;
    orderCounterRef.current += 1;
    setRegistrations((prev) =>
      prev.some((entry) => entry.id === panelId)
        ? prev
        : [...prev, { disabled: false, id: panelId, order }],
    );
    return () => {
      setRegistrations((prev) => prev.filter((entry) => entry.id !== panelId));
    };
  }, []);

  const setDisabled = useCallback((panelId: string, disabled: boolean): void => {
    setRegistrations((prev) => {
      const index = prev.findIndex((entry) => entry.id === panelId);
      if (index === -1 || prev[index].disabled === disabled) {
        return prev;
      }
      const next = [...prev];
      next[index] = { ...next[index], disabled };
      return next;
    });
  }, []);

  const activatable = useMemo(
    () => registrations.filter((entry) => !entry.disabled).sort((a, b) => a.order - b.order),
    [registrations],
  );

  const requestedId = isControlled ? (activePanelId ?? null) : uncontrolledActive;

  // The single source of truth for "which panel is active", derived each render
  // so a Panel's chrome and hooks are never a frame behind their own registration.
  const resolvedId = useMemo<string | null>(() => {
    if (activatable.length === 0) {
      return null;
    }
    if (requestedId !== null && activatable.some((entry) => entry.id === requestedId)) {
      return requestedId;
    }
    // Controlled means controlled: a missing/disabled controlled id activates no
    // panel (root owns input) rather than silently repairing to a peer.
    if (isControlled) {
      return null;
    }
    const lastOrder = lastActiveOrderRef.current;
    const nextAfter = activatable.find((entry) => entry.order > lastOrder);
    if (nextAfter) {
      return nextAfter.id;
    }
    const previousBefore = [...activatable].toReversed().find((entry) => entry.order < lastOrder);
    return (previousBefore ?? activatable[0]).id;
  }, [activatable, requestedId, isControlled]);

  const activatableRef = useRef(activatable);
  activatableRef.current = activatable;
  const resolvedRef = useRef(resolvedId);
  resolvedRef.current = resolvedId;
  const onActivePanelChangeRef = useRef(onActivePanelChange);
  onActivePanelChangeRef.current = onActivePanelChange;

  // Publish activation to the command store and reconcile derived state.
  const announcedRef = useRef<string | null>(null);
  useEffect(() => {
    if (resolvedId === null || !isInActiveAncestry) {
      commandStore.removePanelGroup(groupId);
    } else {
      commandStore.activatePanel(groupId, resolvedId);
      lastActiveOrderRef.current =
        activatable.find((entry) => entry.id === resolvedId)?.order ?? lastActiveOrderRef.current;
      if (!isControlled && resolvedId !== uncontrolledActive) {
        // Keep the uncontrolled intent in step with a repair so `requestedId`
        // tracks the resolved panel on subsequent renders.
        setUncontrolledActive(resolvedId);
      }
    }
    // Uncontrolled: announce resolved changes (initial select and repair). A
    // controlled group announces from `activate`/`next`/`previous` instead, so
    // the parent is not echoed its own prop change.
    if (!isControlled && resolvedId !== announcedRef.current) {
      announcedRef.current = resolvedId;
      if (resolvedId !== null) {
        onActivePanelChangeRef.current?.(resolvedId);
      }
    }
  }, [
    commandStore,
    groupId,
    resolvedId,
    activatable,
    isControlled,
    uncontrolledActive,
    isInActiveAncestry,
  ]);

  // Forget the group's activation when it unmounts so the store does not keep a
  // stale active id for a group that no longer exists.
  useEffect(
    () => () => {
      commandStore.removePanelGroup(groupId);
    },
    [commandStore, groupId],
  );

  const activate = useCallback(
    (panelId: string): void => {
      if (!activatableRef.current.some((entry) => entry.id === panelId)) {
        return;
      }
      if (isControlled) {
        onActivePanelChangeRef.current?.(panelId);
      } else {
        setUncontrolledActive(panelId);
      }
    },
    [isControlled],
  );

  const step = useCallback(
    (direction: 1 | -1): void => {
      const list = activatableRef.current;
      if (list.length < 2) {
        return;
      }
      const currentIndex = list.findIndex((entry) => entry.id === resolvedRef.current);
      let nextIndex = currentIndex + direction;
      if (nextIndex >= list.length) {
        nextIndex = wrapEnabled ? 0 : currentIndex;
      } else if (nextIndex < 0) {
        nextIndex = wrapEnabled ? list.length - 1 : currentIndex;
      }
      activate(list[nextIndex].id);
    },
    [activate, wrapEnabled],
  );

  const next = useCallback(() => {
    step(1);
  }, [step]);
  const previous = useCallback(() => {
    step(-1);
  }, [step]);

  const switchEnabled = switchKeys !== null;
  const nextHotkey = switchKeys?.next ?? "tab";
  const previousHotkey = switchKeys?.previous ?? "shift+tab";
  const resolvedSwitchModes = switchModes ?? DEFAULT_SWITCH_MODES;

  const panelIds = useMemo(
    () => [...registrations].toSorted((a, b) => a.order - b.order).map((entry) => entry.id),
    [registrations],
  );

  const contextValue = useMemo<PanelGroupContextValue>(
    () => ({
      activate,
      activateOnMouseDown: activateOnMouseDown ?? true,
      activeId: resolvedId,
      groupId,
      next,
      nextHotkey,
      panelIds,
      previous,
      previousHotkey,
      register,
      setDisabled,
      switchEnabled,
      switchModes: resolvedSwitchModes,
    }),
    [
      activate,
      activateOnMouseDown,
      resolvedId,
      groupId,
      next,
      nextHotkey,
      panelIds,
      previous,
      previousHotkey,
      register,
      setDisabled,
      switchEnabled,
      resolvedSwitchModes,
    ],
  );

  return <PanelGroupContext value={contextValue}>{children}</PanelGroupContext>;
};

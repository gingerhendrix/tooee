import { useEffect, useMemo, useRef } from "react";
import { useSurfaceRegistry } from "./context.js";
import type { Command, CommandHandler, CommandWhen } from "./types.js";
import type { Mode } from "./mode.js";

export interface ActionDefinition {
  id: string;
  title: string;
  hotkey?: string;
  modes?: Mode[];
  handler: CommandHandler;
  when?: CommandWhen;
  category?: string;
  group?: string;
  icon?: string;
  hidden?: boolean;
}

export const useActions = function useActions(actions: ActionDefinition[] | undefined): void {
  const registry = useSurfaceRegistry();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const key = useMemo(
    () =>
      actions
        ?.map(
          (a) =>
            // modes and when-presence are frozen into the registration, so
            // they must participate in the re-registration key.
            `${a.id}:${a.title}:${a.hotkey ?? ""}:${a.category ?? ""}:${a.group ?? ""}:${a.icon ?? ""}:${a.hidden ?? false}:${a.modes?.join("|") ?? ""}:${a.when ? 1 : 0}`,
        )
        .join(",") ?? "",
    [actions],
  );

  useEffect(() => {
    const current = actionsRef.current;
    if (!current || current.length === 0) {
      return;
    }

    const unregisters = current.map((action, i) => {
      const command: Command = {
        category: action.category,
        defaultHotkey: action.hotkey,
        group: action.group,
        handler: (ctx): void | Promise<void> | undefined => actionsRef.current?.[i]?.handler(ctx),
        hidden: action.hidden,
        icon: action.icon,
        id: action.id,
        modes: action.modes,
        title: action.title,
        when: action.when ? (ctx) => actionsRef.current?.[i]?.when?.(ctx) ?? false : undefined,
      };
      return registry.register(command);
    });

    return () => {
      for (const unregister of unregisters) {
        unregister();
      }
    };
  }, [key, registry]);
};

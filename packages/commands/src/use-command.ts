import { useEffect, useRef } from "react";
import type { Command, CommandHandler, CommandWhen } from "./types.js";
import type { Mode } from "./mode.js";
import { useSurfaceRegistry } from "./context.js";

export interface UseCommandOptions {
  id: string;
  title: string;
  handler: CommandHandler;
  hotkey?: string;
  modes?: Mode[];
  category?: string;
  group?: string;
  icon?: string;
  when?: CommandWhen;
  hidden?: boolean;
  /**
   * Register the command (default true). `false` unregisters it entirely — it
   * cannot be invoked and never appears in the palette or which-key. Use this
   * for genuinely disabled features; use `when` for context-dependent ones.
   */
  enabled?: boolean;
}

export const useCommand = function useCommand(options: UseCommandOptions): void {
  const registry = useSurfaceRegistry();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Key on the modes CONTENT, not the array identity: callers pass inline
  // array literals, and with a subscribable registry an identity-keyed effect
  // would re-register on every render — re-notifying the subscriber that
  // caused the render (an infinite update loop for components that both
  // register and observe commands, e.g. the command palette provider).
  const modesKey = options.modes?.join("|") ?? "";

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }

    const command: Command = {
      category: options.category,
      defaultHotkey: options.hotkey,
      group: options.group,
      handler: (...args: Parameters<Command["handler"]>): void | Promise<void> =>
        optionsRef.current.handler(...args),
      hidden: options.hidden,
      icon: options.icon,
      id: options.id,
      // Read through the ref: the effect is keyed on modesKey (content), and
      // the ref holds the same-render options when the effect runs.
      modes: optionsRef.current.modes,
      title: options.title,
      when: optionsRef.current.when
        ? (ctx) => {
            const when = optionsRef.current.when;
            if (!when) {
              return false;
            }
            return when(ctx);
          }
        : undefined,
    };
    return registry.register(command);
  }, [
    options.id,
    options.title,
    options.hotkey,
    modesKey,
    options.category,
    options.group,
    options.icon,
    options.hidden,
    options.enabled,
    registry,
  ]);
};

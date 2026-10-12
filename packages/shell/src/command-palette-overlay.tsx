import type { Command, Mode } from "@tooee/commands";
import { CommandPalette } from "@tooee/renderers";
import { createElement, useMemo } from "react";
import type { ReactNode } from "react";

const DEFAULT_MODES: Mode[] = ["cursor"];

export const CommandPaletteOverlay = function CommandPaletteOverlay({
  commands,
  hotkeyFor,
  invoke,
  launchMode,
  close,
}: {
  commands: Command[];
  /** The key that runs a command now, after `keymap` remaps. */
  hotkeyFor: (id: string) => string | undefined;
  invoke: (id: string) => void;
  launchMode: Mode;
  close: () => void;
}): ReactNode {
  const entries = useMemo(
    () =>
      commands
        .filter((cmd) => cmd.hidden !== true)
        .filter((cmd) => {
          const cmdModes = cmd.modes ?? DEFAULT_MODES;

          return cmdModes.includes(launchMode);
        })
        .map((cmd) => ({
          category: cmd.category,
          hotkey: hotkeyFor(cmd.id),
          icon: cmd.icon,
          id: cmd.id,
          title: cmd.title,
        })),
    [commands, hotkeyFor, launchMode]
  );

  return createElement(CommandPalette, {
    commands: entries,
    onClose: close,
    onSelect: (id: string) => {
      close();
      invoke(id);
    },
  });
};

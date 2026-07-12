import { createElement, useMemo } from "react";
import type { ReactNode } from "react";
import type { Command, Mode } from "@tooee/commands";
import { CommandPalette } from "@tooee/renderers";

const DEFAULT_MODES: Mode[] = ["cursor"];

export function CommandPaletteOverlay({
  commands,
  invoke,
  launchMode,
  close,
}: {
  commands: Command[];
  invoke: (id: string) => void;
  launchMode: Mode;
  close: () => void;
}): ReactNode {
  const entries = useMemo(
    () =>
      commands
        .filter((cmd) => !cmd.hidden)
        .filter((cmd) => {
          const cmdModes = cmd.modes ?? DEFAULT_MODES;
          return cmdModes.includes(launchMode);
        })
        .map((cmd) => ({
          category: cmd.category,
          hotkey: cmd.defaultHotkey,
          icon: cmd.icon,
          id: cmd.id,
          title: cmd.title,
        })),
    [commands, launchMode],
  );

  return createElement(CommandPalette, {
    commands: entries,
    onClose: close,
    onSelect: (id: string) => {
      close();
      invoke(id);
    },
  });
}

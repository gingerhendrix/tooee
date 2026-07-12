import { createElement, useCallback } from "react";
import type { ReactNode } from "react";
import { useCommand, useCommandContext, useMode } from "@tooee/commands";
import { useOverlay } from "@tooee/overlays";
import type { OverlayCloseReason } from "@tooee/overlays";
import { CommandPaletteOverlay } from "./command-palette-overlay.js";

const OVERLAY_ID = "command-palette";

export const CommandPaletteProvider = function CommandPaletteProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const mode = useMode();
  const overlay = useOverlay();
  // Reactive: the registry is a subscribable store, so this provider
  // re-renders as commands register/unregister and open() always captures the
  // current command set.
  const { commands, invoke } = useCommandContext();

  const open = useCallback(() => {
    overlay.open(
      OVERLAY_ID,
      ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
        createElement(CommandPaletteOverlay, {
          close: () => {
            close();
          },
          commands,
          invoke,
          launchMode: mode,
        }),
      null,
      { ownCommands: true, role: "modal", surfaceMode: "insert" },
    );
  }, [overlay, mode, commands, invoke]);

  useCommand({
    handler: open,
    hotkey: ":",
    id: "command-palette",
    modes: ["cursor", "select"],
    title: "Command Palette",
  });

  return children;
};

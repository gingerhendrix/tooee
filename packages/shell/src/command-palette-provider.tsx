import { createElement, useCallback } from "react";
import type { ReactNode } from "react";
import {
  selectActivePanelSurface,
  useCommand,
  useCommandStore,
  useEffectiveCommands,
  useMode,
} from "@tooee/commands";
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
  const commandStore = useCommandStore();
  const overlay = useOverlay();
  // Reactive: the registry is a subscribable store, so this provider
  // re-renders as commands register/unregister and open() always captures the
  // current command set. Under panels this is the effective set — the active
  // panel's commands plus non-shadowed root commands, with invocation routed to
  // the owning surface — so the palette can reach panel-local commands.
  const { commands, invoke } = useEffectiveCommands();

  const open = useCallback(() => {
    const storeContext = commandStore.store.getSnapshot().context;
    const panel = selectActivePanelSurface(storeContext);
    const launchMode = panel?.getMode() ?? mode;
    // Insert-mode key dispatch never falls through from a panel to root. Keep
    // a programmatically opened palette faithful to that boundary too: show
    // only the active editor panel's commands, never root commands that typed
    // input could not invoke.
    const paletteCommands =
      panel && launchMode === "insert"
        ? [...(storeContext.commandsBySurface.get(panel.id)?.values() ?? [])]
        : commands;
    overlay.open(
      OVERLAY_ID,
      ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
        createElement(CommandPaletteOverlay, {
          close: () => {
            close();
          },
          commands: paletteCommands,
          invoke,
          launchMode,
        }),
      null,
      { ownCommands: true, role: "modal", surfaceMode: "insert" },
    );
  }, [overlay, mode, commands, invoke, commandStore]);

  useCommand({
    handler: open,
    hotkey: ":",
    id: "command-palette",
    modes: ["cursor", "select"],
    title: "Command Palette",
  });

  return children;
};

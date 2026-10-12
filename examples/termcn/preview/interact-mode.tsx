/**
 * Interact mode. While it is on, a modal command surface swallows every key
 * for Tooee, so only the exit command runs, and the key gate forwards all
 * other keys to the demo.
 */

import type { KeyEvent } from "@opentui/core";
import { CommandSurfaceProvider, useCommand } from "@tooee/commands";
import type { ReactNode } from "react";

export const INTERACT_EXIT_HOTKEY = "ctrl+g";

export const INTERACT_EXIT_LABEL = "Ctrl+G";

export const isInteractExitKey = function isInteractExitKey(key: KeyEvent): boolean {
  return key.ctrl && key.name === "g";
};

const ExitCommand = function ExitCommand({ onExit }: { onExit: () => void }): ReactNode {
  useCommand({
    handler: onExit,
    hotkey: INTERACT_EXIT_HOTKEY,
    id: "termcn.interact.exit",
    modes: ["cursor", "insert"],
    title: "Leave the demo",
  });

  return null;
};

export const InteractSurface = function InteractSurface({
  onExit,
}: {
  onExit: () => void;
}): ReactNode {
  return (
    <CommandSurfaceProvider id="termcn-interact" role="modal">
      <ExitCommand onExit={onExit} />
    </CommandSurfaceProvider>
  );
};

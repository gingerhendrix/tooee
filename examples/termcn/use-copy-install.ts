/** Root `y` command: copy the selected component's install command. */

import { copyToClipboard } from "@tooee/clipboard";
import { useCommand } from "@tooee/commands";
import { useToast } from "@tooee/toasts";

import { installCommand } from "./data/registry.js";
import type { ComponentEntry } from "./data/registry.js";
import { errorMessage } from "./use-resource.js";

export const useCopyInstallCommand = function useCopyInstallCommand(
  entry: ComponentEntry | undefined
): void {
  const { toast } = useToast();

  useCommand({
    handler: async () => {
      if (entry === undefined) {
        return;
      }

      const command = installCommand(entry);

      try {
        await copyToClipboard(command);
        toast({ level: "success", message: `Copied: ${command}` });
      } catch (error) {
        toast({ level: "error", message: `Copy failed: ${errorMessage(error)}` });
      }
    },
    hotkey: "y",
    id: "termcn.copy-install",
    modes: ["cursor"],
    title: "Copy install command",
    when: () => entry !== undefined,
  });
};

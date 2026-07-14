import { useEffect } from "react";
import { useRenderer } from "@opentui/react";
import { copyToClipboard, copyToPrimary } from "@tooee/clipboard";
import { useConfig } from "@tooee/config";
import { platform } from "node:os";
import type { Selection } from "@opentui/core";

export const useCopyOnSelect = function useCopyOnSelect() {
  const renderer = useRenderer();
  const config = useConfig();

  useEffect(() => {
    const copyOnSelect = config.view?.copyOnSelect;

    // Default: on for Linux, off elsewhere
    const effective = copyOnSelect ?? platform() === "linux";

    if (effective === false) {
      return () => void 0;
    }

    const handler = (selection: Selection) => {
      const text = selection.getSelectedText();
      if (!text) {
        return;
      }

      if (effective === "clipboard") {
        void copyToClipboard(text);
      } else {
        // true or "primary" → use primary selection
        void copyToPrimary(text);
      }
    };

    renderer.on("selection", handler);
    return () => {
      renderer.off("selection", handler);
    };
  }, [renderer, config.view?.copyOnSelect]);
};

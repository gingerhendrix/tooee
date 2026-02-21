import { useEffect } from "react"
import { useRenderer } from "@opentui/react"
import { copyToClipboard, copyToPrimary } from "@tooee/clipboard"
import { useConfig } from "@tooee/config"
import { platform } from "os"
import type { Selection } from "@opentui/core"

export function useCopyOnSelect() {
  const renderer = useRenderer()
  const config = useConfig()

  useEffect(() => {
    const copyOnSelect = config.view?.copyOnSelect

    // Default: on for Linux, off elsewhere
    const effective =
      copyOnSelect === undefined
        ? platform() === "linux"
        : copyOnSelect

    if (!effective) return

    const handler = (selection: Selection) => {
      const text = selection.getSelectedText()
      if (!text) return

      if (effective === "clipboard") {
        void copyToClipboard(text)
      } else {
        // true or "primary" → use primary selection
        void copyToPrimary(text)
      }
    }

    renderer.on("selection", handler)
    return () => {
      renderer.off("selection", handler)
    }
  }, [renderer, config.view?.copyOnSelect])
}

import { useState } from "react"
import {
  useThemeCommands,
  useQuitCommand,
  useCopyCommand,
  useToggleLineNumbersCommand,
} from "@tooee/shell"
import { useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import { useConfig } from "@tooee/config"
import type { AnyContent } from "../types.js"

interface UseViewCommandsParams {
  content: AnyContent | null
  textContent: string
  actions?: ActionDefinition[]
}

export function useViewCommands({ content, textContent, actions }: UseViewCommandsParams) {
  const config = useConfig()
  const [showLineNumbers, setShowLineNumbers] = useState(config.view?.gutter ?? true)

  const { name: themeName } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({
    getText: () => (content ? textContent : undefined),
  })
  useToggleLineNumbersCommand({
    showLineNumbers,
    onToggle: () => setShowLineNumbers((v) => !v),
  })

  useActions(actions)

  return { themeName, showLineNumbers }
}

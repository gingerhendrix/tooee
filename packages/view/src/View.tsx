import { useState, useCallback } from "react"
import { useTheme } from "@tooee/themes"
import type { ActionDefinition } from "@tooee/commands"
import type { MarkSet } from "@tooee/marks"
import { isCustomContent, type ContentProvider, type ContentRenderer } from "./types.js"
import { useContentLoader } from "./hooks/useContentLoader.js"
import {
  MarkdownSubview,
  CodeSubview,
  TableSubview,
  ImageSubview,
  CustomSubview,
} from "./components/subviews/index.js"

interface ViewProps {
  contentProvider: ContentProvider
  actions?: ActionDefinition[]
  renderers?: Record<string, ContentRenderer>
}

export function View({ contentProvider, actions, renderers }: ViewProps) {
  const { theme } = useTheme()
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const reload = useCallback(() => setReloadTrigger((n) => n + 1), [])

  const { content, streaming, error, providerMarks } = useContentLoader(
    contentProvider,
    reloadTrigger,
  )

  const [userMarks, setUserMarks] = useState<MarkSet[]>([])

  const setMarkSet = useCallback((set: MarkSet) => {
    setUserMarks((prev) => {
      const filtered = prev.filter((s) => s.namespace !== set.namespace)
      return [...filtered, set]
    })
  }, [])

  const clearMarkNamespace = useCallback((namespace: string) => {
    setUserMarks((prev) => prev.filter((s) => s.namespace !== namespace))
  }, [])

  const clearAllUserMarks = useCallback(() => {
    setUserMarks([])
  }, [])

  if (error) {
    return (
      <box style={{ flexDirection: "column" }}>
        <text content={`Error: ${error}`} fg={theme.error} />
      </box>
    )
  }

  if (!content) {
    return (
      <box>
        <text content="Loading..." fg={theme.textMuted} />
      </box>
    )
  }

  const shared = {
    providerMarks,
    userMarks,
    setMarkSet,
    clearMarkNamespace,
    clearAllUserMarks,
    reload,
    streaming,
    actions,
  }

  if (isCustomContent(content)) {
    return <CustomSubview content={content} renderers={renderers} {...shared} />
  }

  switch (content.format) {
    case "markdown":
      return <MarkdownSubview content={content} {...shared} />
    case "code":
    case "text":
      return <CodeSubview content={content} {...shared} />
    case "table":
      return <TableSubview content={content} {...shared} />
    case "image":
      return <ImageSubview content={content} {...shared} />
  }
}

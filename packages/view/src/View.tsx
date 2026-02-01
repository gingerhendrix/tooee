import { useState, useEffect, useRef } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { MarkdownView, CodeView, StatusBar, TitleBar, useTheme } from "@tooee/react"
import { useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import { useThemeCommands, useQuitCommand, useCopyCommand, useModalNavigationCommands } from "@tooee/shell"
import type { ViewContent, ViewContentProvider, ViewInteractionHandler } from "./types.ts"

interface ViewProps {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export function View({ contentProvider, interactionHandler }: ViewProps) {
  const { theme } = useTheme()
  const [content, setContent] = useState<ViewContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    const result = contentProvider.load()
    if (result instanceof Promise) {
      result.then(setContent).catch((e: Error) => setError(e.message))
    } else {
      setContent(result)
    }
  }, [contentProvider])

  const lineCount = content?.body.split("\n").length ?? 0

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    viewportHeight: 40,
    getText: () => content?.body,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset])

  const { name: themeName } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({ getText: () => content?.body })

  const customActions: ActionDefinition[] | undefined = interactionHandler?.actions.map((action) => ({
    id: action.id,
    title: action.title,
    hotkey: action.hotkey,
    handler: () => {
      if (content) {
        action.handler(content)
      }
    },
  }))

  useActions(customActions)

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

  const renderContent = () => {
    switch (content.format) {
      case "markdown":
        return <MarkdownView content={content.body} />
      case "code":
        return <CodeView content={content.body} language={content.language} />
      case "text":
        return <text content={content.body} fg={theme.text} />
    }
  }

  return (
    <box flexDirection="column" width="100%" height="100%">
      {content.title && <TitleBar title={content.title} subtitle={content.format} />}
      <scrollbox
        ref={scrollRef}
        style={{ flexGrow: 1 }}
        focused
      >
        {renderContent()}
      </scrollbox>
      <StatusBar
        items={[
          { label: "Theme:", value: themeName },
          { label: "Format:", value: content.format },
          { label: "Lines:", value: String(lineCount) },
          { label: "Mode:", value: nav.mode },
          { label: "Scroll:", value: String(nav.scrollOffset) },
          ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
        ]}
      />
    </box>
  )
}

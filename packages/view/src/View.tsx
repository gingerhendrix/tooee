import { useState, useEffect, useRef } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useRenderer } from "@opentui/react"
import { MarkdownView, CodeView, StatusBar, TitleBar, useVimNavigation, copyToClipboard, useThemeSwitcher } from "@tooee/react"
import { useCommand, useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import type { ViewContent, ViewContentProvider, ViewInteractionHandler } from "./types.ts"

interface ViewProps {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export function View({ contentProvider, interactionHandler }: ViewProps) {
  const renderer = useRenderer()
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

  const nav = useVimNavigation({
    totalLines: lineCount,
    viewportHeight: 40,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset])

  useCommand({
    id: "quit",
    title: "Quit",
    hotkey: "q",
    handler: () => {
      renderer.destroy()
    },
  })

  const { nextTheme, prevTheme, name: themeName } = useThemeSwitcher()

  useCommand({
    id: "cycle-theme",
    title: "Next theme",
    hotkey: "t",
    handler: () => {
      nextTheme()
    },
  })

  useCommand({
    id: "cycle-theme-prev",
    title: "Previous theme",
    hotkey: "shift+t",
    handler: () => {
      prevTheme()
    },
  })

  useCommand({
    id: "copy",
    title: "Copy to clipboard",
    hotkey: "y",
    handler: () => {
      if (content) {
        void copyToClipboard(content.body)
      }
    },
  })

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
        <text content={`Error: ${error}`} fg="#f7768e" />
      </box>
    )
  }

  if (!content) {
    return (
      <box>
        <text content="Loading..." fg="#565f89" />
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
        return <text content={content.body} fg="#c0caf5" />
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
          { label: "Scroll:", value: String(nav.scrollOffset) },
          ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
        ]}
      />
    </box>
  )
}

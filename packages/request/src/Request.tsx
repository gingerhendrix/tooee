import { useState, useEffect, useRef, useCallback } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useRenderer } from "@opentui/react"
import { MarkdownView } from "@tooee/renderers"
import { AppLayout } from "@tooee/layout"
import { ThemePicker, useTheme } from "@tooee/themes"
import { useCommand, useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import {
  useThemeCommands,
  useQuitCommand,
  useCopyCommand,
  useModalNavigationCommands,
} from "@tooee/shell"
import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts"

type Phase = "input" | "streaming" | "complete"

interface RequestProps {
  contentProvider: RequestContentProvider
  actions?: ActionDefinition[]
  /** @deprecated Use actions instead */
  interactionHandler?: RequestInteractionHandler
  initialInput?: string
}

export function Request({ contentProvider, actions, interactionHandler, initialInput }: RequestProps) {
  const renderer = useRenderer()
  const { theme } = useTheme()
  const [phase, setPhase] = useState<Phase>(initialInput ? "streaming" : "input")
  const [input, setInput] = useState(initialInput ?? "")
  const [response, setResponse] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  const lineCount = response.split("\n").length

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => response,
  })

  const prevScrollOffset = useRef(nav.scrollOffset)

  useEffect(() => {
    if (nav.scrollOffset !== prevScrollOffset.current) {
      prevScrollOffset.current = nav.scrollOffset
      if (autoScroll) {
        setAutoScroll(false)
      }
    }
  }, [nav.scrollOffset, autoScroll])

  useEffect(() => {
    if (scrollRef.current && !autoScroll) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset, autoScroll])

  const startStream = useCallback(
    async (query: string) => {
      setPhase("streaming")
      setResponse("")
      setAutoScroll(true)
      const abort = new AbortController()
      abortRef.current = abort

      try {
        for await (const chunk of contentProvider.submit(query)) {
          if (abort.signal.aborted) break
          setResponse((prev) => prev + chunk.delta)
        }
        if (!abort.signal.aborted) {
          setPhase("complete")
        }
      } catch {
        setPhase("complete")
      }
    },
    [contentProvider],
  )

  useEffect(() => {
    if (initialInput) {
      void startStream(initialInput)
    }
  }, [initialInput, startStream])

  const { name: themeName, picker: themePicker } = useThemeCommands({
    when: () => phase !== "input",
  })

  useQuitCommand({
    when: () => phase !== "input",
    onQuit: () => {
      abortRef.current?.abort()
      renderer.destroy()
    },
  })

  useCopyCommand({
    getText: () => response,
    when: () => phase === "complete",
  })

  useCommand({
    id: "cancel-stream",
    title: "Cancel stream",
    hotkey: "ctrl+c",
    when: () => phase === "streaming",
    handler: () => {
      abortRef.current?.abort()
      setPhase("complete")
    },
  })

  useCommand({
    id: "new-request",
    title: "New request",
    hotkey: "ctrl+n",
    when: () => phase === "complete",
    handler: () => {
      setPhase("input")
      setInput("")
      setResponse("")
    },
  })

  const legacyActions: ActionDefinition[] | undefined = interactionHandler?.actions.map(
    (action) => ({
      id: action.id,
      title: action.title,
      hotkey: action.hotkey,
      when: () => phase === "complete",
      handler: () => {
        action.handler(input, response)
      },
    }),
  )

  useActions(actions ?? legacyActions)

  const handleSubmit = () => {
    if (input.trim()) {
      void startStream(input)
    }
  }

  if (phase === "input") {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <text content="Enter your request:" fg={theme.primary} style={{ marginBottom: 1 }} />
        <input
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type your request..."
          textColor={theme.text}
          focused
        />
      </box>
    )
  }

  return (
    <AppLayout
      titleBar={{
        title: "Response",
        subtitle: phase === "streaming" ? "streaming..." : "complete",
      }}
      statusBar={{
        items: [
          { label: "Theme:", value: themeName },
          { label: "Status:", value: phase === "streaming" ? "streaming" : "complete" },
          { label: "Lines:", value: String(lineCount) },
          ...(phase === "streaming"
            ? [{ label: "Ctrl+C", value: "cancel" }]
            : [
                { label: "y", value: "copy" },
                { label: "Ctrl+N", value: "new" },
                { label: "q", value: "quit" },
              ]),
        ],
      }}
      scrollRef={scrollRef}
      scrollProps={{
        stickyScroll: autoScroll,
        stickyStart: "bottom",
        focused: !themePicker.isOpen,
      }}
      overlay={
        themePicker.isOpen ? (
          <ThemePicker
            entries={themePicker.entries}
            currentTheme={themeName}
            onSelect={themePicker.confirm}
            onClose={themePicker.close}
            onNavigate={themePicker.preview}
          />
        ) : undefined
      }
    >
      <MarkdownView content={response} />
      {phase === "streaming" && <text content="▍" fg={theme.primary} />}
    </AppLayout>
  )
}

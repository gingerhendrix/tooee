import { useState, useMemo } from "react"
import { useCommand } from "@tooee/commands"
import { View } from "./View.tsx"
import { listDirectoryFiles, type DirectoryEntry } from "./directory-provider.ts"
import type { Content, ContentProvider } from "./types.ts"
import { createFileProvider } from "./default-provider.ts"

function createDirectoryFileProvider(
  entry: DirectoryEntry,
  index: number,
  total: number,
): ContentProvider {
  const inner = createFileProvider(entry.path)
  return {
    async load(): Promise<Content> {
      const result = inner.load()
      const content = result instanceof Promise ? await result : result as Content
      return {
        ...content,
        title: `${entry.name}  (${index + 1}/${total})`,
      }
    },
  }
}

interface DirectoryViewProps {
  dirPath: string
  actions?: import("@tooee/commands").ActionDefinition[]
}

export function DirectoryView({ dirPath, actions }: DirectoryViewProps) {
  const files = useMemo(() => listDirectoryFiles(dirPath), [dirPath])
  const [currentIndex, setCurrentIndex] = useState(0)

  const contentProvider = useMemo(
    () =>
      files.length > 0
        ? createDirectoryFileProvider(files[currentIndex], currentIndex, files.length)
        : null,
    [files, currentIndex],
  )

  useCommand({
    id: "dir.next-file",
    title: "Next file",
    hotkey: "l",
    modes: ["command"],
    handler: () => setCurrentIndex((i) => Math.min(i + 1, files.length - 1)),
  })

  useCommand({
    id: "dir.prev-file",
    title: "Previous file",
    hotkey: "h",
    modes: ["command"],
    handler: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
  })

  if (files.length === 0 || !contentProvider) {
    return (
      <box>
        <text content="No viewable files in directory" />
      </box>
    )
  }

  return <View contentProvider={contentProvider} actions={actions} />
}

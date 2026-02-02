import { useState, useMemo } from "react"
import { useCommand } from "@tooee/commands"
import { View } from "./View.tsx"
import { listDirectoryFiles, type DirectoryEntry } from "./directory-provider.ts"
import type { ViewContentProvider, ViewContent, ViewInteractionHandler } from "./types.ts"
import { createFileProvider } from "./default-provider.ts"

function createDirectoryFileProvider(entry: DirectoryEntry, index: number, total: number): ViewContentProvider {
  const inner = createFileProvider(entry.path)
  return {
    async load(): Promise<ViewContent> {
      const content = await inner.load()
      return {
        ...content,
        title: `${entry.name}  (${index + 1}/${total})`,
      }
    },
  }
}

interface DirectoryViewProps {
  dirPath: string
  interactionHandler?: ViewInteractionHandler
}

export function DirectoryView({ dirPath, interactionHandler }: DirectoryViewProps) {
  const files = useMemo(() => listDirectoryFiles(dirPath), [dirPath])
  const [currentIndex, setCurrentIndex] = useState(0)

  const contentProvider = useMemo(
    () => files.length > 0 ? createDirectoryFileProvider(files[currentIndex], currentIndex, files.length) : null,
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

  return (
    <View
      contentProvider={contentProvider}
      interactionHandler={interactionHandler}
    />
  )
}

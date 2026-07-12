import { useState, useMemo } from "react";
import { useCommand } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { View } from "./View.js";
import { listDirectoryFiles } from "./directory-provider.js";
import type { DirectoryEntry } from "./directory-provider.js";
import type { AnyContent, ContentProvider } from "./types.js";
import { createFileProvider } from "./default-provider.js";

const createDirectoryFileProvider = function createDirectoryFileProvider(
  entry: DirectoryEntry,
  index: number,
  total: number,
): ContentProvider {
  const inner = createFileProvider(entry.path);
  return {
    async load(): Promise<AnyContent> {
      const result = inner.load();
      const content = result instanceof Promise ? await result : (result as AnyContent);
      return {
        ...content,
        title: `${entry.name}  (${index + 1}/${total})`,
      };
    },
  };
};

interface DirectoryViewProps {
  dirPath: string;
  actions?: ActionDefinition[];
}

export const DirectoryView = function DirectoryView({ dirPath, actions }: DirectoryViewProps) {
  const files = useMemo(() => listDirectoryFiles(dirPath), [dirPath]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const contentProvider = useMemo(
    () =>
      files.length > 0
        ? createDirectoryFileProvider(files[currentIndex], currentIndex, files.length)
        : null,
    [files, currentIndex],
  );

  useCommand({
    handler: () => setCurrentIndex((i) => Math.min(i + 1, files.length - 1)),
    hotkey: "l",
    id: "dir.next-file",
    modes: ["cursor"],
    title: "Next file",
  });

  useCommand({
    handler: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    hotkey: "h",
    id: "dir.prev-file",
    modes: ["cursor"],
    title: "Previous file",
  });

  if (files.length === 0 || !contentProvider) {
    return (
      <box>
        <text content="No viewable files in directory" />
      </box>
    );
  }

  return <View contentProvider={contentProvider} actions={actions} />;
};

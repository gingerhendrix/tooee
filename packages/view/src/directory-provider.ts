import { readdirSync, statSync } from "fs"
import { join } from "path"
import type { ContentProvider } from "./types.ts"
import { createFileProvider } from "./default-provider.ts"

const SUPPORTED_EXTENSIONS = new Set([
  "md",
  "mdx",
  "markdown",
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "txt",
  "css",
  "html",
  "yaml",
  "yml",
  "toml",
  "sh",
  "bash",
  "zsh",
  "go",
  "rs",
  "py",
  "rb",
  "c",
  "cpp",
  "h",
  "hpp",
  "java",
  "kt",
  "swift",
  "sql",
])

export interface DirectoryEntry {
  name: string
  path: string
}

export function listDirectoryFiles(dirPath: string): DirectoryEntry[] {
  const entries = readdirSync(dirPath)
  const files: DirectoryEntry[] = []

  for (const entry of entries) {
    if (entry.startsWith(".")) continue
    const fullPath = join(dirPath, entry)
    try {
      const stat = statSync(fullPath)
      if (!stat.isFile()) continue
    } catch {
      continue
    }
    const ext = entry.split(".").pop()?.toLowerCase()
    if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) continue
    files.push({ name: entry, path: fullPath })
  }

  files.sort((a, b) => a.name.localeCompare(b.name))
  return files
}

export function createDirectoryFileProvider(filePath: string): ContentProvider {
  return createFileProvider(filePath)
}

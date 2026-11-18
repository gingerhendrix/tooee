import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import { findImageLoader } from "@tooee/renderers";
import type { ImageLoader } from "@tooee/renderers";

import { createFileProvider } from "./default-provider.js";
import type { ContentProvider } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([
  "md",
  "mdx",
  "markdown",
  "csv",
  "tsv",
  "diff",
  "patch",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
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
]);

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface ListDirectoryOptions {
  /** Also list files that one of these loaders matches, such as SVG files. */
  imageLoaders?: readonly ImageLoader[];
}

const isSupportedFile = function isSupportedFile(
  name: string,
  fullPath: string,
  imageLoaders: readonly ImageLoader[] | undefined
): boolean {
  const ext = name.split(".").pop()?.toLowerCase();

  if (ext !== undefined && ext !== "" && SUPPORTED_EXTENSIONS.has(ext)) {
    return true;
  }

  return findImageLoader(fullPath, imageLoaders) !== undefined;
};

export const listDirectoryFiles = function listDirectoryFiles(
  dirPath: string,
  options: ListDirectoryOptions = {}
): DirectoryEntry[] {
  const entries = readdirSync(dirPath);
  const files: DirectoryEntry[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dirPath, entry);

    try {
      const stat = statSync(fullPath);

      if (!stat.isFile()) {
        continue;
      }
    } catch {
      continue;
    }

    if (!isSupportedFile(entry, fullPath, options.imageLoaders)) {
      continue;
    }

    files.push({ name: entry, path: fullPath });
  }

  files.sort((a, b) => a.name.localeCompare(b.name));

  return files;
};

export const createDirectoryFileProvider = function createDirectoryFileProvider(
  filePath: string
): ContentProvider {
  return createFileProvider(filePath);
};

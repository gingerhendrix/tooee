import { parseAuto } from "@tooee/renderers"
import type { Content, ContentFormat, ContentProvider } from "./types.ts"

function detectFormat(filePath: string): { format: ContentFormat; language?: string } {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (!ext) return { format: "text" }

  const imageExts = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"])
  if (imageExts.has(ext)) return { format: "image" }

  const tableExts = new Set(["csv", "tsv"])
  if (tableExts.has(ext)) return { format: "table" }

  const markdownExts = new Set(["md", "mdx", "markdown"])
  if (markdownExts.has(ext)) return { format: "markdown" }

  const codeExts: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    css: "css",
    html: "html",
    sql: "sql",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    java: "java",
    kt: "kotlin",
    swift: "swift",
  }

  const language = codeExts[ext]
  if (language) return { format: "code", language }

  return { format: "text" }
}

export function createFileProvider(filePath: string): ContentProvider {
  return {
    async load(): Promise<Content> {
      const { format, language } = detectFormat(filePath)
      const title = filePath.split("/").pop()

      if (format === "image") {
        return { format: "image", src: filePath, title }
      }

      const file = Bun.file(filePath)
      if (format === "table") {
        const text = await file.text()
        const parsed = parseAuto(text)
        return { format: "table", columns: parsed.columns, rows: parsed.rows, title }
      }
      const text = await file.text()
      switch (format) {
        case "markdown":
          return { format: "markdown", markdown: text, title }
        case "code":
          return { format: "code", code: text, language, title }
        case "text":
        default:
          return { format: "text", text, title }
      }
    },
  }
}

export function createStdinProvider(): ContentProvider {
  return {
    async load(): Promise<Content> {
      const text = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      return { format: "markdown", markdown: text, title: "stdin" }
    },
  }
}

export function createTableFileProvider(filePath: string): ContentProvider {
  return {
    async load(): Promise<Content> {
      const title = filePath.split("/").pop()
      const file = Bun.file(filePath)
      const text = await file.text()
      const parsed = parseAuto(text)
      return { format: "table", columns: parsed.columns, rows: parsed.rows, title }
    },
  }
}

export function createTableStdinProvider(): ContentProvider {
  return {
    async load(): Promise<Content> {
      const text = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      const parsed = parseAuto(text)
      return { format: "table", columns: parsed.columns, rows: parsed.rows, title: "stdin" }
    },
  }
}

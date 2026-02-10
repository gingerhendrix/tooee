import type { ViewContent, ViewContentProvider } from "./types.ts"

function detectFormat(filePath: string): { format: ViewContent["format"]; language?: string } {
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

export function createFileProvider(filePath: string): ViewContentProvider {
  return {
    async load(): Promise<ViewContent> {
      const { format, language } = detectFormat(filePath)
      const title = filePath.split("/").pop()

      // For images, the body is the file path (ImageView handles loading)
      if (format === "image") {
        return { body: filePath, format, title }
      }

      const file = Bun.file(filePath)
      const body = await file.text()
      return { body, format, language, title }
    },
  }
}

export function createStdinProvider(): ViewContentProvider {
  return {
    async load(): Promise<ViewContent> {
      const body = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      return { body, format: "markdown", title: "stdin" }
    },
  }
}

export function createTableFileProvider(filePath: string): ViewContentProvider {
  return {
    async load(): Promise<ViewContent> {
      const title = filePath.split("/").pop()
      const file = Bun.file(filePath)
      const body = await file.text()
      return { body, format: "table", title }
    },
  }
}

export function createTableStdinProvider(): ViewContentProvider {
  return {
    async load(): Promise<ViewContent> {
      const body = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      return { body, format: "table", title: "stdin" }
    },
  }
}

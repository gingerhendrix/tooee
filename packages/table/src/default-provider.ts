import type { TableContentProvider } from "./types.ts"
import { parseAuto, detectFormat, type Format } from "./parsers.ts"

function formatFromExtension(filePath: string): Format {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (ext === "csv") return "csv"
  if (ext === "tsv") return "tsv"
  if (ext === "json") return "json"
  return "unknown"
}

export function createFileProvider(filePath: string): TableContentProvider {
  return {
    async load() {
      const file = Bun.file(filePath)
      const body = await file.text()
      const extFormat = formatFromExtension(filePath)
      const format = extFormat !== "unknown" ? extFormat : detectFormat(body)
      const parsed = parseAuto(body)
      const title = filePath.split("/").pop()
      return { ...parsed, format, title }
    },
  }
}

export function createStdinProvider(): TableContentProvider {
  return {
    async load() {
      const body = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      return parseAuto(body)
    },
  }
}

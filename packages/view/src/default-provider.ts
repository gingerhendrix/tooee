import { parseAuto } from "@tooee/renderers";
import type { Content, ContentFormat, ContentProvider } from "./types.js";

export interface CreateProviderOptions {
  renderer?: ContentFormat;
}

function detectFormat(filePath: string): { format: ContentFormat; language?: string } {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) {
    return { format: "text" };
  }

  const tableExts = new Set(["csv", "tsv"]);
  if (tableExts.has(ext)) {
    return { format: "table" };
  }

  const markdownExts = new Set(["md", "mdx", "markdown"]);
  if (markdownExts.has(ext)) {
    return { format: "markdown" };
  }

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
  };

  const language = codeExts[ext];
  if (language) {
    return { format: "code", language };
  }

  return { format: "text" };
}

function contentFromText(
  text: string,
  format: ContentFormat,
  title: string | undefined,
  language?: string,
): Content {
  switch (format) {
    case "markdown":
      return { format: "markdown", markdown: text, title };
    case "code":
      return { format: "code", code: text, language, title };
    case "table": {
      const parsed = parseAuto(text);
      return { format: "table", columns: parsed.columns, rows: parsed.rows, title };
    }
    case "text":
    default:
      return { format: "text", text, title };
  }
}

export function createFileProvider(
  filePath: string,
  options: CreateProviderOptions = {},
): ContentProvider {
  return {
    async load(): Promise<Content> {
      const detected = detectFormat(filePath);
      const format = options.renderer ?? detected.format;
      const title = filePath.split("/").pop();

      const file = Bun.file(filePath);
      const text = await file.text();
      return contentFromText(text, format, title, detected.language);
    },
  };
}

export function createStdinProvider(options: CreateProviderOptions = {}): ContentProvider {
  return {
    async load(): Promise<Content> {
      const text = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text();
      const format = options.renderer ?? "markdown";
      return contentFromText(text, format, "stdin");
    },
  };
}

export function createTableFileProvider(filePath: string): ContentProvider {
  return createFileProvider(filePath, { renderer: "table" });
}

export function createTableStdinProvider(): ContentProvider {
  return createStdinProvider({ renderer: "table" });
}

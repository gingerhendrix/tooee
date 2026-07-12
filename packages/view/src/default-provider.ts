import { parseAuto } from "@tooee/renderers";
import type { Content, ContentFormat, ContentProvider } from "./types.js";

export interface CreateProviderOptions {
  renderer?: ContentFormat;
}

const detectFormat = function detectFormat(filePath: string): {
  format: ContentFormat;
  language?: string;
} {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === undefined || ext === "") {
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
    bash: "bash",
    c: "c",
    cpp: "cpp",
    css: "css",
    go: "go",
    h: "c",
    hpp: "cpp",
    html: "html",
    java: "java",
    js: "javascript",
    json: "json",
    jsx: "javascript",
    kt: "kotlin",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "bash",
    sql: "sql",
    swift: "swift",
    toml: "toml",
    ts: "typescript",
    tsx: "typescript",
    yaml: "yaml",
    yml: "yaml",
    zsh: "zsh",
  };

  const language = codeExts[ext];
  if (typeof language === "string") {
    return { format: "code", language };
  }

  return { format: "text" };
};

const contentFromText = function contentFromText(
  text: string,
  format: ContentFormat,
  title: string | undefined,
  language?: string,
): Content {
  switch (format) {
    case "markdown": {
      return { format: "markdown", markdown: text, title };
    }
    case "code": {
      return { code: text, format: "code", language, title };
    }
    case "table": {
      const parsed = parseAuto(text);
      return { columns: parsed.columns, format: "table", rows: parsed.rows, title };
    }
    case "text": {
      return { format: "text", text, title };
    }
  }
};

export const createFileProvider = function createFileProvider(
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
};

export const createStdinProvider = function createStdinProvider(
  options: CreateProviderOptions = {},
): ContentProvider {
  return {
    async load(): Promise<Content> {
      const text = await new Response(Bun.stdin.stream()).text();
      const format = options.renderer ?? "markdown";
      return contentFromText(text, format, "stdin");
    },
  };
};

export const createTableFileProvider = function createTableFileProvider(
  filePath: string,
): ContentProvider {
  return createFileProvider(filePath, { renderer: "table" });
};

export const createTableStdinProvider = function createTableStdinProvider(): ContentProvider {
  return createStdinProvider({ renderer: "table" });
};

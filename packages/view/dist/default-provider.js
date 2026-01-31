function detectFormat(filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (!ext)
        return { format: "text" };
    const markdownExts = new Set(["md", "mdx", "markdown"]);
    if (markdownExts.has(ext))
        return { format: "markdown" };
    const codeExts = {
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
    if (language)
        return { format: "code", language };
    return { format: "text" };
}
export function createFileProvider(filePath) {
    return {
        async load() {
            const file = Bun.file(filePath);
            const body = await file.text();
            const { format, language } = detectFormat(filePath);
            const title = filePath.split("/").pop();
            return { body, format, language, title };
        },
    };
}
export function createStdinProvider() {
    return {
        async load() {
            const chunks = [];
            const reader = Bun.stdin.stream().getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                chunks.push(decoder.decode(value, { stream: true }));
            }
            const body = chunks.join("");
            return { body, format: "markdown", title: "stdin" };
        },
    };
}
//# sourceMappingURL=default-provider.js.map
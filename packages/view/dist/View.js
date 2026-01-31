import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
import { useState, useEffect } from "react";
import { useRenderer } from "@opentui/react";
import { MarkdownView, CodeView, StatusBar, TitleBar, useVimNavigation, copyToClipboard } from "@tooee/react";
import { CommandProvider, useCommand } from "@tooee/commands";
export function View({ contentProvider, interactionHandler }) {
    return (_jsx(CommandProvider, { children: _jsx(ViewInner, { contentProvider: contentProvider, interactionHandler: interactionHandler }) }));
}
function ViewInner({ contentProvider, interactionHandler }) {
    const [content, setContent] = useState(null);
    const [error, setError] = useState(null);
    const renderer = useRenderer();
    useEffect(() => {
        const result = contentProvider.load();
        if (result instanceof Promise) {
            result.then(setContent).catch((e) => setError(e.message));
        }
        else {
            setContent(result);
        }
    }, [contentProvider]);
    const lineCount = content?.body.split("\n").length ?? 0;
    const nav = useVimNavigation({
        totalLines: lineCount,
        viewportHeight: 40,
    });
    useCommand({
        id: "quit",
        title: "Quit",
        hotkey: "q",
        handler: () => {
            renderer.exit();
        },
    });
    useCommand({
        id: "copy",
        title: "Copy to clipboard",
        hotkey: "y",
        handler: () => {
            if (content) {
                void copyToClipboard(content.body);
            }
        },
    });
    // Register custom actions
    if (interactionHandler) {
        for (const action of interactionHandler.actions) {
            useCommand({
                id: action.id,
                title: action.title,
                hotkey: action.hotkey,
                handler: () => {
                    if (content) {
                        action.handler(content);
                    }
                },
            });
        }
    }
    if (error) {
        return (_jsx("box", { style: { flexDirection: "column" }, children: _jsx("text", { content: `Error: ${error}`, style: { fg: "#f7768e" } }) }));
    }
    if (!content) {
        return (_jsx("box", { children: _jsx("text", { content: "Loading...", style: { fg: "#565f89" } }) }));
    }
    const renderContent = () => {
        switch (content.format) {
            case "markdown":
                return _jsx(MarkdownView, { content: content.body });
            case "code":
                return _jsx(CodeView, { content: content.body, language: content.language });
            case "text":
                return _jsx("text", { content: content.body, style: { fg: "#c0caf5" } });
        }
    };
    return (_jsxs("box", { style: { flexDirection: "column", flexGrow: 1 }, children: [content.title && _jsx(TitleBar, { title: content.title, subtitle: content.format }), _jsx("scrollbox", { style: { flexGrow: 1 }, scrollTop: nav.scrollOffset, children: renderContent() }), _jsx(StatusBar, { items: [
                    { label: "Format:", value: content.format },
                    { label: "Lines:", value: String(lineCount) },
                    { label: "Scroll:", value: String(nav.scrollOffset) },
                    ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
                ] })] }));
}
//# sourceMappingURL=View.js.map
import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRenderer } from "@opentui/react";
import { MarkdownView, StatusBar, copyToClipboard, useVimNavigation } from "@tooee/react";
import { CommandProvider, useCommand } from "@tooee/commands";
export function Request(props) {
    return (_jsx(CommandProvider, { children: _jsx(RequestInner, { ...props }) }));
}
function RequestInner({ contentProvider, interactionHandler, initialInput }) {
    const [phase, setPhase] = useState(initialInput ? "streaming" : "input");
    const [input, setInput] = useState(initialInput ?? "");
    const [response, setResponse] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const abortRef = useRef(null);
    const renderer = useRenderer();
    const lineCount = response.split("\n").length;
    const nav = useVimNavigation({
        totalLines: lineCount,
        viewportHeight: 40,
    });
    const startStream = useCallback(async (query) => {
        setPhase("streaming");
        setResponse("");
        setAutoScroll(true);
        const abort = new AbortController();
        abortRef.current = abort;
        try {
            for await (const chunk of contentProvider.submit(query)) {
                if (abort.signal.aborted)
                    break;
                setResponse((prev) => prev + chunk.delta);
            }
            if (!abort.signal.aborted) {
                setPhase("complete");
            }
        }
        catch {
            setPhase("complete");
        }
    }, [contentProvider]);
    useEffect(() => {
        if (initialInput) {
            void startStream(initialInput);
        }
    }, [initialInput, startStream]);
    useCommand({
        id: "quit",
        title: "Quit",
        hotkey: "q",
        when: () => phase !== "input",
        handler: () => {
            abortRef.current?.abort();
            renderer.exit();
        },
    });
    useCommand({
        id: "copy",
        title: "Copy response",
        hotkey: "y",
        when: () => phase === "complete",
        handler: () => {
            void copyToClipboard(response);
        },
    });
    useCommand({
        id: "cancel-stream",
        title: "Cancel stream",
        hotkey: "ctrl+c",
        when: () => phase === "streaming",
        handler: () => {
            abortRef.current?.abort();
            setPhase("complete");
        },
    });
    useCommand({
        id: "new-request",
        title: "New request",
        hotkey: "ctrl+n",
        when: () => phase === "complete",
        handler: () => {
            setPhase("input");
            setInput("");
            setResponse("");
        },
    });
    // Register custom actions
    if (interactionHandler) {
        for (const action of interactionHandler.actions) {
            useCommand({
                id: action.id,
                title: action.title,
                hotkey: action.hotkey,
                when: () => phase === "complete",
                handler: () => {
                    action.handler(input, response);
                },
            });
        }
    }
    const handleSubmit = () => {
        if (input.trim()) {
            void startStream(input);
        }
    };
    if (phase === "input") {
        return (_jsxs("box", { style: { flexDirection: "column" }, children: [_jsx("text", { content: "Enter your request:", style: { fg: "#7aa2f7", marginBottom: 1 } }), _jsx("input", { value: input, onChange: setInput, onSubmit: handleSubmit, placeholder: "Type your request...", style: { fg: "#c0caf5" } })] }));
    }
    return (_jsxs("box", { style: { flexDirection: "column", flexGrow: 1 }, children: [_jsxs("scrollbox", { style: { flexGrow: 1 }, scrollTop: autoScroll ? undefined : nav.scrollOffset, children: [_jsx(MarkdownView, { content: response }), phase === "streaming" && (_jsx("text", { content: "\u258D", style: { fg: "#7aa2f7" } }))] }), _jsx(StatusBar, { items: [
                    { label: "Status:", value: phase === "streaming" ? "streaming" : "complete" },
                    { label: "Lines:", value: String(lineCount) },
                    ...(phase === "streaming"
                        ? [{ label: "Ctrl+C", value: "cancel" }]
                        : [
                            { label: "y", value: "copy" },
                            { label: "Ctrl+N", value: "new" },
                            { label: "q", value: "quit" },
                        ]),
                ] })] }));
}
//# sourceMappingURL=Request.js.map
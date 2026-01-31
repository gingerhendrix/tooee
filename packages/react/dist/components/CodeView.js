import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
export function CodeView({ content, language, showLineNumbers = true }) {
    const lines = content.split("\n");
    return (_jsxs("box", { style: {
            flexDirection: "column",
            border: true,
            borderColor: "#414868",
            backgroundColor: "#16161e",
            padding: 1,
        }, children: [language && (_jsx("text", { content: language, style: { fg: "#565f89", marginBottom: 1 } })), lines.map((line, index) => (_jsxs("box", { style: { flexDirection: "row" }, children: [showLineNumbers && (_jsx("text", { content: String(index + 1).padStart(4, " ") + " ", style: { fg: "#565f89" } })), _jsx("text", { content: line, style: { fg: "#9ece6a" } })] }, index)))] }));
}
//# sourceMappingURL=CodeView.js.map
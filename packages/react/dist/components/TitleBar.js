import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
export function TitleBar({ title, subtitle }) {
    return (_jsxs("box", { style: {
            flexDirection: "row",
            backgroundColor: "#1f2335",
            padding: 0,
            paddingLeft: 1,
            paddingRight: 1,
        }, children: [_jsx("text", { content: title, style: { fg: "#7aa2f7" } }), subtitle && (_jsx("text", { content: ` — ${subtitle}`, style: { fg: "#565f89" } }))] }));
}
//# sourceMappingURL=TitleBar.js.map
import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
export function StatusBar({ items }) {
    return (_jsx("box", { style: {
            flexDirection: "row",
            backgroundColor: "#1f2335",
            padding: 0,
            paddingLeft: 1,
            paddingRight: 1,
        }, children: items.map((item, index) => (_jsxs("box", { style: { marginRight: 2, flexDirection: "row" }, children: [_jsx("text", { content: item.label, style: { fg: "#565f89" } }), item.value && (_jsx("text", { content: ` ${item.value}`, style: { fg: "#c0caf5" } }))] }, index))) }));
}
//# sourceMappingURL=StatusBar.js.map
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "@opentui/react/jsx-runtime";
import { marked } from "marked";
export function MarkdownView({ content }) {
    const tokens = marked.lexer(content);
    return _jsx(TokenList, { tokens: tokens });
}
function TokenList({ tokens }) {
    return (_jsx("box", { style: { flexDirection: "column" }, children: tokens.map((token, index) => (_jsx(TokenRenderer, { token: token }, index))) }));
}
function TokenRenderer({ token }) {
    switch (token.type) {
        case "heading":
            return _jsx(HeadingRenderer, { token: token });
        case "paragraph":
            return _jsx(ParagraphRenderer, { token: token });
        case "code":
            return _jsx(CodeBlockRenderer, { token: token });
        case "blockquote":
            return _jsx(BlockquoteRenderer, { token: token });
        case "list":
            return _jsx(ListRenderer, { token: token });
        case "hr":
            return _jsx(HorizontalRule, {});
        case "space":
            return _jsx("box", { style: { height: 1 } });
        case "html":
            return null;
        default:
            if ("text" in token && typeof token.text === "string") {
                return (_jsx("text", { content: token.text, style: { fg: "#c0caf5", marginBottom: 1 } }));
            }
            return null;
    }
}
function HeadingRenderer({ token }) {
    const headingColors = {
        1: "#7aa2f7",
        2: "#bb9af7",
        3: "#7dcfff",
        4: "#c0caf5",
        5: "#a9b1d6",
        6: "#9aa5ce",
    };
    const prefixes = {
        1: "# ",
        2: "## ",
        3: "### ",
        4: "#### ",
        5: "##### ",
        6: "###### ",
    };
    const headingText = getPlainText(token.tokens || []);
    return (_jsx("box", { style: { marginTop: 1, marginBottom: 1 }, children: _jsxs("text", { style: { fg: headingColors[token.depth] || "#c0caf5" }, children: [_jsx("span", { fg: "#565f89", children: prefixes[token.depth] }), _jsx("strong", { children: headingText })] }) }));
}
function ParagraphRenderer({ token }) {
    return (_jsx("box", { style: { marginBottom: 1 }, children: _jsx("text", { style: { fg: "#c0caf5" }, children: _jsx(InlineTokens, { tokens: token.tokens || [] }) }) }));
}
function CodeBlockRenderer({ token }) {
    return (_jsxs("box", { style: {
            marginTop: 1,
            marginBottom: 1,
            border: true,
            borderColor: "#414868",
            backgroundColor: "#16161e",
            padding: 1,
            flexDirection: "column",
        }, children: [token.lang && (_jsx("text", { content: token.lang, style: { fg: "#565f89", marginBottom: 1 } })), _jsx("text", { content: token.text, style: { fg: "#9ece6a" } })] }));
}
function BlockquoteRenderer({ token }) {
    const quoteText = token.tokens
        ? token.tokens
            .map((t) => {
            const innerTokens = "tokens" in t ? t.tokens : undefined;
            const textContent = "text" in t ? t.text : "";
            return getPlainText(innerTokens || []) || textContent || "";
        })
            .join("\n")
        : "";
    return (_jsxs("box", { style: { marginTop: 1, marginBottom: 1, paddingLeft: 2 }, children: [_jsx("text", { style: { fg: "#7aa2f7" }, content: "\u2502 " }), _jsx("text", { style: { fg: "#9aa5ce" }, content: quoteText })] }));
}
function ListRenderer({ token }) {
    return (_jsx("box", { style: { marginBottom: 1, marginLeft: 2, flexDirection: "column" }, children: token.items.map((item, index) => (_jsx(ListItemRenderer, { item: item, ordered: token.ordered, index: index + (token.start || 1) }, index))) }));
}
function ListItemRenderer({ item, ordered, index, }) {
    const bullet = ordered ? `${index}. ` : "- ";
    const itemContent = item.tokens || [];
    return (_jsxs("box", { style: { flexDirection: "row" }, children: [_jsx("text", { style: { fg: "#7aa2f7" }, content: bullet }), _jsx("box", { style: { flexShrink: 1, flexDirection: "column" }, children: itemContent.map((token, idx) => {
                    if (token.type === "text" && "tokens" in token && token.tokens) {
                        return (_jsx("text", { style: { fg: "#c0caf5" }, children: _jsx(InlineTokens, { tokens: token.tokens }) }, idx));
                    }
                    if (token.type === "paragraph" && token.tokens) {
                        return (_jsx("text", { style: { fg: "#c0caf5" }, children: _jsx(InlineTokens, { tokens: token.tokens }) }, idx));
                    }
                    if ("text" in token && typeof token.text === "string") {
                        return (_jsx("text", { style: { fg: "#c0caf5" }, content: token.text }, idx));
                    }
                    return null;
                }) })] }));
}
function HorizontalRule() {
    return (_jsx("box", { style: { marginTop: 1, marginBottom: 1 }, children: _jsx("text", { style: { fg: "#414868" }, content: "─".repeat(40) }) }));
}
function getPlainText(tokens) {
    return tokens
        .map((token) => {
        if (token.type === "text")
            return token.text;
        if (token.type === "codespan")
            return token.text;
        if ("tokens" in token && token.tokens)
            return getPlainText(token.tokens);
        if ("text" in token)
            return token.text;
        return "";
    })
        .join("");
}
function InlineTokens({ tokens }) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token)
            continue;
        const key = i;
        switch (token.type) {
            case "text":
                result.push(token.text);
                break;
            case "strong":
                result.push(_jsx("strong", { children: getPlainText(token.tokens || []) }, key));
                break;
            case "em":
                result.push(_jsx("em", { children: getPlainText(token.tokens || []) }, key));
                break;
            case "codespan":
                result.push(_jsx("span", { fg: "#9ece6a", bg: "#1f2335", children: ` ${token.text} ` }, key));
                break;
            case "link": {
                const linkToken = token;
                result.push(_jsx("u", { children: _jsx("a", { href: linkToken.href, fg: "#7aa2f7", children: getPlainText(linkToken.tokens || []) }) }, key));
                break;
            }
            case "br":
                result.push("\n");
                break;
            case "escape":
                result.push(token.text);
                break;
            case "space":
                result.push(" ");
                break;
            default:
                if ("text" in token &&
                    typeof token.text === "string") {
                    result.push(token.text);
                }
                break;
        }
    }
    return _jsx(_Fragment, { children: result });
}
//# sourceMappingURL=MarkdownView.js.map
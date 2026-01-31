import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { createContext, useContext } from "react";
export const defaultTheme = {
    name: "default",
    colors: {
        primary: "#7aa2f7",
        secondary: "#bb9af7",
        background: "#1a1b26",
        foreground: "#c0caf5",
        muted: "#565f89",
        accent: "#7dcfff",
        error: "#f7768e",
        warning: "#e0af68",
        success: "#9ece6a",
    },
    syntax: {
        keyword: "#bb9af7",
        string: "#9ece6a",
        comment: "#565f89",
        function: "#7aa2f7",
        number: "#ff9e64",
        operator: "#89ddff",
    },
    border: "single",
};
const ThemeContext = createContext(defaultTheme);
export function ThemeProvider({ theme, children }) {
    return (_jsx(ThemeContext, { value: theme ?? defaultTheme, children: children }));
}
export function useTheme() {
    return useContext(ThemeContext);
}
//# sourceMappingURL=theme.js.map
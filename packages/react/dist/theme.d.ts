import { type ReactNode } from "react";
export interface SyntaxTheme {
    keyword: string;
    string: string;
    comment: string;
    function: string;
    number: string;
    operator: string;
}
export interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
        muted: string;
        accent: string;
        error: string;
        warning: string;
        success: string;
    };
    syntax: SyntaxTheme;
    border: "single" | "double" | "rounded" | "none";
}
export declare const defaultTheme: Theme;
export interface ThemeProviderProps {
    theme?: Theme;
    children: ReactNode;
}
export declare function ThemeProvider({ theme, children }: ThemeProviderProps): ReactNode;
export declare function useTheme(): Theme;
//# sourceMappingURL=theme.d.ts.map
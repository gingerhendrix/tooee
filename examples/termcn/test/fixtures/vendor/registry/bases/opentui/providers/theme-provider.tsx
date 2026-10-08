// Test fixture standing in for termcn's ThemeProvider: it prints the theme name.
import type { ReactNode } from "react";

export const ThemeProvider = function ThemeProvider({
  theme,
  children,
}: {
  theme: { name: string };
  children?: ReactNode;
}): ReactNode {
  return (
    <box flexDirection="column">
      <text content={`termcn theme: ${theme.name}`} />
      {children}
    </box>
  );
};

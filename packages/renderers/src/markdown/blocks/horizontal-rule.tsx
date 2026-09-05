import type { ReactNode } from "react";
import type { ResolvedTheme } from "@tooee/themes";

export const HorizontalRule = function HorizontalRule({
  theme,
  indent,
}: {
  theme: ResolvedTheme;
  indent: number;
}): ReactNode {
  return (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent, marginRight: 1, marginTop: 0 }}>
      <text style={{ fg: theme.markdownHorizontalRule }} content={"─".repeat(40)} />
    </box>
  );
};

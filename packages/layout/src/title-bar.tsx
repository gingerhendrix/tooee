import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import { fitTitleBar, TITLE_BAR_SEPARATOR } from "./fit-title-bar.js";

const PADDING_X = 1;

interface TitleBarProps {
  title: string;
  subtitle?: string;
  /** Bar width in cells. Defaults to the terminal width. */
  width?: number;
}

/**
 * One-row title bar. When the bar is narrow, the subtitle shortens, then
 * hides, then the title shortens. The bar never wraps.
 */
export const TitleBar = function TitleBar({ title, subtitle, width }: TitleBarProps): ReactNode {
  const { theme } = useTheme();
  const terminal = useTerminalDimensions();
  const inner = Math.max(0, (width ?? terminal.width) - PADDING_X * 2);
  const fitted = fitTitleBar(title, subtitle, inner);

  return (
    <box
      style={{
        backgroundColor: theme.backgroundPanel,
        flexDirection: "row",
        flexShrink: 0,
        height: 1,
        overflow: "hidden",
        padding: 0,
        paddingLeft: PADDING_X,
        paddingRight: PADDING_X,
        width,
      }}
    >
      <text wrapMode="none" content={fitted.title} style={{ fg: theme.primary, flexShrink: 0 }} />
      {fitted.subtitle !== "" && (
        <text
          wrapMode="none"
          content={`${TITLE_BAR_SEPARATOR}${fitted.subtitle}`}
          style={{ fg: theme.textMuted, flexShrink: 0 }}
        />
      )}
    </box>
  );
};

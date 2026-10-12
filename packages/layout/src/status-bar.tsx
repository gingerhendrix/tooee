import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import { fitStatusBar, STATUS_BAR_GAP } from "./fit-status-bar.js";
import type { PlacedStatusItem, StatusBarItem } from "./fit-status-bar.js";

export type { StatusBarItem } from "./fit-status-bar.js";

const PADDING_X = 1;

export interface StatusBarProps {
  items: readonly StatusBarItem[];
  /** Bar width in cells. Defaults to the terminal width. */
  width?: number;
  /** Glyph that shows when items hide. `false` turns it off. Default `"⋯"`. */
  hiddenMarker?: string | false;
}

interface StatusTextProps {
  item: PlacedStatusItem;
  first: boolean;
}

const StatusText = function StatusText({ item, first }: StatusTextProps): ReactNode {
  const { theme } = useTheme();
  const gap = item.label !== "" && item.value !== "" ? " " : "";

  return (
    <text wrapMode="none" style={{ flexShrink: 0, marginLeft: first ? 0 : STATUS_BAR_GAP }}>
      <span fg={theme.textMuted}>{item.label}</span>
      {gap}
      <span fg={theme.text}>{item.value}</span>
    </text>
  );
};

/**
 * One-row status bar. Items that do not fit use their compact form, shorten,
 * or hide, lowest priority first. The bar never wraps.
 */
export const StatusBar = function StatusBar({
  items,
  width,
  hiddenMarker,
}: StatusBarProps): ReactNode {
  const { theme } = useTheme();
  const terminal = useTerminalDimensions();
  const inner = Math.max(0, (width ?? terminal.width) - PADDING_X * 2);
  const layout = fitStatusBar(items, inner, { hiddenMarker });

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
      {layout.start.map((item, index): ReactNode => (
        <StatusText key={item.key} item={item} first={index === 0} />
      ))}
      {layout.marker !== null && (
        <text
          wrapMode="none"
          content={layout.marker}
          style={{
            fg: theme.textMuted,
            flexShrink: 0,
            marginLeft: layout.start.length > 0 ? STATUS_BAR_GAP : 0,
          }}
        />
      )}
      {layout.end.length > 0 && (
        <box
          style={{
            flexGrow: 1,
            minWidth: layout.start.length > 0 || layout.marker !== null ? STATUS_BAR_GAP : 0,
          }}
        />
      )}
      {layout.end.map((item, index): ReactNode => (
        <StatusText key={item.key} item={item} first={index === 0} />
      ))}
    </box>
  );
};

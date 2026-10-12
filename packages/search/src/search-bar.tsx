import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

export interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  /**
   * @deprecated The bar never calls this. Escape reaches the `search-cancel`
   * command that `useSearchBindings` registers, and that command cancels the
   * search. The prop will be removed in a later release.
   */
  onCancel?: () => void;
  matchCount?: number;
  currentMatch?: number;
}

export const SearchBar = function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  matchCount,
  currentMatch,
}: SearchBarProps): ReactNode {
  const { theme } = useTheme();

  let matchDisplay = "";

  if (matchCount !== undefined && matchCount > 0) {
    matchDisplay = `${(currentMatch ?? 0) + 1}/${matchCount}`;
  } else if (matchCount === 0 && query.length > 0) {
    matchDisplay = "No matches";
  }

  return (
    <box
      style={{
        backgroundColor: theme.backgroundPanel,
        flexDirection: "row",
        flexShrink: 0,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text content="/" style={{ fg: theme.accent }} />
      <input
        value={query}
        focused
        onInput={onQueryChange}
        onSubmit={onSubmit}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        textColor={theme.text}
        cursorColor={theme.accent}
        cursorStyle={{ blinking: true, style: "line" }}
        style={{ flexGrow: 1 }}
      />
      {matchDisplay ? <text content={` ${matchDisplay}`} style={{ fg: theme.textMuted }} /> : null}
    </box>
  );
};

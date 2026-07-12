import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useTheme } from "@tooee/themes";
import { ChooseHighlightedText } from "./ChooseHighlightedText.js";
import type { FuzzyMatch } from "./fuzzy.js";
import type { ChooseItem } from "./types.js";
import type { UseChooseResult } from "./use-choose.js";

export interface ChooseItemRenderContext {
  item: ChooseItem;
  match: FuzzyMatch;
  index: number;
  originalIndex: number;
  positions: number[];
  isActive: boolean;
  isSelected: boolean;
  defaultContent: ReactNode;
}

export interface ChooseListProps {
  choose: UseChooseResult;
  /** Fullscreen defaults to activate; picker overlays default to submit. */
  rowClick?: "activate" | "submit" | "none";
  renderItem?: (context: ChooseItemRenderContext) => ReactNode;
  loadingContent?: ReactNode;
  errorContent?: (error: string) => ReactNode;
  emptyContent?: ReactNode;
  /** Mouse guard for visible rows covered by another surface. */
  suspended?: boolean;
}

const ThemedLine = function ThemedLine({
  content,
  color,
}: {
  content: ReactNode;
  color: string;
}): ReactNode {
  return (
    <box height={1} style={{ paddingLeft: 2 }}>
      {typeof content === "string" ? <text content={content} fg={color} /> : content}
    </box>
  );
};

const defaultErrorContent = function defaultErrorContent(error: string): ReactNode {
  return `Error: ${error}`;
};

/** Scrollable chooser rows plus loading/error/empty presentation. */
export const ChooseList = function ChooseList({
  choose,
  rowClick = "activate",
  renderItem,
  loadingContent = "Loading...",
  errorContent = defaultErrorContent,
  emptyContent,
  suspended,
}: ChooseListProps): ReactNode {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { state, controller } = choose;
  const interactionSuspended = choose.view.suspended || (suspended ?? false);

  useEffect(() => {
    if (scrollRef.current && state.matches.length > 0) {
      scrollRef.current.scrollTop = Math.max(0, state.activeIndex - 5);
    }
  }, [state.activeIndex, state.matches.length]);

  return (
    <scrollbox ref={scrollRef} flexDirection="column" style={{ flexGrow: 1 }} focused={false}>
      {state.loading && <ThemedLine content={loadingContent} color={theme.textMuted} />}

      {!state.loading && state.error !== null && state.error !== "" && (
        <ThemedLine content={errorContent(state.error)} color={theme.error} />
      )}

      {!state.loading &&
        (state.error?.length ?? 0) === 0 &&
        state.matches.length === 0 &&
        emptyContent != null && <ThemedLine content={emptyContent} color={theme.textMuted} />}

      {state.matches.map((match, index): ReactNode => {
        const isActive = index === state.activeIndex;
        const isSelected = state.selectedOriginalIndices.has(match.originalIndex);
        const defaultContent = (
          <>
            {state.multi && (
              <text
                content={isSelected ? "✓ " : "  "}
                fg={isSelected ? theme.accent : theme.textMuted}
              />
            )}
            {(match.item.icon?.length ?? 0) > 0 && (
              <text content={`${match.item.icon} `} fg={theme.textMuted} />
            )}
            <text fg={isActive ? theme.primary : theme.text}>
              <ChooseHighlightedText
                text={match.item.text}
                positions={match.positions}
                highlightColor={theme.warning}
              />
            </text>
            {(match.item.description?.length ?? 0) > 0 && (
              <text content={`  ${match.item.description}`} fg={theme.textMuted} />
            )}
          </>
        );
        const context: ChooseItemRenderContext = {
          defaultContent,
          index,
          isActive,
          isSelected,
          item: match.item,
          match,
          originalIndex: match.originalIndex,
          positions: match.positions,
        };

        return (
          <box
            key={match.originalIndex}
            flexDirection="row"
            height={1}
            backgroundColor={isActive ? theme.backgroundElement : undefined}
            style={{ paddingLeft: 1 }}
            onMouseDown={(event) => {
              if (interactionSuspended || event.button !== 0 || rowClick === "none") {
                return;
              }
              if (rowClick === "submit") {
                event.preventDefault();
                event.stopPropagation();
                controller.setActiveIndex(index);
                controller.submit();
              } else {
                controller.setActiveIndex(index);
              }
            }}
          >
            {renderItem ? renderItem(context) : defaultContent}
          </box>
        );
      })}
    </scrollbox>
  );
};

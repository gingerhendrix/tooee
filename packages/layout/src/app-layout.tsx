import type { ReactNode, RefObject } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TitleBar } from "./title-bar.js";
import { StatusBar } from "./status-bar.js";
import type { StatusBarItem } from "./status-bar.js";
import { SearchBar } from "@tooee/search";
import type { SearchState } from "@tooee/search";
import { useTheme } from "@tooee/themes";
import { useCurrentOverlay } from "@tooee/overlays";
import { ToastContainer } from "@tooee/toasts";

export interface AppLayoutScroll {
  ref: RefObject<ScrollBoxRenderable | null>;
  stickyScroll?: boolean;
  stickyStart?: "bottom" | "top";
  focused?: boolean;
}

export interface AppLayoutProps {
  titleBar?: { title: string; subtitle?: string };
  statusBar: { items: StatusBarItem[] };
  /** Configure the optional scrollbox used for the main content. */
  scroll?: AppLayoutScroll;
  /** @deprecated Use `scroll.ref` instead. */
  scrollRef?: RefObject<ScrollBoxRenderable | null>;
  /** @deprecated Move these options into `scroll`. */
  scrollProps?: {
    stickyScroll?: boolean;
    stickyStart?: "bottom" | "top";
    focused?: boolean;
  };
  searchBar?: SearchState;
  children: ReactNode;
}

const hasRenderableOverlay = function hasRenderableOverlay(overlay: ReactNode): boolean {
  return (
    overlay !== null &&
    overlay !== undefined &&
    overlay !== false &&
    overlay !== "" &&
    overlay !== 0 &&
    overlay !== 0n
  );
};

export const AppLayout = function AppLayout({
  titleBar,
  statusBar,
  scroll,
  // oxlint-disable-next-line typescript/no-deprecated -- compatibility alias remains supported during its deprecation window
  scrollRef,
  // oxlint-disable-next-line typescript/no-deprecated -- compatibility alias remains supported during its deprecation window
  scrollProps,
  searchBar,
  children,
}: AppLayoutProps): ReactNode {
  const { theme } = useTheme();
  const contextOverlay = useCurrentOverlay();
  const resolvedScrollRef = scroll?.ref ?? scrollRef;
  const resolvedScrollProps = scroll ?? scrollProps;
  const handleSearchQueryChange = (query: string): void => {
    searchBar?.setSearchQuery(query);
  };
  const handleSearchSubmit = (): void => {
    searchBar?.submitSearch();
  };
  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.background}>
      {titleBar && <TitleBar title={titleBar.title} subtitle={titleBar.subtitle} />}
      <box style={{ flexGrow: 1, position: "relative" }}>
        {resolvedScrollRef ? (
          <scrollbox
            ref={resolvedScrollRef}
            style={{ flexGrow: 1 }}
            stickyScroll={resolvedScrollProps?.stickyScroll}
            stickyStart={resolvedScrollProps?.stickyStart}
            focused={resolvedScrollProps?.focused ?? true}
          >
            {children}
          </scrollbox>
        ) : (
          <box style={{ flexGrow: 1, overflow: "hidden" }}>{children}</box>
        )}
        {hasRenderableOverlay(contextOverlay) && (
          <box position="absolute" left={0} top={0} width="100%" height="100%">
            {contextOverlay}
          </box>
        )}
        <ToastContainer />
      </box>
      {searchBar?.searchActive === true ? (
        <SearchBar
          query={searchBar.searchQuery}
          onQueryChange={handleSearchQueryChange}
          onSubmit={handleSearchSubmit}
          onCancel={() => {
            searchBar.setSearchQuery("");
          }}
          matchCount={searchBar.matchingLines.length}
          currentMatch={searchBar.currentMatchIndex}
        />
      ) : (
        <StatusBar items={statusBar.items} />
      )}
    </box>
  );
};

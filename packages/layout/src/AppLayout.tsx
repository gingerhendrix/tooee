import type { ReactNode, RefObject } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { TitleBar } from "./TitleBar.js"
import { StatusBar } from "./StatusBar.js"
import type { StatusBarItem } from "./StatusBar.js"
import { SearchBar } from "@tooee/search"
import type { SearchState } from "@tooee/search"
import { useTheme } from "@tooee/themes"
import { useCurrentOverlay } from "@tooee/overlays"
import { ToastContainer } from "@tooee/toasts"

export interface AppLayoutProps {
  titleBar?: { title: string; subtitle?: string }
  statusBar: { items: StatusBarItem[] }
  scrollRef?: RefObject<ScrollBoxRenderable | null>
  scrollProps?: {
    stickyScroll?: boolean
    stickyStart?: "bottom" | "top"
    focused?: boolean
  }
  searchBar?: SearchState
  overlay?: ReactNode
  children: ReactNode
}

export function AppLayout({
  titleBar,
  statusBar,
  scrollRef,
  scrollProps,
  searchBar,
  overlay,
  children,
}: AppLayoutProps) {
  const { theme } = useTheme()
  const contextOverlay = useCurrentOverlay()
  const activeOverlay = overlay ?? contextOverlay
  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.background}>
      {titleBar && <TitleBar title={titleBar.title} subtitle={titleBar.subtitle} />}
      <box style={{ flexGrow: 1, position: "relative" }}>
        {scrollRef ? (
          <scrollbox
            ref={scrollRef}
            style={{ flexGrow: 1 }}
            stickyScroll={scrollProps?.stickyScroll}
            stickyStart={scrollProps?.stickyStart}
            focused={scrollProps?.focused ?? true}
          >
            {children}
          </scrollbox>
        ) : (
          <box style={{ flexGrow: 1, overflow: "hidden" }}>{children}</box>
        )}
        {activeOverlay && (
          <box position="absolute" left={0} top={0} width="100%" height="100%">
            {activeOverlay}
          </box>
        )}
        <ToastContainer />
      </box>
      {searchBar?.searchActive ? (
        <SearchBar
          query={searchBar.searchQuery}
          onQueryChange={searchBar.setSearchQuery}
          onSubmit={searchBar.submitSearch}
          onCancel={() => searchBar.setSearchQuery("")}
          matchCount={searchBar.matchingLines.length}
          currentMatch={searchBar.currentMatchIndex}
        />
      ) : (
        <StatusBar items={statusBar.items} />
      )}
    </box>
  )
}

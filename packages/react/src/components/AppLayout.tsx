import type { ReactNode, RefObject } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { TitleBar } from "./TitleBar.tsx"
import { StatusBar } from "./StatusBar.tsx"
import type { StatusBarItem } from "./StatusBar.tsx"
import { SearchBar } from "./SearchBar.tsx"
import type { SearchBarProps } from "./SearchBar.tsx"
import { useTheme } from "../theme.tsx"
import { useCurrentOverlay } from "../overlay-context.tsx"

export interface AppLayoutSearchBar extends SearchBarProps {
  active: boolean
}

export interface AppLayoutProps {
  titleBar?: { title: string; subtitle?: string }
  statusBar: { items: StatusBarItem[] }
  scrollRef?: RefObject<ScrollBoxRenderable | null>
  scrollProps?: {
    stickyScroll?: boolean
    stickyStart?: "bottom" | "top"
    focused?: boolean
  }
  searchBar?: AppLayoutSearchBar
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
        <scrollbox
          ref={scrollRef}
          style={{ flexGrow: 1 }}
          stickyScroll={scrollProps?.stickyScroll}
          stickyStart={scrollProps?.stickyStart}
          focused={scrollProps?.focused ?? true}
        >
          {children}
        </scrollbox>
        {activeOverlay && (
          <box position="absolute" left={0} top={0} width="100%" height="100%">
            {activeOverlay}
          </box>
        )}
      </box>
      {searchBar?.active ? (
        <SearchBar
          query={searchBar.query}
          onQueryChange={searchBar.onQueryChange}
          onSubmit={searchBar.onSubmit}
          onCancel={searchBar.onCancel}
          matchCount={searchBar.matchCount}
          currentMatch={searchBar.currentMatch}
        />
      ) : (
        <StatusBar items={statusBar.items} />
      )}
    </box>
  )
}

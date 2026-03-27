import type { ReactNode } from "react"
import { AppLayout, type StatusBarItem } from "@tooee/layout"
import type { ModalNavigationState } from "@tooee/shell"
import type { AnyContent } from "../types.js"

interface SubviewLayoutProps {
  content: AnyContent
  nav: ModalNavigationState
  streaming: boolean
  themeName: string
  extraStatusItems?: StatusBarItem[]
  children: ReactNode
}

export function SubviewLayout({
  content,
  nav,
  streaming,
  themeName,
  extraStatusItems,
  children,
}: SubviewLayoutProps) {
  const statusItems = [
    { label: "Theme:", value: themeName },
    ...(extraStatusItems ?? []),
    { label: "Mode:", value: nav.mode },
    { label: "Cursor:", value: nav.cursor ? String(nav.cursor.line) : "-" },
    ...(streaming ? [{ label: "Status:", value: "streaming" }] : []),
    ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
  ]

  return (
    <AppLayout
      titleBar={
        content.title
          ? { title: content.title, subtitle: content.format }
          : { title: content.format }
      }
      statusBar={{ items: statusItems }}
      searchBar={{
        active: nav.searchActive,
        query: nav.searchQuery,
        onQueryChange: nav.setSearchQuery,
        onSubmit: nav.submitSearch,
        onCancel: () => {
          nav.setSearchQuery("")
        },
        matchCount: nav.matchingLines.length,
        currentMatch: nav.currentMatchIndex,
      }}
    >
      {children}
    </AppLayout>
  )
}

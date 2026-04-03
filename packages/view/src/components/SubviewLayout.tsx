import type { ReactNode } from "react"
import { AppLayout, type StatusBarItem } from "@tooee/layout"
import { useMode } from "@tooee/commands"
import type { NavigationState } from "@tooee/shell"
import type { SearchState } from "@tooee/search"
import type { AnyContent } from "../types.js"

interface SubviewLayoutProps {
  content: AnyContent
  nav: NavigationState & SearchState
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
  const mode = useMode()
  const statusItems = [
    { label: "Theme:", value: themeName },
    ...(extraStatusItems ?? []),
    { label: "Mode:", value: mode },
    { label: "Cursor:", value: nav.cursor !== null ? String(nav.cursor) : "-" },
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
      searchBar={nav}
    >
      {children}
    </AppLayout>
  )
}

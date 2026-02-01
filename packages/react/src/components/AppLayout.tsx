import type { ReactNode, RefObject } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { TitleBar } from "./TitleBar.tsx"
import { StatusBar } from "./StatusBar.tsx"
import type { StatusBarItem } from "./StatusBar.tsx"

interface AppLayoutProps {
  titleBar?: { title: string; subtitle?: string }
  statusBar: { items: StatusBarItem[] }
  scrollRef?: RefObject<ScrollBoxRenderable | null>
  scrollProps?: {
    stickyScroll?: boolean
    stickyStart?: "bottom" | "top"
    focused?: boolean
  }
  children: ReactNode
}

export function AppLayout({ titleBar, statusBar, scrollRef, scrollProps, children }: AppLayoutProps) {
  return (
    <box flexDirection="column" width="100%" height="100%">
      {titleBar && <TitleBar title={titleBar.title} subtitle={titleBar.subtitle} />}
      <scrollbox
        ref={scrollRef}
        style={{ flexGrow: 1 }}
        stickyScroll={scrollProps?.stickyScroll}
        stickyStart={scrollProps?.stickyStart}
        focused={scrollProps?.focused ?? true}
      >
        {children}
      </scrollbox>
      <StatusBar items={statusBar.items} />
    </box>
  )
}

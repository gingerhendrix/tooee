import type { ReactNode, RefObject } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { TitleBar } from "./TitleBar.tsx"
import { StatusBar } from "./StatusBar.tsx"
import type { StatusBarItem } from "./StatusBar.tsx"
import { useTheme } from "../theme.tsx"

interface AppLayoutProps {
  titleBar?: { title: string; subtitle?: string }
  statusBar: { items: StatusBarItem[] }
  scrollRef?: RefObject<ScrollBoxRenderable | null>
  scrollProps?: {
    stickyScroll?: boolean
    stickyStart?: "bottom" | "top"
    focused?: boolean
  }
  overlay?: ReactNode
  children: ReactNode
}

export function AppLayout({ titleBar, statusBar, scrollRef, scrollProps, overlay, children }: AppLayoutProps) {
  const { theme } = useTheme()
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
        {overlay && (
          <box position="absolute" left={0} top={0} width="100%" height="100%">
            {overlay}
          </box>
        )}
      </box>
      <StatusBar items={statusBar.items} />
    </box>
  )
}

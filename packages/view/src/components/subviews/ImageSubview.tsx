import { useMemo } from "react"
import { ImageView } from "@tooee/renderers"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useNavigation } from "@tooee/shell"
import { useSearch } from "@tooee/search"
import type { ImageContent } from "../../types.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface ImageSubviewProps extends SubviewProps {
  content: ImageContent
}

export function ImageSubview({
  content,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  reload,
  streaming,
  actions,
}: ImageSubviewProps) {
  const nav = useNavigation({
    rowCount: 0,
    multiSelect: false,
  })
  const search = useSearch({
    match: () => [],
    onJump: () => {},
  })
  const layoutNav = { ...nav, ...search }

  const { themeName } = useViewCommands({ content, textContent: content.src, actions })

  useViewCommandContext({
    content,
    nav,
    reload,
    providerMarks,
    userMarks,
    setMarkSet,
    clearMarkNamespace,
    clearAllUserMarks,
  })

  const extraStatusItems = useMemo(
    () => [{ label: "Format:", value: content.format }],
    [content.format],
  )

  return (
    <SubviewLayout
      content={content}
      nav={layoutNav}
      streaming={streaming}
      themeName={themeName}
      extraStatusItems={extraStatusItems}
    >
      <ImageView src={content.src} />
    </SubviewLayout>
  )
}

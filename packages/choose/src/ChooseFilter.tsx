import type { ReactNode } from "react"
import { CloseButton, useTheme } from "@tooee/themes"
import type { UseChooseResult } from "./use-choose.js"

export interface ChooseFilterProps {
  choose: UseChooseResult
  prompt?: ReactNode
  placeholder?: string
  right?: ReactNode
  onClose?: () => void
}

/** Controlled filter row shared by fullscreen and overlay chooser assemblies. */
export function ChooseFilter({
  choose,
  prompt = "> ",
  placeholder = "Filter...",
  right,
  onClose,
}: ChooseFilterProps) {
  const { theme } = useTheme()
  const { state, view } = choose

  return (
    <box flexDirection="row" height={1} style={{ paddingLeft: 1, paddingRight: 1 }}>
      {typeof prompt === "string" ? <text content={prompt} fg={theme.accent} /> : prompt}
      <input
        ref={view.filterRef}
        focused={view.filterFocused}
        value={state.filterQuery}
        placeholder={placeholder}
        onInput={view.onFilterInput}
        onKeyDown={view.onFilterKeyDown}
        backgroundColor="transparent"
        textColor={theme.text}
        placeholderColor={theme.textMuted}
        cursorColor={theme.primary}
        style={{ flexGrow: 1 }}
      />
      <text content={` ${state.matches.length}/${state.items.length}`} fg={theme.textMuted} />
      {right}
      {onClose && <CloseButton onClose={onClose} />}
    </box>
  )
}

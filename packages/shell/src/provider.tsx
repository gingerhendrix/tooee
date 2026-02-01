import type { ReactNode } from "react"
import { ThemeSwitcherProvider } from "@tooee/react"
import { CommandProvider } from "@tooee/commands"

export function TooeeProvider({ children, leader }: { children: ReactNode; leader?: string }) {
  return (
    <ThemeSwitcherProvider>
      <CommandProvider leader={leader}>
        {children}
      </CommandProvider>
    </ThemeSwitcherProvider>
  )
}

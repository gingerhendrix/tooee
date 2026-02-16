import type { ReactNode } from "react"
import { ConfigProvider, useConfig, type TooeeConfig } from "@tooee/config"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { CommandProvider, type Mode } from "@tooee/commands"
import { OverlayProvider } from "./overlay.jsx"

export interface TooeeProviderProps {
  children: ReactNode
  leader?: string
  config?: Partial<TooeeConfig>
  initialMode?: Mode
}

export function TooeeProvider({
  children,
  leader,
  config: configOverrides,
  initialMode,
}: TooeeProviderProps) {
  return (
    <ConfigProvider overrides={configOverrides}>
      <TooeeProviderInner leader={leader} initialMode={initialMode}>
        {children}
      </TooeeProviderInner>
    </ConfigProvider>
  )
}

function TooeeProviderInner({
  children,
  leader,
  initialMode,
}: {
  children: ReactNode
  leader?: string
  initialMode?: Mode
}) {
  const config = useConfig()
  return (
    <ThemeSwitcherProvider initialTheme={config.theme?.name} initialMode={config.theme?.mode}>
      <CommandProvider leader={leader} keymap={config.keys} initialMode={initialMode}>
        <OverlayProvider>{children}</OverlayProvider>
      </CommandProvider>
    </ThemeSwitcherProvider>
  )
}

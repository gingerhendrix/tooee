import type { ReactNode } from "react"
import { ConfigProvider, useConfig, type TooeeConfig } from "@tooee/config"
import { ThemeSwitcherProvider } from "@tooee/react"
import { CommandProvider } from "@tooee/commands"

export interface TooeeProviderProps {
  children: ReactNode
  leader?: string
  config?: Partial<TooeeConfig>
}

export function TooeeProvider({ children, leader, config: configOverrides }: TooeeProviderProps) {
  return (
    <ConfigProvider overrides={configOverrides}>
      <TooeeProviderInner leader={leader}>
        {children}
      </TooeeProviderInner>
    </ConfigProvider>
  )
}

function TooeeProviderInner({ children, leader }: { children: ReactNode; leader?: string }) {
  const config = useConfig()
  return (
    <ThemeSwitcherProvider
      initialTheme={config.theme?.name}
      initialMode={config.theme?.mode}
    >
      <CommandProvider leader={leader}>
        {children}
      </CommandProvider>
    </ThemeSwitcherProvider>
  )
}

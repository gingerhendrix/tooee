import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { TooeeConfig } from "./types.js"
import { loadConfig } from "./load.js"

const DEFAULTS: TooeeConfig = {
  theme: {
    name: "tokyonight",
    mode: "dark",
  },
}

const ConfigContext = createContext<TooeeConfig>(DEFAULTS)

export function ConfigProvider({
  overrides,
  children,
}: {
  overrides?: Partial<TooeeConfig>
  children: ReactNode
}) {
  const config = useMemo(() => loadConfig(overrides), [overrides])
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig(): TooeeConfig {
  return useContext(ConfigContext)
}

export function useThemeConfig(): TooeeConfig["theme"] {
  return useConfig().theme
}

export function useKeymapConfig(): Record<string, string> {
  return useConfig().keys ?? {}
}

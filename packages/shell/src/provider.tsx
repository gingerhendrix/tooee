import type { ReactNode } from "react"
import { ConfigProvider, useConfig, type TooeeConfig } from "@tooee/config"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { CommandProvider, useProvideCommandContext, type Mode } from "@tooee/commands"
import { ToastProvider, useToast, type ToastController } from "@tooee/toasts"
import { OverlayProvider } from "./overlay.js"

declare module "@tooee/commands" {
  interface CommandContext {
    toast: ToastController
  }
}

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
        <ToastProvider>
          <ToastContextBridge>
            <OverlayProvider>{children}</OverlayProvider>
          </ToastContextBridge>
        </ToastProvider>
      </CommandProvider>
    </ThemeSwitcherProvider>
  )
}

function ToastContextBridge({ children }: { children: ReactNode }) {
  const toastController = useToast()

  useProvideCommandContext(() => ({
    toast: toastController,
  }))

  return <>{children}</>
}

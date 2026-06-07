import type { ReactNode } from "react"
import { ConfigProvider, useConfig, type TooeeConfig } from "@tooee/config"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { CommandProvider, useProvideCommandContext, type Mode } from "@tooee/commands"
import { ToastProvider, useToast, type ToastController } from "@tooee/toasts"
import { OverlayProvider } from "./overlay.js"
import { CommandPaletteProvider } from "./command-palette-provider.js"
import { WhichKeyProvider } from "./which-key-provider.js"
import { useCopyOnSelect } from "./copy-on-select.js"
import { useDebugConsoleCommand } from "./commands.js"

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
  sequenceTimeoutMs?: number
}

export function TooeeProvider({
  children,
  leader,
  config: configOverrides,
  initialMode,
  sequenceTimeoutMs,
}: TooeeProviderProps) {
  return (
    <ConfigProvider overrides={configOverrides}>
      <TooeeProviderInner
        leader={leader}
        initialMode={initialMode}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        {children}
      </TooeeProviderInner>
    </ConfigProvider>
  )
}

function TooeeProviderInner({
  children,
  leader,
  initialMode,
  sequenceTimeoutMs,
}: {
  children: ReactNode
  leader?: string
  initialMode?: Mode
  sequenceTimeoutMs?: number
}) {
  const config = useConfig()
  return (
    <ThemeSwitcherProvider initialTheme={config.theme?.name} initialMode={config.theme?.mode}>
      <CommandProvider
        leader={leader}
        keymap={config.keys}
        initialMode={initialMode}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        <ToastProvider>
          <ToastContextBridge>
            <OverlayProvider>
              <WhichKeyProvider>
                <CommandPaletteProvider>{children}</CommandPaletteProvider>
              </WhichKeyProvider>
            </OverlayProvider>
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

  useCopyOnSelect()
  useDebugConsoleCommand()

  return <>{children}</>
}

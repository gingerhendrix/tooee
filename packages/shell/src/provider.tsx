import type { ReactNode } from "react";
import { ConfigProvider, useConfig } from "@tooee/config";
import type { TooeeConfig } from "@tooee/config";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { CommandProvider, useProvideCommandContext } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import { ToastProvider, useToast } from "@tooee/toasts";
import type { ToastController } from "@tooee/toasts";
import { OverlayProvider } from "./overlay.js";
import { CommandPaletteProvider } from "./command-palette-provider.js";
import { WhichKeyProvider } from "./which-key-provider.js";
import { useCopyOnSelect } from "./copy-on-select.js";
import { useDebugConsoleCommand } from "./commands.js";

declare module "@tooee/commands" {
  interface CommandContext {
    toast: ToastController;
  }
}

export interface TooeeProviderProps {
  children: ReactNode;
  leader?: string;
  config?: Partial<TooeeConfig>;
  initialMode?: Mode;
  sequenceTimeoutMs?: number;
}

export const TooeeProvider = function TooeeProvider({
  children,
  leader,
  config: configOverrides,
  initialMode,
  sequenceTimeoutMs,
}: TooeeProviderProps): ReactNode {
  return (
    <ConfigProvider overrides={configOverrides}>
      {/* Deferred(lint-sweep): preserve the deliberate top-down provider composition. */}
      {/* oxlint-disable-next-line no-use-before-define -- inner provider is a lifecycle wrapper declared below */}
      <TooeeProviderInner
        leader={leader}
        initialMode={initialMode}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        {children}
        {/* oxlint-disable-next-line no-use-before-define -- inner provider is a lifecycle wrapper declared below */}
      </TooeeProviderInner>
    </ConfigProvider>
  );
};

const TooeeProviderInner = function TooeeProviderInner({
  children,
  leader,
  initialMode,
  sequenceTimeoutMs,
}: {
  children: ReactNode;
  leader?: string;
  initialMode?: Mode;
  sequenceTimeoutMs?: number;
}): ReactNode {
  const config = useConfig();
  return (
    <ThemeSwitcherProvider initialTheme={config.theme?.name} initialMode={config.theme?.mode}>
      <CommandProvider
        leader={leader}
        keymap={config.keys}
        initialMode={initialMode}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        <ToastProvider>
          {/* Deferred(lint-sweep): preserve the deliberate top-down provider composition. */}
          {/* oxlint-disable-next-line no-use-before-define -- bridge is part of the wrapper's lifecycle composition */}
          <ToastContextBridge>
            <OverlayProvider>
              <WhichKeyProvider>
                <CommandPaletteProvider>{children}</CommandPaletteProvider>
              </WhichKeyProvider>
            </OverlayProvider>
            {/* oxlint-disable-next-line no-use-before-define -- bridge is part of the wrapper's lifecycle composition */}
          </ToastContextBridge>
        </ToastProvider>
      </CommandProvider>
    </ThemeSwitcherProvider>
  );
};

const ToastContextBridge = function ToastContextBridge({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const toastController = useToast();

  useProvideCommandContext(() => ({
    toast: toastController,
  }));

  useCopyOnSelect();
  useDebugConsoleCommand();

  return <>{children}</>;
};

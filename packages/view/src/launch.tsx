import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { ThemeSwitcherProvider } from "@tooee/react"
import { CommandProvider } from "@tooee/commands"
import { View } from "./View.tsx"
import type { ViewContentProvider, ViewInteractionHandler } from "./types.ts"

export interface ViewLaunchOptions {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export async function launch(options: ViewLaunchOptions): Promise<void> {
  const renderer = await createCliRenderer({
    useAlternateScreen: true,
    exitOnCtrlC: true,
  })
  createRoot(renderer).render(
    <ThemeSwitcherProvider>
      <CommandProvider>
        <View contentProvider={options.contentProvider} interactionHandler={options.interactionHandler} />
      </CommandProvider>
    </ThemeSwitcherProvider>,
  )
}

import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
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
    <View contentProvider={options.contentProvider} interactionHandler={options.interactionHandler} />,
  )
}

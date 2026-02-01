import { launchCli } from "@tooee/shell"
import { View } from "./View.tsx"
import type { ViewContentProvider, ViewInteractionHandler } from "./types.ts"

export interface ViewLaunchOptions {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export async function launch(options: ViewLaunchOptions): Promise<void> {
  await launchCli(
    <View contentProvider={options.contentProvider} interactionHandler={options.interactionHandler} />,
  )
}

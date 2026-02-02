import { launchCli } from "@tooee/shell"
import { View } from "./View.tsx"
import { DirectoryView } from "./DirectoryView.tsx"
import type { ViewContentProvider, ViewInteractionHandler } from "./types.ts"

export interface ViewLaunchOptions {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export interface DirectoryLaunchOptions {
  dirPath: string
  interactionHandler?: ViewInteractionHandler
}

export async function launch(options: ViewLaunchOptions): Promise<void> {
  await launchCli(
    <View contentProvider={options.contentProvider} interactionHandler={options.interactionHandler} />,
  )
}

export async function launchDirectory(options: DirectoryLaunchOptions): Promise<void> {
  await launchCli(
    <DirectoryView dirPath={options.dirPath} interactionHandler={options.interactionHandler} />,
  )
}

import { launchCli } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { View } from "./View.tsx"
import { DirectoryView } from "./DirectoryView.tsx"
import type { ContentProvider, ViewInteractionHandler } from "./types.ts"

export interface ViewLaunchOptions {
  contentProvider: ContentProvider
  actions?: ActionDefinition[]
  /** @deprecated Use actions instead */
  interactionHandler?: ViewInteractionHandler
}

export interface DirectoryLaunchOptions {
  dirPath: string
  actions?: ActionDefinition[]
  /** @deprecated Use actions instead */
  interactionHandler?: ViewInteractionHandler
}

export async function launch(options: ViewLaunchOptions): Promise<void> {
  await launchCli(
    <View
      contentProvider={options.contentProvider}
      actions={options.actions}
      interactionHandler={options.interactionHandler}
    />,
  )
}

export async function launchDirectory(options: DirectoryLaunchOptions): Promise<void> {
  await launchCli(
    <DirectoryView
      dirPath={options.dirPath}
      actions={options.actions}
      interactionHandler={options.interactionHandler}
    />,
  )
}

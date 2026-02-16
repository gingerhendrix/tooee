import { launchCli } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { View } from "./View.js"
import { DirectoryView } from "./DirectoryView.js"
import type { ContentProvider, ContentRenderer } from "./types.js"

export interface ViewLaunchOptions {
  contentProvider: ContentProvider
  actions?: ActionDefinition[]
  renderers?: Record<string, ContentRenderer>
}

export interface DirectoryLaunchOptions {
  dirPath: string
  actions?: ActionDefinition[]
}

export async function launch(options: ViewLaunchOptions): Promise<void> {
  await launchCli(
    <View
      contentProvider={options.contentProvider}
      actions={options.actions}
      renderers={options.renderers}
    />,
  )
}

export async function launchDirectory(options: DirectoryLaunchOptions): Promise<void> {
  await launchCli(
    <DirectoryView
      dirPath={options.dirPath}
      actions={options.actions}
    />,
  )
}

import { launchCli } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { Request } from "./Request.tsx"
import type { RequestContentProvider } from "./types.ts"

export interface RequestLaunchOptions {
  contentProvider: RequestContentProvider
  actions?: ActionDefinition[]
  initialInput?: string
}

export async function launch(options: RequestLaunchOptions): Promise<void> {
  await launchCli(
    <Request
      contentProvider={options.contentProvider}
      actions={options.actions}
      initialInput={options.initialInput}
    />,
  )
}

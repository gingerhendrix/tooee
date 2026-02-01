import { launchCli } from "@tooee/shell"
import { Request } from "./Request.tsx"
import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts"

export interface RequestLaunchOptions {
  contentProvider: RequestContentProvider
  interactionHandler?: RequestInteractionHandler
  initialInput?: string
}

export async function launch(options: RequestLaunchOptions): Promise<void> {
  await launchCli(
    <Request
      contentProvider={options.contentProvider}
      interactionHandler={options.interactionHandler}
      initialInput={options.initialInput}
    />,
  )
}

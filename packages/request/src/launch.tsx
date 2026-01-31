import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Request } from "./Request.tsx"
import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts"

export interface RequestLaunchOptions {
  contentProvider: RequestContentProvider
  interactionHandler?: RequestInteractionHandler
  initialInput?: string
}

export async function launch(options: RequestLaunchOptions): Promise<void> {
  const renderer = await createCliRenderer()
  createRoot(renderer).render(
    <Request
      contentProvider={options.contentProvider}
      interactionHandler={options.interactionHandler}
      initialInput={options.initialInput}
    />,
  )
}

import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { ThemeSwitcherProvider } from "@tooee/react"
import { Request } from "./Request.tsx"
import type { RequestContentProvider, RequestInteractionHandler } from "./types.ts"

export interface RequestLaunchOptions {
  contentProvider: RequestContentProvider
  interactionHandler?: RequestInteractionHandler
  initialInput?: string
}

export async function launch(options: RequestLaunchOptions): Promise<void> {
  const renderer = await createCliRenderer({
    useAlternateScreen: true,
    exitOnCtrlC: true,
  })
  createRoot(renderer).render(
    <ThemeSwitcherProvider>
      <Request
        contentProvider={options.contentProvider}
        interactionHandler={options.interactionHandler}
        initialInput={options.initialInput}
      />
    </ThemeSwitcherProvider>,
  )
}

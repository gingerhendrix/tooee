import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { TooeeProvider } from "@tooee/shell"
import { Choose } from "./Choose.tsx"
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.ts"

export interface ChooseLaunchOptions {
  contentProvider: ChooseContentProvider
  options?: ChooseOptions
}

export async function launch(opts: ChooseLaunchOptions): Promise<ChooseResult | null> {
  return new Promise<ChooseResult | null>((resolve) => {
    let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null

    const cleanup = (result: ChooseResult | null) => {
      if (renderer) {
        renderer.destroy()
      }
      resolve(result)
    }

    createCliRenderer({
      useAlternateScreen: true,
      exitOnCtrlC: false,
    }).then((r) => {
      renderer = r
      createRoot(r).render(
        <TooeeProvider>
          <Choose
            contentProvider={opts.contentProvider}
            options={opts.options}
            onConfirm={(result) => cleanup(result)}
            onCancel={() => cleanup(null)}
          />
        </TooeeProvider>,
      )
    })
  })
}

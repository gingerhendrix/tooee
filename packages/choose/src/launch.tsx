import * as fs from "node:fs"
import * as tty from "node:tty"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { TooeeProvider } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { Choose } from "./Choose.js"
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js"

export interface ChooseLaunchOptions {
  contentProvider: ChooseContentProvider
  options?: ChooseOptions
  actions?: ActionDefinition[]
}

export async function launch(opts: ChooseLaunchOptions): Promise<ChooseResult | null> {
  // When stdin is piped (not a TTY), open /dev/tty for keyboard input
  // so the renderer doesn't consume the piped data stream.
  const stdinIsPiped = !process.stdin.isTTY
  let ttyStdin: tty.ReadStream | undefined
  if (stdinIsPiped) {
    const fd = fs.openSync("/dev/tty", "r")
    ttyStdin = new tty.ReadStream(fd)
  }

  return new Promise<ChooseResult | null>((resolve) => {
    let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null

    const cleanup = (result: ChooseResult | null) => {
      if (renderer) {
        renderer.destroy()
      }
      if (ttyStdin) {
        ttyStdin.destroy()
      }
      resolve(result)
    }

    createCliRenderer({
      useAlternateScreen: true,
      exitOnCtrlC: false,
      ...(ttyStdin ? { stdin: ttyStdin as unknown as NodeJS.ReadStream } : {}),
    }).then((r) => {
      renderer = r
      createRoot(r).render(
        <TooeeProvider initialMode="insert">
          <Choose
            contentProvider={opts.contentProvider}
            options={opts.options}
            actions={opts.actions}
            onConfirm={(result) => cleanup(result)}
            onCancel={() => cleanup(null)}
          />
        </TooeeProvider>,
      )
    })
  })
}

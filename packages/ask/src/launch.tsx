import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { TooeeProvider, guardTerminalHealth } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { Ask } from "./Ask.js"
import type { AskOptions } from "./types.js"

export interface AskLaunchOptions extends AskOptions {
  actions?: ActionDefinition[]
  /** Called with the submitted text. Default: write to stdout and exit. */
  onSubmit?: (value: string) => void
}

export async function launch(options: AskLaunchOptions): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  })

  guardTerminalHealth(renderer)

  createRoot(renderer).render(
    <TooeeProvider initialMode="insert">
      <Ask
        title={options.title}
        prompt={options.prompt}
        placeholder={options.placeholder}
        defaultValue={options.defaultValue}
        multiline={options.multiline}
        actions={options.actions}
        onSubmit={options.onSubmit}
      />
    </TooeeProvider>,
  )
}

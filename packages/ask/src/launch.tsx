import { launchCli } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { Ask } from "./Ask.tsx"
import type { AskOptions } from "./types.ts"

export interface AskLaunchOptions extends AskOptions {
  actions?: ActionDefinition[]
}

export async function launch(options: AskLaunchOptions): Promise<void> {
  await launchCli(
    <Ask
      prompt={options.prompt}
      placeholder={options.placeholder}
      defaultValue={options.defaultValue}
      actions={options.actions}
    />,
  )
}

import { launchCli } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { Ask } from "./Ask.tsx"
import type { AskOptions, AskInteractionHandler } from "./types.ts"

export interface AskLaunchOptions extends AskOptions {
  actions?: ActionDefinition[]
  /** @deprecated Use actions instead */
  onSubmit?: (value: string) => void
  /** @deprecated Use actions instead */
  interactionHandler?: AskInteractionHandler
}

export async function launch(options: AskLaunchOptions): Promise<void> {
  await launchCli(
    <Ask
      prompt={options.prompt}
      placeholder={options.placeholder}
      defaultValue={options.defaultValue}
      actions={options.actions}
      onSubmit={options.onSubmit}
      interactionHandler={options.interactionHandler}
    />,
  )
}

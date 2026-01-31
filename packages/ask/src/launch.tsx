import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Ask } from "./Ask.tsx"
import type { AskOptions, AskInteractionHandler } from "./types.ts"

export interface AskLaunchOptions extends AskOptions {
  onSubmit?: (value: string) => void
  interactionHandler?: AskInteractionHandler
}

export async function launch(options: AskLaunchOptions): Promise<void> {
  const renderer = await createCliRenderer()
  createRoot(renderer).render(
    <Ask
      prompt={options.prompt}
      placeholder={options.placeholder}
      defaultValue={options.defaultValue}
      onSubmit={options.onSubmit}
      interactionHandler={options.interactionHandler}
    />,
  )
}

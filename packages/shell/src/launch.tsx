import type { ReactNode } from "react"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { TooeeProvider } from "./provider.jsx"

export async function launchCli(
  node: ReactNode,
  opts?: { useAlternateScreen?: boolean; exitOnCtrlC?: boolean },
): Promise<void> {
  const renderer = await createCliRenderer({
    useAlternateScreen: opts?.useAlternateScreen ?? true,
    exitOnCtrlC: opts?.exitOnCtrlC ?? true,
  })
  createRoot(renderer).render(<TooeeProvider>{node}</TooeeProvider>)
}

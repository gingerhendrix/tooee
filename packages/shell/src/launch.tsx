import type { ReactNode } from "react"
import { createCliRenderer, type CliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { TooeeProvider } from "./provider.js"

/**
 * Exit the process when the terminal dies.
 *
 * When a terminal closes while a TUI is running, the PTY slave FDs go
 * stale and OpenTUI's render loop busy-spins at 100% CPU. Listening for
 * stdin end/close catches this immediately — Bun fires these events even
 * in raw mode.
 */
export function guardTerminalHealth(renderer: CliRenderer): void {
  let exiting = false

  const exit = () => {
    if (exiting) return
    exiting = true
    try {
      renderer.destroy()
    } catch {
      // PTY is dead — destroy may throw
    }
    process.exit(0)
  }

  const stdin = renderer.stdin ?? process.stdin
  stdin.on("end", exit)
  stdin.on("close", exit)
}

export interface LaunchCliOptions {
  exitOnCtrlC?: boolean
  leader?: string
  sequenceTimeoutMs?: number
}

export async function launchCli(node: ReactNode, opts?: LaunchCliOptions): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: opts?.exitOnCtrlC ?? true,
  })

  guardTerminalHealth(renderer)

  createRoot(renderer).render(
    <TooeeProvider leader={opts?.leader} sequenceTimeoutMs={opts?.sequenceTimeoutMs}>
      {node}
    </TooeeProvider>,
  )
}

import * as fs from "node:fs"
import * as tty from "node:tty"
import type { ReactNode } from "react"
import { createCliRenderer, type CliRenderer, type CliRendererConfig } from "@opentui/core"
import { createRoot, type Root } from "@opentui/react"
import { TooeeProvider, type TooeeProviderProps } from "./provider.js"

export type TooeeProviderOptions = Omit<TooeeProviderProps, "children">

export interface MountTooeeOptions {
  /** Options for the Tooee provider tree mounted around `node`. */
  provider?: TooeeProviderOptions
}

/** A React tree mounted into a renderer owned by the caller. */
export interface TooeeMount {
  readonly renderer: CliRenderer
  readonly root: Root
  readonly ownership: "external"
  readonly unmounted: boolean
  /** Unmount the React tree. Never destroys the externally owned renderer. */
  unmount(): void
}

export type CliStdinPolicy = "process" | "tty-if-piped"

export interface LaunchCliOptions extends TooeeProviderOptions {
  exitOnCtrlC?: boolean
  /** Preferred provider options. Top-level provider fields remain as compatibility aliases. */
  provider?: TooeeProviderOptions
  /** Additional OpenTUI renderer options. */
  renderer?: Omit<CliRendererConfig, "exitOnCtrlC" | "stdin">
  /** Select keyboard input without consuming piped process stdin. */
  stdinPolicy?: CliStdinPolicy
  /** Install local terminal end/close listeners. Defaults to true. */
  terminalHealth?: boolean
}

/** A locally owned renderer session returned by `launchCli`. */
export interface TooeeSessionHandle {
  readonly renderer: CliRenderer
  readonly root: Root
  readonly ownership: "local"
  readonly destroyed: boolean
  /** Unmount the React tree without destroying the renderer. */
  unmount(): void
  /** Idempotently unmount and destroy every locally owned resource. */
  destroy(): void
}

export interface CliSessionController<T> {
  resolve(value: T): void
  cancel(): void
}

export type CliSessionRender<T> = (session: CliSessionController<T>) => ReactNode

export interface TerminalHealthGuardOptions {
  /** Called once when renderer stdin ends or closes. */
  onTerminalEnd?: () => void
  /** Destroy the renderer before calling `onTerminalEnd`. Defaults to true. */
  destroyRenderer?: boolean
  /** Exit the process after cleanup. Defaults to true for compatibility. */
  exitProcess?: boolean
}

/**
 * Guard a locally owned renderer from a dead terminal and return an idempotent
 * function that removes every listener installed by the guard.
 */
export function guardTerminalHealth(
  renderer: CliRenderer,
  options: TerminalHealthGuardOptions = {},
): () => void {
  let handled = false
  let disposed = false
  const stdin = renderer.stdin ?? process.stdin

  const dispose = () => {
    if (disposed) return
    disposed = true
    stdin.removeListener("end", onTerminalEnd)
    stdin.removeListener("close", onTerminalEnd)
    renderer.removeListener("destroy", dispose)
  }

  const onTerminalEnd = () => {
    if (handled) return
    handled = true
    dispose()

    if (options.destroyRenderer ?? true) {
      try {
        renderer.destroy()
      } catch {
        // A dead PTY may make terminal restoration fail.
      }
    }
    options.onTerminalEnd?.()
    if (options.exitProcess ?? true) process.exit(0)
  }

  stdin.on("end", onTerminalEnd)
  stdin.on("close", onTerminalEnd)
  renderer.once("destroy", dispose)
  return dispose
}

/** Mount Tooee into a renderer whose lifetime remains owned by the caller. */
export function mountTooee(
  renderer: CliRenderer,
  node: ReactNode,
  options: MountTooeeOptions = {},
): TooeeMount {
  const root = createRoot(renderer)
  let unmounted = false

  const markRendererDestroyed = () => {
    unmounted = true
  }
  renderer.once("destroy", markRendererDestroyed)

  const unmount = () => {
    if (unmounted) return
    unmounted = true
    renderer.removeListener("destroy", markRendererDestroyed)
    root.unmount()
  }

  try {
    root.render(<TooeeProvider {...options.provider}>{node}</TooeeProvider>)
  } catch (error) {
    try {
      unmount()
    } catch {
      // Preserve the original render failure.
    }
    throw error
  }

  return {
    renderer,
    root,
    ownership: "external",
    get unmounted() {
      return unmounted
    },
    unmount,
  }
}

function resolveProviderOptions(options: LaunchCliOptions): TooeeProviderOptions {
  const { leader, config, initialMode, sequenceTimeoutMs } = options
  return {
    ...(leader === undefined ? {} : { leader }),
    ...(config === undefined ? {} : { config }),
    ...(initialMode === undefined ? {} : { initialMode }),
    ...(sequenceTimeoutMs === undefined ? {} : { sequenceTimeoutMs }),
    ...options.provider,
  }
}

function openTtyInput(policy: CliStdinPolicy): tty.ReadStream | undefined {
  if (policy !== "tty-if-piped" || process.stdin.isTTY) return undefined
  const fd = fs.openSync("/dev/tty", "r")
  try {
    return new tty.ReadStream(fd)
  } catch (error) {
    fs.closeSync(fd)
    throw error
  }
}

/** Create, mount, and return a locally owned Tooee renderer session. */
export async function launchCli(
  node: ReactNode,
  options: LaunchCliOptions = {},
): Promise<TooeeSessionHandle> {
  let ttyInput: tty.ReadStream | undefined
  let renderer: CliRenderer | undefined

  try {
    ttyInput = openTtyInput(options.stdinPolicy ?? "process")
    renderer = await createCliRenderer({
      ...options.renderer,
      exitOnCtrlC: options.exitOnCtrlC ?? true,
      ...(ttyInput ? { stdin: ttyInput as unknown as NodeJS.ReadStream } : {}),
    })
  } catch (error) {
    ttyInput?.destroy()
    throw error
  }

  let mount: TooeeMount
  try {
    mount = mountTooee(renderer, node, { provider: resolveProviderOptions(options) })
  } catch (error) {
    try {
      renderer.destroy()
    } finally {
      ttyInput?.destroy()
    }
    throw error
  }

  let destroyed = false
  let removeHealthGuard = () => {}

  const releaseOwnedResources = () => {
    if (destroyed) return
    destroyed = true
    removeHealthGuard()
    ttyInput?.destroy()
  }

  const onRendererDestroyed = () => {
    releaseOwnedResources()
  }
  renderer.once("destroy", onRendererDestroyed)

  const handle: TooeeSessionHandle = {
    renderer,
    root: mount.root,
    ownership: "local",
    get destroyed() {
      return destroyed
    },
    unmount: mount.unmount,
    destroy() {
      if (destroyed) return
      try {
        mount.unmount()
      } finally {
        try {
          renderer.destroy()
        } finally {
          releaseOwnedResources()
        }
      }
    },
  }

  if (options.terminalHealth ?? true) {
    removeHealthGuard = guardTerminalHealth(renderer, {
      onTerminalEnd: releaseOwnedResources,
    })
  }

  return handle
}

/** Run one locally owned CLI session and settle its result at most once. */
export async function runCliSession<T>(
  render: CliSessionRender<T>,
  options: LaunchCliOptions = {},
): Promise<T | null> {
  return await new Promise<T | null>((resolve) => {
    let settled = false
    let handle: TooeeSessionHandle | undefined

    const settle = (result: T | null) => {
      if (settled) return
      settled = true
      try {
        handle?.destroy()
      } finally {
        resolve(result)
      }
    }

    let node: ReactNode
    try {
      node = render({
        resolve: (value) => settle(value),
        cancel: () => settle(null),
      })
    } catch {
      settle(null)
      return
    }

    if (settled) return

    launchCli(node, options)
      .then((sessionHandle) => {
        handle = sessionHandle
        handle.renderer.once("destroy", () => settle(null))
        if (settled) handle.destroy()
      })
      .catch(() => settle(null))
  })
}

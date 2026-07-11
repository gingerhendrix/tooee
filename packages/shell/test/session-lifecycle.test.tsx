import { afterEach, describe, expect, test } from "bun:test"
import { PassThrough } from "node:stream"
import { createTestRenderer } from "@opentui/core/testing"
import type { CliRendererConfig } from "@opentui/core"
import {
  guardTerminalHealth,
  launchCli,
  mountTooee,
  runCliSession,
  type CliSessionController,
  type TooeeSessionHandle,
} from "../src/launch.js"

let testRenderer: Awaited<ReturnType<typeof createTestRenderer>> | undefined
let sessionHandle: TooeeSessionHandle | undefined

afterEach(() => {
  sessionHandle?.destroy()
  sessionHandle = undefined
  testRenderer?.renderer.destroy()
  testRenderer = undefined
})

function remoteRendererOptions(onDestroy?: () => void): CliRendererConfig {
  const stdin = new PassThrough() as PassThrough & NodeJS.ReadStream
  stdin.isTTY = true
  stdin.setRawMode = () => stdin

  const stdout = new PassThrough() as PassThrough & NodeJS.WriteStream
  stdout.isTTY = true
  stdout.columns = 40
  stdout.rows = 10

  return {
    stdin,
    stdout,
    remote: true,
    width: 40,
    height: 10,
    useThread: false,
    onDestroy,
  }
}

describe("mountTooee", () => {
  test("unmounts idempotently without destroying an external renderer", async () => {
    testRenderer = await createTestRenderer({ width: 40, height: 10 })
    const renderer = testRenderer.renderer
    const originalDestroy = renderer.destroy.bind(renderer)
    let destroyCalls = 0
    renderer.destroy = () => {
      destroyCalls++
      originalDestroy()
    }

    const mount = mountTooee(renderer, <text>external mount</text>)
    expect(mount.ownership).toBe("external")
    expect(mount.unmounted).toBe(false)

    mount.unmount()
    mount.unmount()

    expect(mount.unmounted).toBe(true)
    expect(destroyCalls).toBe(0)
  })

  test("does not install terminal-health listeners", async () => {
    testRenderer = await createTestRenderer({ width: 40, height: 10 })
    const stdin = testRenderer.renderer.stdin
    const beforeEnd = stdin.listenerCount("end")
    const beforeClose = stdin.listenerCount("close")

    const mount = mountTooee(testRenderer.renderer, <text>listener ownership</text>)

    expect(stdin.listenerCount("end")).toBe(beforeEnd)
    expect(stdin.listenerCount("close")).toBe(beforeClose)
    mount.unmount()
  })
})

describe("local sessions", () => {
  test("destroy releases the renderer and health listeners exactly once", async () => {
    let rendererDestroyCalls = 0
    const rendererOptions = remoteRendererOptions(() => rendererDestroyCalls++)
    const stdin = rendererOptions.stdin!
    const beforeEnd = stdin.listenerCount("end")
    const beforeClose = stdin.listenerCount("close")

    sessionHandle = await launchCli(<text>local session</text>, {
      renderer: rendererOptions,
    })

    expect(sessionHandle.ownership).toBe("local")
    expect(stdin.listenerCount("end")).toBe(beforeEnd + 1)
    expect(stdin.listenerCount("close")).toBe(beforeClose + 1)

    sessionHandle.destroy()
    sessionHandle.destroy()

    expect(sessionHandle.destroyed).toBe(true)
    expect(rendererDestroyCalls).toBe(1)
    expect(stdin.listenerCount("end")).toBe(beforeEnd)
    expect(stdin.listenerCount("close")).toBe(beforeClose)
  })

  test("runCliSession resolves once and destroys owned resources", async () => {
    let controller: CliSessionController<string> | undefined
    let rendererDestroyCalls = 0

    const resultPromise = runCliSession<string>(
      (session) => {
        controller = session
        return <text>settlement</text>
      },
      {
        renderer: remoteRendererOptions(() => rendererDestroyCalls++),
        terminalHealth: false,
      },
    )

    await Bun.sleep(20)
    controller!.resolve("first")
    controller!.resolve("second")
    controller!.cancel()

    expect(await resultPromise).toBe("first")
    expect(rendererDestroyCalls).toBe(1)
  })

  test("runCliSession cancels and converts render failures to null", async () => {
    let controller: CliSessionController<string> | undefined
    const cancelled = runCliSession<string>(
      (session) => {
        controller = session
        return <text>cancel</text>
      },
      { renderer: remoteRendererOptions(), terminalHealth: false },
    )

    await Bun.sleep(20)
    controller!.cancel()
    controller!.resolve("late")
    expect(await cancelled).toBeNull()

    const failed = await runCliSession<string>(() => {
      throw new Error("render factory failed")
    })
    expect(failed).toBeNull()
  })
})

test("guardTerminalHealth owns and removes only its listeners", async () => {
  testRenderer = await createTestRenderer({ width: 40, height: 10 })
  const renderer = testRenderer.renderer
  const stdin = renderer.stdin
  const beforeEnd = stdin.listenerCount("end")
  const beforeClose = stdin.listenerCount("close")

  const dispose = guardTerminalHealth(renderer, {
    destroyRenderer: false,
    exitProcess: false,
  })
  expect(stdin.listenerCount("end")).toBe(beforeEnd + 1)
  expect(stdin.listenerCount("close")).toBe(beforeClose + 1)

  dispose()
  dispose()
  expect(stdin.listenerCount("end")).toBe(beforeEnd)
  expect(stdin.listenerCount("close")).toBe(beforeClose)
})

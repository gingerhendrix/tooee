import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act, useState } from "react"
import { useContentLoader } from "../src/hooks/useContentLoader.js"
import type { ContentChunk, ContentProvider } from "../src/types.js"

type TestSession = Awaited<ReturnType<typeof testRender>>

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
})

function Loader({ provider }: { provider: ContentProvider }) {
  const { content, streaming, error } = useContentLoader(provider, 0)
  const text = content && "text" in content ? content.text : ""
  return (
    <box flexDirection="column">
      <text content={`text:${text}`} />
      <text content={`streaming:${streaming}`} />
      <text content={`error:${error ?? "none"}`} />
    </box>
  )
}

async function flush(s: TestSession) {
  await act(async () => {
    await Promise.resolve()
  })
  await s.renderOnce()
}

describe("useContentLoader streaming lifecycle (R-03)", () => {
  test("cleanup closes the streaming iterator", async () => {
    let returned = false
    const iterable: AsyncIterable<ContentChunk> = {
      [Symbol.asyncIterator]() {
        let first = true
        return {
          next: () => {
            if (first) {
              first = false
              return Promise.resolve({
                done: false as const,
                value: { type: "append" as const, format: "text" as const, data: "hello" },
              })
            }
            // Long-lived stream: never yields again
            return new Promise<IteratorResult<ContentChunk>>(() => {})
          },
          return: () => {
            returned = true
            return Promise.resolve({ done: true as const, value: undefined })
          },
        }
      },
    }
    const provider: ContentProvider = { load: () => iterable, format: "text" }

    let hide!: () => void
    function Harness() {
      const [show, setShow] = useState(true)
      hide = () => setShow(false)
      return show ? <Loader provider={provider} /> : <text content="unmounted" />
    }

    testSetup = await testRender(<Harness />, { width: 60, height: 10 })
    await testSetup.renderOnce()
    await flush(testSetup)
    expect(testSetup.captureCharFrame()).toContain("text:hello")
    expect(returned).toBe(false)

    // Unmount mid-stream: the iterator must be closed so the provider's
    // resources (subprocess, file handle, network stream) are released.
    await act(async () => {
      hide()
    })
    await testSetup.renderOnce()
    expect(returned).toBe(true)
  })

  test("non-Error stream failure is surfaced, not dropped", async () => {
    async function* failing(): AsyncIterable<ContentChunk> {
      yield { type: "append", format: "text", data: "partial" }
      // eslint-disable-next-line no-throw-literal
      throw "stream blew up"
    }
    const provider: ContentProvider = { load: () => failing(), format: "text" }

    testSetup = await testRender(<Loader provider={provider} />, { width: 60, height: 10 })
    await testSetup.renderOnce()
    await flush(testSetup)
    await flush(testSetup)

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("error:stream blew up")
    expect(frame).toContain("streaming:false")
  })

  test("non-Error promise rejection is surfaced, not undefined", async () => {
    const provider: ContentProvider = {
      // eslint-disable-next-line prefer-promise-reject-errors
      load: () => Promise.reject("load blew up"),
    }

    testSetup = await testRender(<Loader provider={provider} />, { width: 60, height: 10 })
    await testSetup.renderOnce()
    await flush(testSetup)

    expect(testSetup.captureCharFrame()).toContain("error:load blew up")
  })
})

import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, beforeEach, describe } from "bun:test"
import { copied } from "../../../test/support/clipboard-mock.ts"

const { TooeeProvider, useDocumentController, Document } = await import("@tooee/shell")
const { press, pressTab } = await import("./support/test-helpers.ts")
type TestSession = Awaited<ReturnType<typeof testRender>>

interface Row {
  id: string
  label: string
}

const ROWS: Row[] = [
  { id: "a", label: "alpha" },
  { id: "b", label: "beta" },
  { id: "c", label: "gamma" },
]

function Harness({ copy }: { copy?: boolean }) {
  const document = useDocumentController<Row>({
    rows: ROWS,
    // Copy must use the same semantic text projection as search.
    adapter: { getKey: (r) => r.id, getText: (r) => `${r.id}\t${r.label}` },
    multiSelect: true,
    copy,
  })

  return (
    <box flexDirection="column" height="100%">
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r) => <text content={r.label} />}
      />
    </box>
  )
}

let session: TestSession

beforeEach(() => {
  copied.length = 0
})

afterEach(() => {
  session?.renderer.destroy()
})

async function setup(copy?: boolean) {
  session = await testRender(
    <TooeeProvider>
      <Harness copy={copy} />
    </TooeeProvider>,
    { width: 40, height: 12, kittyKeyboard: true },
  )
  await session.renderOnce()
  return session
}

describe("copy", () => {
  test("copies the cursor row using the adapter text", async () => {
    await setup()
    await press(session, "j")
    await press(session, "v")
    await press(session, "y")

    expect(copied).toEqual(["b\tbeta"])
  })

  test("copies a select-mode range", async () => {
    await setup()
    await press(session, "v")
    await press(session, "j")
    await press(session, "y")

    expect(copied).toEqual(["a\talpha\nb\tbeta"])
  })

  test("toggled rows win over the range, in row order", async () => {
    await setup()
    await press(session, "j")
    await press(session, "j")
    await pressTab(session) // c
    await press(session, "k")
    await press(session, "k")
    await pressTab(session) // a
    await press(session, "v")
    await press(session, "y")

    expect(copied).toEqual(["a\talpha\nc\tgamma"])
  })

  test("copy: false unregisters the copy command", async () => {
    await setup(false)
    await press(session, "v")
    await press(session, "y")

    expect(copied).toEqual([])
  })
})

import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe, beforeEach } from "bun:test"
import { act } from "react"
import { MouseButtons } from "@opentui/core/testing"
import { AppLayout } from "@tooee/layout"
import type { ContextMenuEntry } from "@tooee/renderers"
import {
  Document,
  TooeeProvider,
  useDocumentController,
  useThemeCommands,
  type DocumentContextMenuEvent,
  type DocumentController,
  type DocumentRowEvent,
} from "@tooee/shell"
import { press, type TestSession } from "./support/test-helpers.ts"

interface Row {
  id: string
  label: string
}

const ADAPTER = {
  getKey: (r: Row) => r.id,
  getText: (r: Row) => r.label,
}

let handle: DocumentController<Row> | null = null
let presses: DocumentRowEvent<Row>[] = []
let menuEvents: DocumentContextMenuEvent<Row>[] = []

function menuFor(event: DocumentContextMenuEvent<Row>): ContextMenuEntry[] {
  menuEvents.push(event)
  return [{ id: `open-${event.row.id}`, title: `Open ${event.row.label}` }]
}

function Harness({ rows, gap = false }: { rows: readonly Row[]; gap?: boolean }) {
  const document = useDocumentController<Row>({
    rows,
    adapter: ADAPTER,
    onRowPress: (event) => presses.push(event),
    contextMenu: menuFor,
  })
  handle = document
  // Gives the guard tests a real modal overlay to open with `t`.
  useThemeCommands()

  // AppLayout (no title bar) puts row 0 at y=0 and hosts the overlay portal the
  // context menu and theme picker render into.
  return (
    <AppLayout statusBar={{ items: [] }}>
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r) => <text content={r.label} style={gap ? { marginBottom: 1 } : undefined} />}
      />
    </AppLayout>
  )
}

let session: TestSession

beforeEach(() => {
  presses = []
  menuEvents = []
})

afterEach(() => {
  session?.renderer.destroy()
  handle = null
})

async function setup(rows: readonly Row[], options: { gap?: boolean; height?: number } = {}) {
  session = await testRender(
    <TooeeProvider>
      <Harness rows={rows} gap={options.gap} />
    </TooeeProvider>,
    { width: 40, height: options.height ?? 12, kittyKeyboard: true },
  )
  await session.renderOnce()
  return session
}

async function click(x: number, y: number, button = MouseButtons.LEFT) {
  await act(async () => {
    await session.mockMouse.click(x, y, button)
  })
  await session.renderOnce()
}

const THREE: Row[] = [
  { id: "a", label: "alpha" },
  { id: "b", label: "beta" },
  { id: "c", label: "gamma" },
]

describe("screen-Y mapping", () => {
  test("left-click resolves the clicked row, selects it, then calls onRowPress", async () => {
    await setup(THREE)
    await click(1, 1)

    expect(handle!.activeIndex).toBe(1)
    expect(handle!.activeKey).toBe("b")
    expect(presses).toHaveLength(1)
    expect(presses[0]!.index).toBe(1)
    expect(presses[0]!.key).toBe("b")
    expect(presses[0]!.row.label).toBe("beta")
  })

  test("clicks on the empty trailing viewport are ignored", async () => {
    await setup(THREE)
    await click(1, 8)

    expect(handle!.activeIndex).toBe(0)
    expect(presses).toHaveLength(0)
  })

  test("a click in an inter-row gap resolves to the row above", async () => {
    // Each row is followed by a one-line margin, so y=1 is a gap row.
    await setup(THREE, { gap: true })
    await click(1, 1)

    expect(presses).toHaveLength(1)
    expect(presses[0]!.index).toBe(0)

    await click(1, 2)
    expect(presses[1]!.index).toBe(1)
  })

  test("clicks map through scrolled content", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, label: `row-${i}` }))
    await setup(many)
    await press(session, "g", { shift: true })

    const topLine = session.captureCharFrame().split("\n")[0]!.trim()
    expect(topLine).toMatch(/^row-\d+$/)
    const topIndex = Number(topLine.slice("row-".length))
    expect(topIndex).toBeGreaterThan(0)

    await click(1, 0)
    expect(presses).toHaveLength(1)
    expect(presses[0]!.index).toBe(topIndex)
  })

  test("getRowAtScreenY exposes the same mapping and rejects misses", async () => {
    await setup(THREE)
    expect(handle!.getRowAtScreenY(2)).toMatchObject({ index: 2, key: "c" })
    expect(handle!.getRowAtScreenY(9)).toBeNull()
  })
})

describe("context menu", () => {
  test("right-click selects the row, then resolves and opens the menu", async () => {
    await setup(THREE)
    expect(session.captureCharFrame()).not.toContain("Open beta")

    await click(1, 1, MouseButtons.RIGHT)

    expect(handle!.activeIndex).toBe(1)
    expect(menuEvents).toHaveLength(1)
    expect(menuEvents[0]!.row.id).toBe("b")
    expect(menuEvents[0]!.index).toBe(1)
    expect(menuEvents[0]!.key).toBe("b")
    expect(menuEvents[0]!.context.mode).toBe("cursor")
    expect(session.captureCharFrame()).toContain("Open beta")
  })

  test("right-click does not invoke onRowPress", async () => {
    await setup(THREE)
    await click(1, 1, MouseButtons.RIGHT)
    expect(presses).toHaveLength(0)
  })
})

describe("modal overlay guard", () => {
  test("left-click does not move the cursor while a modal overlay is open", async () => {
    await setup(THREE)
    await press(session, "t")
    expect(session.captureCharFrame()).toContain("Filter themes")

    await click(1, 1)
    expect(handle!.activeIndex).toBe(0)
    expect(presses).toHaveLength(0)
  })

  test("right-click does not open a context menu while a modal overlay is open", async () => {
    await setup(THREE)
    await press(session, "t")

    await click(1, 1, MouseButtons.RIGHT)
    expect(menuEvents).toHaveLength(0)
    expect(session.captureCharFrame()).not.toContain("Open beta")
  })
})

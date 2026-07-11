import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe, beforeEach } from "bun:test"
import { act } from "react"
import { MouseButtons } from "@opentui/core/testing"
import { useActions, type ActionDefinition } from "@tooee/commands"
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
import { press, pressEnter, type TestSession } from "./support/test-helpers.ts"

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

describe("variable-height rows", () => {
  interface TallRow {
    id: string
    label: string
    lines: number
  }

  const TALL_ADAPTER = {
    getKey: (r: TallRow) => r.id,
    getText: (r: TallRow) => r.label,
  }

  let tallHandle: DocumentController<TallRow> | null = null
  let tallPresses: DocumentRowEvent<TallRow>[] = []

  function TallHarness({ rows }: { rows: readonly TallRow[] }) {
    const document = useDocumentController<TallRow>({
      rows,
      adapter: TALL_ADAPTER,
      onRowPress: (event) => tallPresses.push(event),
    })
    tallHandle = document
    return (
      <AppLayout statusBar={{ items: [] }}>
        <Document
          controller={document}
          showGutter={false}
          style={{ flexGrow: 1 }}
          renderRow={(r) => (
            <box style={{ flexDirection: "column" }}>
              {Array.from({ length: r.lines }, (_, line) => (
                <text key={line} content={`${r.label}:${line}`} />
              ))}
            </box>
          )}
        />
      </AppLayout>
    )
  }

  beforeEach(() => {
    tallPresses = []
  })

  afterEach(() => {
    tallHandle = null
  })

  async function setupTall(rows: readonly TallRow[], height = 12) {
    session = await testRender(
      <TooeeProvider>
        <TallHarness rows={rows} />
      </TooeeProvider>,
      { width: 40, height, kittyKeyboard: true },
    )
    await session.renderOnce()
    return session
  }

  // Heights 1, 3, 2 — rows start at y=0, y=1, y=4; content ends at y=6.
  const MIXED: TallRow[] = [
    { id: "a", label: "alpha", lines: 1 },
    { id: "b", label: "beta", lines: 3 },
    { id: "c", label: "gamma", lines: 2 },
  ]

  test("every line of a multi-line row resolves to that row", async () => {
    await setupTall(MIXED)

    for (const y of [1, 2, 3]) {
      expect(tallHandle!.getRowAtScreenY(y)).toMatchObject({ index: 1, key: "b" })
    }
    expect(tallHandle!.getRowAtScreenY(0)).toMatchObject({ index: 0, key: "a" })
    expect(tallHandle!.getRowAtScreenY(4)).toMatchObject({ index: 2, key: "c" })
    expect(tallHandle!.getRowAtScreenY(5)).toMatchObject({ index: 2, key: "c" })
  })

  test("a click on the last line of a row selects that row, not its neighbor", async () => {
    await setupTall(MIXED)
    await click(1, 3)

    expect(tallHandle!.activeIndex).toBe(1)
    expect(tallPresses).toHaveLength(1)
    expect(tallPresses[0]!.key).toBe("b")
  })

  test("clicks past variable-height content are ignored", async () => {
    await setupTall(MIXED)
    await click(1, 6)
    await click(1, 9)

    expect(tallPresses).toHaveLength(0)
    expect(tallHandle!.getRowAtScreenY(6)).toBeNull()
  })

  test("clicks map through a scrolled variable-height document", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`,
      label: `row-${i}`,
      lines: 2,
    }))
    await setupTall(many)
    await press(session, "g", { shift: true })

    const topLine = session.captureCharFrame().split("\n")[0]!.trim()
    const match = topLine.match(/^row-(\d+):(\d+)$/)
    expect(match).not.toBeNull()
    const topIndex = Number(match![1])
    expect(topIndex).toBeGreaterThan(0)

    await click(1, 0)
    expect(tallPresses).toHaveLength(1)
    expect(tallPresses[0]!.index).toBe(topIndex)
  })
})

describe("non-selectable rows", () => {
  let sectionHandle: DocumentController<Row> | null = null
  let sectionPresses: DocumentRowEvent<Row>[] = []

  function SectionHarness({ rows }: { rows: readonly Row[] }) {
    const document = useDocumentController<Row>({
      rows,
      adapter: {
        ...ADAPTER,
        isSelectable: (r) => !r.id.startsWith("h"),
      },
      onRowPress: (event) => sectionPresses.push(event),
    })
    sectionHandle = document
    return (
      <AppLayout statusBar={{ items: [] }}>
        <Document
          controller={document}
          showGutter={false}
          style={{ flexGrow: 1 }}
          renderRow={(r) => <text content={r.label} />}
        />
      </AppLayout>
    )
  }

  beforeEach(() => {
    sectionPresses = []
  })

  afterEach(() => {
    sectionHandle = null
  })

  test("clicking a non-selectable row reports it but leaves the cursor on a selectable row", async () => {
    session = await testRender(
      <TooeeProvider>
        <SectionHarness
          rows={[
            { id: "h1", label: "Header" },
            { id: "a", label: "alpha" },
            { id: "b", label: "beta" },
          ]}
        />
      </TooeeProvider>,
      { width: 40, height: 12, kittyKeyboard: true },
    )
    await session.renderOnce()
    expect(sectionHandle!.activeIndex).toBe(1)

    await click(1, 2)
    expect(sectionHandle!.activeIndex).toBe(2)

    // The header is what was clicked, so the press event reports it; the
    // cursor resolves to the nearest selectable row per navigation rules.
    await click(1, 0)
    expect(sectionPresses[1]!.index).toBe(0)
    expect(sectionPresses[1]!.key).toBe("h1")
    expect(sectionHandle!.activeIndex).toBe(1)
  })
})

describe("action-backed context menu", () => {
  let invoked: string[] = []

  function makeActions(): ActionDefinition[] {
    return [
      { id: "act-open", title: "Open stream", handler: () => invoked.push("act-open") },
      {
        id: "act-close",
        title: "Close stream",
        hotkey: "x",
        handler: () => invoked.push("act-close"),
      },
      {
        id: "act-secret",
        title: "Secret",
        hidden: true,
        handler: () => invoked.push("act-secret"),
      },
      {
        id: "act-never",
        title: "Never applicable",
        when: () => false,
        handler: () => invoked.push("act-never"),
      },
    ]
  }

  function ActionsHarness({ rows }: { rows: readonly Row[] }) {
    const actions = makeActions()
    useActions(actions)
    const document = useDocumentController<Row>({
      rows,
      adapter: ADAPTER,
      contextMenu: actions,
    })
    handle = document
    return (
      <AppLayout statusBar={{ items: [] }}>
        <Document
          controller={document}
          showGutter={false}
          style={{ flexGrow: 1 }}
          renderRow={(r) => <text content={r.label} />}
        />
      </AppLayout>
    )
  }

  beforeEach(() => {
    invoked = []
  })

  async function setupActions() {
    session = await testRender(
      <TooeeProvider>
        <ActionsHarness rows={THREE} />
      </TooeeProvider>,
      { width: 40, height: 12, kittyKeyboard: true },
    )
    await session.renderOnce()
    return session
  }

  test("right-click builds the menu from actions, dropping hidden and inapplicable ones", async () => {
    await setupActions()
    await click(1, 1, MouseButtons.RIGHT)

    const frame = session.captureCharFrame()
    expect(frame).toContain("Open stream")
    expect(frame).toContain("Close stream")
    expect(frame).toContain(" x") // hotkey rendered from the action definition
    expect(frame).not.toContain("Secret")
    expect(frame).not.toContain("Never applicable")
    expect(handle!.activeIndex).toBe(1)
  })

  test("choosing an entry invokes the action on the surface, then closes the menu", async () => {
    await setupActions()
    await click(1, 1, MouseButtons.RIGHT)

    await pressEnter(session)

    expect(invoked).toEqual(["act-open"])
    expect(session.captureCharFrame()).not.toContain("Open stream")
  })

  test("a function menu may also return action definitions", async () => {
    let seenKey: unknown = null

    function FunctionActionsHarness({ rows }: { rows: readonly Row[] }) {
      const actions = makeActions()
      useActions(actions)
      const document = useDocumentController<Row>({
        rows,
        adapter: ADAPTER,
        contextMenu: (event) => {
          seenKey = event.key
          return actions
        },
      })
      handle = document
      return (
        <AppLayout statusBar={{ items: [] }}>
          <Document
            controller={document}
            showGutter={false}
            style={{ flexGrow: 1 }}
            renderRow={(r) => <text content={r.label} />}
          />
        </AppLayout>
      )
    }

    session = await testRender(
      <TooeeProvider>
        <FunctionActionsHarness rows={THREE} />
      </TooeeProvider>,
      { width: 40, height: 12, kittyKeyboard: true },
    )
    await session.renderOnce()

    await click(1, 2, MouseButtons.RIGHT)

    expect(seenKey).toBe("c")
    const frame = session.captureCharFrame()
    expect(frame).toContain("Open stream")
    expect(frame).not.toContain("Secret")
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

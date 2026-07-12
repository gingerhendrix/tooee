import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition, CommandContext } from "@tooee/commands";
import { Document, DocumentScreen, TooeeProvider, useDocumentController } from "@tooee/shell";
import type { DocumentCommandContext, DocumentScreenProps } from "@tooee/shell";
import { press, pressTab } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

interface Row {
  id: string;
  label: string;
}

const ROWS: Row[] = [
  { id: "a", label: "alpha" },
  { id: "b", label: "beta" },
  { id: "c", label: "gamma" },
];

let commandIds: string[] = [];
let captured: DocumentCommandContext | undefined;
let reloads = 0;

const ACTIONS: ActionDefinition[] = [
  {
    id: "probe",
    title: "Probe document context",
    hotkey: "x",
    modes: ["cursor", "select"],
    handler: (ctx: CommandContext) => {
      captured = ctx.document;
    },
  },
  { id: "row.open", title: "Open row", handler: () => {} },
];

/** Reports the commands registered on the surface DocumentScreen renders into. */
function CommandProbe() {
  const { commands } = useCommandContext();
  commandIds = commands.map((command) => command.id);
  return null;
}

type ScreenOptions = Partial<
  Pick<DocumentScreenProps<Row>, "actions" | "quit" | "themeCommands" | "statusItems" | "context">
>;

function Harness({ multiSelect = true, ...screen }: ScreenOptions & { multiSelect?: boolean }) {
  const document = useDocumentController<Row>({
    rows: ROWS,
    adapter: { getKey: (r) => r.id, getText: (r) => r.label },
    multiSelect,
  });

  return (
    <DocumentScreen controller={document} titleBar={{ title: "Docs" }} {...screen}>
      <CommandProbe />
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r) => <text content={r.label} />}
      />
    </DocumentScreen>
  );
}

let session: TestSession;

beforeEach(() => {
  commandIds = [];
  captured = undefined;
  reloads = 0;
});

afterEach(() => {
  session?.renderer.destroy();
});

async function setup(props: ScreenOptions & { multiSelect?: boolean } = {}) {
  session = await testRender(
    <TooeeProvider>
      <Harness {...props} />
    </TooeeProvider>,
    { width: 90, height: 16, kittyKeyboard: true },
  );
  await session.renderOnce();
  return session;
}

function statusLine(): string {
  const lines = session.captureCharFrame().split("\n");
  return lines.find((line) => line.includes("Theme:")) ?? "";
}

function orderOf(line: string, labels: string[]): number[] {
  return labels.map((label) => line.indexOf(label));
}

describe("commands", () => {
  test("registers theme, quit and the supplied actions exactly once", async () => {
    await setup({ actions: ACTIONS });

    for (const id of ["cycle-theme", "quit", "probe", "row.open"]) {
      expect(commandIds.filter((registered) => registered === id)).toEqual([id]);
    }
  });

  test("navigation and toggle commands are registered once each", async () => {
    await setup();

    for (const id of ["cursor-down", "cursor-toggle", "cursor-toggle-up", "select-toggle"]) {
      expect(commandIds.filter((registered) => registered === id)).toEqual([id]);
    }
  });

  test("theme and quit can be opted out of", async () => {
    await setup({ quit: false, themeCommands: false });

    expect(commandIds).not.toContain("cycle-theme");
    expect(commandIds).not.toContain("quit");
  });

  test("quit accepts explicit options", async () => {
    let quits = 0;
    await setup({ quit: { hotkey: "ctrl+c", onQuit: () => quits++ } });

    expect(commandIds).toContain("quit");
    await press(session, "c", { ctrl: true });
    expect(quits).toBe(1);
  });
});

describe("ctx.document", () => {
  test("exposes the live active row, selection and metadata", async () => {
    await setup({
      actions: ACTIONS,
      context: {
        kind: "test-doc",
        title: "Docs",
        reload: () => reloads++,
        extras: { flavour: "vanilla" },
      },
    });

    await press(session, "j");
    await pressTab(session);
    await press(session, "x");

    expect(captured).toBeDefined();
    expect(captured!.kind).toBe("test-doc");
    expect(captured!.title).toBe("Docs");
    expect(captured!.rowCount).toBe(3);
    expect(captured!.cursor).toBe(1);
    expect(captured!.activeKey).toBe("b");
    expect(captured!.activeRow).toEqual(ROWS[1]!);
    expect(captured!.selectedRows).toEqual([ROWS[1]!]);
    expect(Array.from(captured!.toggledIndices)).toEqual([1]);
    expect(captured!.selection).toBeNull();
    expect(captured!.flavour).toBe("vanilla");

    captured!.reload!();
    expect(reloads).toBe(1);
  });

  test("reports the select-mode range and its rows", async () => {
    await setup({ actions: ACTIONS, multiSelect: false });
    await press(session, "v");
    await press(session, "j");
    await press(session, "x");

    expect(captured!.selection).toEqual({ start: 0, end: 1 });
    expect(captured!.selectedRows).toEqual([ROWS[0]!, ROWS[1]!]);
    expect(captured!.toggledIndices.size).toBe(0);
  });
});

describe("status bar", () => {
  test("emits Theme, caller items, Mode, Cursor in that order", async () => {
    await setup({ statusItems: [{ label: "Rows:", value: "3" }] });

    const line = statusLine();
    const positions = orderOf(line, ["Theme:", "Rows:", "Mode:", "Cursor:"]);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test("the selection count follows Cursor and only appears when non-empty", async () => {
    await setup();
    expect(statusLine()).not.toContain("Selected:");

    await pressTab(session);
    const line = statusLine();
    const [cursor, selected] = orderOf(line, ["Cursor:", "Selected:"]);
    expect(selected).toBeGreaterThan(cursor!);
    expect(line).toMatch(/Selected:\s*1/u);
  });

  test("Cursor renders a dash when there is no active row", async () => {
    session = await testRender(
      <TooeeProvider>
        <EmptyHarness />
      </TooeeProvider>,
      { width: 90, height: 16, kittyKeyboard: true },
    );
    await session.renderOnce();
    expect(statusLine()).toMatch(/Cursor:\s*-/u);
  });
});

function EmptyHarness() {
  const document = useDocumentController<Row>({
    rows: [],
    adapter: { getKey: (r) => r.id, getText: (r) => r.label },
  });
  return (
    <DocumentScreen controller={document} titleBar={{ title: "Docs" }}>
      <Document
        controller={document}
        showGutter={false}
        renderRow={(r) => <text content={r.label} />}
      />
    </DocumentScreen>
  );
}

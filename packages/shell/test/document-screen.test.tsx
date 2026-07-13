import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition, CommandContext } from "@tooee/commands";
import { Document, DocumentScreen, TooeeProvider, useDocumentController } from "@tooee/shell";
import type { DocumentCommandContext, DocumentScreenProps } from "@tooee/shell";
import { expectDefined, press, pressTab } from "./support/test-helpers.ts";
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
    handler: (ctx: CommandContext) => {
      captured = ctx.document;
    },
    hotkey: "x",
    id: "probe",
    modes: ["cursor", "select"],
    title: "Probe document context",
  },
  { handler: () => {}, id: "row.open", title: "Open row" },
];

/** Reports the commands registered on the surface DocumentScreen renders into. */
const CommandProbe = function CommandProbe() {
  const { commands } = useCommandContext();
  commandIds = commands.map((command) => command.id);
  return null;
};

type ScreenOptions = Partial<
  Pick<DocumentScreenProps<Row>, "actions" | "quit" | "themeCommands" | "statusItems" | "context">
>;

const Harness = function Harness({
  multiSelect = true,
  ...screen
}: ScreenOptions & { multiSelect?: boolean }): React.ReactNode {
  const document = useDocumentController<Row>({
    adapter: { getKey: (r) => r.id, getText: (r) => r.label },
    multiSelect,
    rows: ROWS,
  });

  return (
    <DocumentScreen controller={document} titleBar={{ title: "Docs" }} {...screen}>
      <CommandProbe />
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r): React.ReactNode => <text content={r.label} />}
      />
    </DocumentScreen>
  );
};

let session: TestSession;

beforeEach(() => {
  commandIds = [];
  captured = undefined;
  reloads = 0;
});

afterEach(() => {
  session?.renderer.destroy();
});

const setup = async function setup(props: ScreenOptions & { multiSelect?: boolean } = {}) {
  session = await testRender(
    <TooeeProvider>
      <Harness {...props} />
    </TooeeProvider>,
    { height: 16, kittyKeyboard: true, width: 90 },
  );
  await session.renderOnce();
  return session;
};

const statusLine = function statusLine(): string {
  const lines = session.captureCharFrame().split("\n");
  return lines.find((line) => line.includes("Theme:")) ?? "";
};

const orderOf = function orderOf(line: string, labels: string[]): number[] {
  return labels.map((label) => line.indexOf(label));
};

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
    await setup({
      quit: {
        hotkey: "ctrl+c",
        onQuit: () => {
          quits += 1;
        },
      },
    });

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
        extras: { flavour: "vanilla" },
        kind: "test-doc",
        reload: () => {
          reloads += 1;
        },
        title: "Docs",
      },
    });

    await press(session, "j");
    await pressTab(session);
    await press(session, "x");

    expect(captured).toBeDefined();
    expect(expectDefined(captured).kind).toBe("test-doc");
    expect(expectDefined(captured).title).toBe("Docs");
    expect(expectDefined(captured).rowCount).toBe(3);
    expect(expectDefined(captured).cursor).toBe(1);
    expect(expectDefined(captured).activeKey).toBe("b");
    expect(expectDefined(captured).activeRow).toEqual(expectDefined(ROWS[1]));
    expect(expectDefined(captured).selectedRows).toEqual([expectDefined(ROWS[1])]);
    expect([...expectDefined(captured).toggledIndices]).toEqual([1]);
    expect(expectDefined(captured).selection).toBeNull();
    expect(expectDefined(captured).flavour).toBe("vanilla");

    expectDefined(expectDefined(captured).reload)();
    expect(reloads).toBe(1);
  });

  test("reports the select-mode range and its rows", async () => {
    await setup({ actions: ACTIONS, multiSelect: false });
    await press(session, "v");
    await press(session, "j");
    await press(session, "x");

    expect(expectDefined(captured).selection).toEqual({ end: 1, start: 0 });
    expect(expectDefined(captured).selectedRows).toEqual([
      expectDefined(ROWS[0]),
      expectDefined(ROWS[1]),
    ]);
    expect(expectDefined(captured).toggledIndices.size).toBe(0);
  });
});

describe("status bar", () => {
  test("emits Theme, caller items, Mode, Cursor in that order", async () => {
    await setup({ statusItems: [{ label: "Rows:", value: "3" }] });

    const line = statusLine();
    const positions = orderOf(line, ["Theme:", "Rows:", "Mode:", "Cursor:"]);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  test("the selection count follows Cursor and only appears when non-empty", async () => {
    await setup();
    expect(statusLine()).not.toContain("Selected:");

    await pressTab(session);
    const line = statusLine();
    const [cursor, selected] = orderOf(line, ["Cursor:", "Selected:"]);
    expect(selected).toBeGreaterThan(expectDefined(cursor));
    expect(line).toMatch(/Selected:\s*1/u);
  });

  test("Cursor renders a dash when there is no active row", async () => {
    session = await testRender(
      <TooeeProvider>
        {/* Deferred(lint-sweep): preserve the deliberate harness-before-helper test layout. */}
        {/* oxlint-disable-next-line no-use-before-define -- harness is only evaluated after module initialization */}
        <EmptyHarness />
      </TooeeProvider>,
      { height: 16, kittyKeyboard: true, width: 90 },
    );
    await session.renderOnce();
    expect(statusLine()).toMatch(/Cursor:\s*-/u);
  });
});

const EmptyHarness = function EmptyHarness(): React.ReactNode {
  const document = useDocumentController<Row>({
    adapter: { getKey: (r) => r.id, getText: (r) => r.label },
    rows: [],
  });
  return (
    <DocumentScreen controller={document} titleBar={{ title: "Docs" }}>
      <Document
        controller={document}
        showGutter={false}
        renderRow={(r): React.ReactNode => <text content={r.label} />}
      />
    </DocumentScreen>
  );
};

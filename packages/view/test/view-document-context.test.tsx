import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { act } from "react";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition, CommandContext } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import type { DocumentCommandContext } from "@tooee/shell";
import { View } from "../src/view.js";
import type { ViewCommandContext } from "../src/hooks/use-view-command-context.js";
import type { AnyContent, ContentProvider } from "../src/types.js";
import { expectDefined } from "./support/expect-defined.ts";

const staticProvider = function staticProvider(content: AnyContent): ContentProvider {
  return { format: content.format, load: () => content };
};

const TABLE = staticProvider({
  columns: [
    { header: "Name", key: "name" },
    { header: "Role", key: "role" },
  ],
  format: "table",
  rows: [
    { name: "Alice", role: "dev" },
    { name: "Bob", role: "ops" },
    { name: "Carol", role: "dev" },
  ],
  title: "People",
});

const CODE = staticProvider({
  code: ["alpha", "beta", "gamma", "alpha again"].join("\n"),
  format: "code",
  language: "text",
});

let documentCtx: DocumentCommandContext | undefined;
let viewCtx: ViewCommandContext | undefined;
let commandIds: string[] = [];

const ACTIONS: ActionDefinition[] = [
  {
    handler: (ctx: CommandContext) => {
      documentCtx = ctx.document;
      viewCtx = ctx.view;
    },
    hotkey: "x",
    id: "probe",
    modes: ["cursor", "select"],
    title: "Probe context",
  },
];

/** Reports the commands registered on the surface the View renders into. */
const CommandProbe = function CommandProbe() {
  const { commands } = useCommandContext();
  commandIds = commands.map((command) => command.id);
  return null;
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

beforeEach(() => {
  documentCtx = undefined;
  viewCtx = undefined;
  commandIds = [];
});

afterEach(() => {
  testSetup?.renderer.destroy();
});

const setup = async function setup(provider: ContentProvider) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} actions={ACTIONS} />
      <CommandProbe />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await s.renderOnce();
  await act(async () => {
    await new Promise((r) => {
      setTimeout(r, 100);
    });
  });
  await s.renderOnce();
  return s;
};

const press = async function press(key: string, modifiers?: { shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

describe("ctx.document from a View screen", () => {
  test("carries row count, cursor, active row and kind", async () => {
    testSetup = await setup(TABLE);
    await press("x");

    expect(documentCtx).toBeDefined();
    const document = expectDefined(documentCtx);
    expect(document.kind).toBe("table");
    expect(document.title).toBe("People");
    expect(document.rowCount).toBe(3);
    expect(document.cursor).toBe(0);
    expect(document.activeRow).toEqual({ name: "Alice", role: "dev" });
    expect(document.selectedRows).toEqual([]);
  });

  test("tracks the cursor and reports toggled rows as selection", async () => {
    testSetup = await setup(TABLE);
    await press("j");
    await act(async () => {
      testSetup.mockInput.pressTab();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    await press("x");

    const document = expectDefined(documentCtx);
    expect(document.cursor).toBe(1);
    expect(document.activeRow).toEqual({ name: "Bob", role: "ops" });
    expect(Array.from(document.toggledIndices)).toEqual([1]);
    expect(document.selectedRows).toEqual([{ name: "Bob", role: "ops" }]);
  });

  test("a code View exposes its lines as document rows", async () => {
    testSetup = await setup(CODE);
    await press("j");
    await press("x");

    const document = expectDefined(documentCtx);
    expect(document.kind).toBe("code");
    expect(document.rowCount).toBe(4);
    expect(document.cursor).toBe(1);
    // Code rows are now source-backed SourceLineRow objects, not bare strings.
    const activeRow = document.activeRow;
    if (typeof activeRow !== "object" || activeRow === null || !("text" in activeRow)) {
      throw new Error("Expected code document row to contain text");
    }
    expect(activeRow.text).toBe("beta");
    expect(document.activeAnchor?.text).toBe("beta");
    expect(document.activeAnchor?.source?.primary.start.line).toBe(1);
  });
});

describe("ctx.view from a View screen", () => {
  test("is content-only — row state lives on ctx.document", async () => {
    testSetup = await setup(TABLE);
    await press("x");

    expect(viewCtx).toBeDefined();
    const view = expectDefined(viewCtx);
    expect(view.format).toBe("table");
    expect(view.title).toBe("People");
    expect(typeof view.reload).toBe("function");
    expect(view.marks.userMarks).toEqual([]);
    expect(view.marks.providerMarks).toEqual([]);

    expect(viewCtx).not.toHaveProperty("cursor");
    expect(viewCtx).not.toHaveProperty("selection");
    expect(viewCtx).not.toHaveProperty("activeRow");
    expect(viewCtx).not.toHaveProperty("selectedRows");
    expect(viewCtx).not.toHaveProperty("toggledIndices");
  });
});

describe("command registration after the controller migration", () => {
  test("registers navigation, search, copy, theme, quit and actions exactly once", async () => {
    testSetup = await setup(TABLE);

    const duplicates = commandIds.filter((id, index) => commandIds.indexOf(id) !== index);
    expect(duplicates).toEqual([]);

    for (const id of [
      "cursor-down",
      "cursor-up",
      "cursor-toggle",
      "select-toggle",
      "select-copy",
      "cursor-search-start",
      "cursor-search-next",
      "quit",
      "probe",
    ]) {
      expect(commandIds).toContain(id);
    }
  });
});

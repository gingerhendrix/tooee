import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { act } from "react";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition, CommandContext } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import type { DocumentCommandContext } from "@tooee/shell";
import { View } from "../src/View.js";
import type { ViewCommandContext } from "../src/hooks/useViewCommandContext.js";
import type { AnyContent, ContentProvider } from "../src/types.js";

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
    expect(documentCtx!.kind).toBe("table");
    expect(documentCtx!.title).toBe("People");
    expect(documentCtx!.rowCount).toBe(3);
    expect(documentCtx!.cursor).toBe(0);
    expect(documentCtx!.activeRow).toEqual({ name: "Alice", role: "dev" });
    expect(documentCtx!.selectedRows).toEqual([]);
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

    expect(documentCtx!.cursor).toBe(1);
    expect(documentCtx!.activeRow).toEqual({ name: "Bob", role: "ops" });
    expect(Array.from(documentCtx!.toggledIndices)).toEqual([1]);
    expect(documentCtx!.selectedRows).toEqual([{ name: "Bob", role: "ops" }]);
  });

  test("a code View exposes its lines as document rows", async () => {
    testSetup = await setup(CODE);
    await press("j");
    await press("x");

    expect(documentCtx!.kind).toBe("code");
    expect(documentCtx!.rowCount).toBe(4);
    expect(documentCtx!.cursor).toBe(1);
    // Code rows are now source-backed SourceLineRow objects, not bare strings.
    expect((documentCtx!.activeRow as { text: string }).text).toBe("beta");
    expect(documentCtx!.activeAnchor?.text).toBe("beta");
    expect(documentCtx!.activeAnchor?.source?.primary.start.line).toBe(1);
  });
});

describe("ctx.view from a View screen", () => {
  test("is content-only — row state lives on ctx.document", async () => {
    testSetup = await setup(TABLE);
    await press("x");

    expect(viewCtx).toBeDefined();
    expect(viewCtx!.format).toBe("table");
    expect(viewCtx!.title).toBe("People");
    expect(typeof viewCtx!.reload).toBe("function");
    expect(viewCtx!.marks.userMarks).toEqual([]);
    expect(viewCtx!.marks.providerMarks).toEqual([]);

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

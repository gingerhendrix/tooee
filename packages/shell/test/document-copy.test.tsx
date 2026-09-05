import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { copied } from "../../../test/support/clipboard-mock.ts";
import type { ReactNode } from "react";

const { TooeeProvider, useDocumentController, Document } = await import("@tooee/shell");
const { useMode } = await import("@tooee/commands");
const { useToast } = await import("@tooee/toasts");
const { press, pressTab } = await import("./support/test-helpers.ts");
type TestSession = Awaited<ReturnType<typeof testRender>>;

interface Row {
  id: string;
  label: string;
}

const ROWS: Row[] = [
  { id: "a", label: "alpha" },
  { id: "b", label: "beta" },
  { id: "c", label: "gamma" },
];

const StateProbe = function StateProbe(): ReactNode {
  const mode = useMode();
  const { currentToast } = useToast();
  return <text content={`mode:${mode} toast:${currentToast?.message ?? "none"}`} />;
};

const Harness = function Harness({
  copy,
  rows = ROWS,
}: {
  copy?: boolean;
  rows?: Row[];
}): ReactNode {
  const document = useDocumentController<Row>({
    // Copy must use the same semantic text projection as search.
    adapter: { getKey: (r) => r.id, getText: (r) => `${r.id}\t${r.label}` },
    copy,
    multiSelect: true,
    rows,
  });

  return (
    <box flexDirection="column" height="100%">
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r): ReactNode => <text content={r.label} />}
      />
      <StateProbe />
    </box>
  );
};

let session: TestSession;

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  session?.renderer.destroy();
});

const setup = async function setup(copy?: boolean, rows?: Row[]) {
  session = await testRender(
    <TooeeProvider>
      <Harness copy={copy} rows={rows} />
    </TooeeProvider>,
    { height: 12, kittyKeyboard: true, width: 40 },
  );
  await session.renderOnce();
  return session;
};

describe("copy", () => {
  test("yy copies the cursor row using the adapter text without entering select mode", async () => {
    await setup();
    await press(session, "j");
    await press(session, "y");
    expect(copied).toEqual([]);
    await press(session, "y");

    expect(copied).toEqual(["b\tbeta"]);
    expect(session.captureCharFrame()).toContain("mode:cursor");
  });

  test("yv copies a select-mode range and returns to cursor mode", async () => {
    await setup();
    await press(session, "v");
    await press(session, "j");
    await press(session, "y");
    expect(copied).toEqual([]);
    await press(session, "v");

    expect(copied).toEqual(["a\talpha\nb\tbeta"]);
    expect(session.captureCharFrame()).toContain("mode:cursor");
  });

  test("yv copies toggled rows in row order without requiring select mode", async () => {
    await setup();
    await press(session, "j");
    await press(session, "j");
    await pressTab(session);
    await press(session, "k");
    await press(session, "k");
    await pressTab(session);
    await press(session, "y");
    await press(session, "v");

    expect(copied).toEqual(["a\talpha\nc\tgamma"]);
  });

  test("yv does not fall back to the cursor row when no selection exists", async () => {
    await setup();
    await press(session, "y");
    await press(session, "v");

    expect(copied).toEqual([]);
    expect(session.captureCharFrame()).toContain("Nothing selected");
  });

  test("yy reports an empty document instead of invoking the clipboard", async () => {
    await setup(undefined, []);
    await press(session, "y");
    await press(session, "y");

    expect(copied).toEqual([]);
    expect(session.captureCharFrame()).toContain("Nothing to copy");
  });

  test("a failed y sequence owns the conflicting key and invokes neither command", async () => {
    await setup();
    await press(session, "y");
    await press(session, "x");

    expect(copied).toEqual([]);
    expect(session.captureCharFrame()).toContain("mode:cursor");
  });

  test("copy: false unregisters both copy commands", async () => {
    await setup(false);
    await press(session, "y");
    await press(session, "y");
    await press(session, "v");
    await press(session, "j");
    await press(session, "y");
    await press(session, "v");

    expect(copied).toEqual([]);
  });
});

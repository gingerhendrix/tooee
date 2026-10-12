import { test, expect, afterEach } from "bun:test";

import { RGBA } from "@opentui/core";
import { Document, TooeeProvider, useDocumentController } from "@tooee/shell";
import { testRender, expectDefined } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { useTheme } from "@tooee/themes";
import type { ResolvedTheme } from "@tooee/themes";
import type { ReactNode } from "react";

interface Row {
  id: string;
  label: string;
}

const ROWS: Row[] = [
  { id: "a", label: "alpha" },
  { id: "b", label: "beta" },
];

const ADAPTER = { getKey: (row: Row) => row.id, getText: (row: Row) => row.label };

let theme: ResolvedTheme | undefined;

let testSetup: TestSession | undefined;

const ThemeProbe = function ThemeProbe(): null {
  ({ theme } = useTheme());

  return null;
};

const Harness = function Harness({ palette }: { palette?: { gutterBg: string } }): ReactNode {
  const controller = useDocumentController({ adapter: ADAPTER, rows: ROWS });

  return (
    <Document
      controller={controller}
      palette={palette}
      showLineNumbers={false}
      signColumnWidth={1}
      style={{ flexGrow: 1 }}
      renderRow={(row): ReactNode => <text content={row.label} />}
    />
  );
};

/** Background of the first gutter cell on the second row (the row without the cursor). */
const gutterBackground = function gutterBackground(session: TestSession): RGBA {
  const line = expectDefined(session.captureSpans().lines[1]);

  return expectDefined(line.spans[0]).bg;
};

const renderDocument = async function renderDocument(palette?: { gutterBg: string }) {
  testSetup = await testRender(
    <TooeeProvider>
      <ThemeProbe />
      <Harness palette={palette} />
    </TooeeProvider>,
    { height: 6, width: 30 }
  );
  await testSetup.renderOnce();

  return testSetup;
};

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
  theme = undefined;
});

test("the gutter uses the theme element background by default", async () => {
  const session = await renderDocument();
  const expected = RGBA.fromHex(expectDefined(theme).backgroundElement);

  expect(gutterBackground(session).toString()).toBe(expected.toString());
});

test("a caller palette overrides the theme gutter colours", async () => {
  const session = await renderDocument({ gutterBg: "#ff0000" });

  expect(gutterBackground(session).toString()).toBe(RGBA.fromHex("#ff0000").toString());
});

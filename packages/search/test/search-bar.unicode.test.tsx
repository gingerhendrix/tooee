import { afterEach, expect, test } from "bun:test";

import { TooeeProvider } from "@tooee/shell";
import { testRender, expectDefined } from "@tooee/test-support";
import { act, useState } from "react";
import type { ReactNode } from "react";

import { SearchBar } from "../src/search-bar.js";

let session: Awaited<ReturnType<typeof testRender>>;

afterEach(async () => {
  session?.renderer.destroy();
  await session?.renderer.closed;
});

const Harness = function Harness(): ReactNode {
  const [query, setQuery] = useState("");

  return <SearchBar query={query} onQueryChange={setQuery} onSubmit={() => {}} />;
};

test("search cursor edits preserve CJK, emoji and tabs", async () => {
  session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    {
      height: 5,
      kittyKeyboard: true,
      width: 40,
    }
  );
  await session.renderOnce();
  await act(async () => {
    await session.mockInput.pasteBracketedText("漢🙂\tx");
  });
  await session.renderOnce();
  const input = expectDefined(session.renderer.currentFocusedEditor);
  expect(input.plainText).toBe("漢🙂\tx");
  act(() => {
    session.mockInput.pressArrow("left");
    session.mockInput.pressBackspace();
  });
  await session.renderOnce();
  expect(input.plainText).toBe("漢🙂x");
  act(() => {
    session.mockInput.pressArrow("left");
    session.mockInput.pressKey("!");
  });
  await session.renderOnce();
  expect(input.plainText).toBe("漢!🙂x");
  expect(session.captureCharFrame()).toContain("漢!🙂x");
});

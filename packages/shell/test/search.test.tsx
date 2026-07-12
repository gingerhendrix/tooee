import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { TooeeProvider, useNavigation } from "@tooee/shell";
import { findMatchingLines, useSearch } from "@tooee/search";
import type { SearchState } from "@tooee/search";
import { useMode } from "@tooee/commands";
import { press, pressEscape } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

describe("findMatchingLines", () => {
  test("empty query returns empty array", () => {
    expect(findMatchingLines("hello\nworld", "")).toEqual([]);
  });

  test("single match", () => {
    expect(findMatchingLines("foo\nbar\nbaz", "bar")).toEqual([1]);
  });

  test("multiple matches", () => {
    expect(findMatchingLines("foo\nbar\nfoo\nbaz", "foo")).toEqual([0, 2]);
  });

  test("case insensitive", () => {
    expect(findMatchingLines("Hello\nWORLD\nhello", "hello")).toEqual([0, 2]);
  });

  test("no matches", () => {
    expect(findMatchingLines("foo\nbar\nbaz", "xyz")).toEqual([]);
  });

  test("partial line match", () => {
    expect(findMatchingLines("foobar\nbaz", "oob")).toEqual([0]);
  });

  test("single line text", () => {
    expect(findMatchingLines("hello world", "world")).toEqual([0]);
  });

  test("empty text", () => {
    expect(findMatchingLines("", "foo")).toEqual([]);
  });
});

const TEST_TEXT = "alpha\nbeta\ngamma\nalpha again\ndelta";

// Module-level ref for imperative access to search state from tests
let searchHandle: SearchState | null = null;

const SearchHarness = function SearchHarness(): React.ReactNode {
  const nav = useNavigation({ rowCount: TEST_TEXT.split("\n").length, viewportHeight: 3 });
  const mode = useMode();
  const search = useSearch({
    match: (query) => findMatchingLines(TEST_TEXT, query),
    onJump: nav.setCursor,
  });

  // Expose search state to test code via module-level ref
  searchHandle = search;

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`cursor:${nav.cursor !== null ? nav.cursor : "null"}`} />
      <text content={`search:${search.searchActive}`} />
      <text content={`matches:${search.matchingLines.join(",")}`} />
      <text content={`matchIdx:${search.currentMatchIndex}`} />
      <text content={`query:${search.searchQuery}`} />
    </box>
  );
};

const setup = async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <SearchHarness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 60 },
  );
  await session.renderOnce();
  return session;
};

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
  searchHandle = null;
});

describe("search hook", () => {
  test("computes matches once per query event and not again on submit", async () => {
    let calls = 0;
    const CountingHarness = function CountingHarness(): React.ReactNode {
      const nav = useNavigation({ rowCount: 2 });
      const search = useSearch({
        match: () => {
          calls++;
          return [0];
        },
        onJump: nav.setCursor,
      });
      searchHandle = search;
      return <text content={search.searchQuery} />;
    };
    testSetup = await testRender(
      <TooeeProvider>
        <CountingHarness />
      </TooeeProvider>,
      { height: 10, kittyKeyboard: true, width: 40 },
    );
    await testSetup.renderOnce();
    await act(async () => {
      searchHandle!.setSearchQuery("a");
      await Promise.resolve();
    });
    await act(async () => {
      searchHandle!.submitSearch();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(calls).toBe(1);
  });

  test("/ activates search and switches to insert mode", async () => {
    testSetup = await setup();
    await press(testSetup, "/");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("search:true");
    expect(frame).toContain("mode:insert");
  });

  test("search live-updates matches while typing", async () => {
    testSetup = await setup();
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("search:true");
    expect(frame).toContain("query:alpha");
    expect(frame).toContain("matches:0,3");
  });

  test("Escape cancels search and restores cursor mode", async () => {
    testSetup = await setup();
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("search:false");
    expect(frame).toContain("mode:cursor");
    expect(frame).toContain("matches:");
  });

  test("n and N cycle matches after submit", async () => {
    testSetup = await setup();
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Submit search
    await act(async () => {
      searchHandle!.submitSearch();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("search:false");
    expect(frame).toContain("mode:cursor");
    expect(frame).toContain("matches:0,3");
    expect(frame).toContain("matchIdx:0");
    expect(frame).toContain("cursor:0");

    await press(testSetup, "n");
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("matchIdx:1");
    expect(frame).toContain("cursor:3");

    await press(testSetup, "n", { shift: true });
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("matchIdx:0");
    expect(frame).toContain("cursor:0");
  });

  test("submitSearch exits insert mode but keeps matches", async () => {
    testSetup = await setup();
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await act(async () => {
      searchHandle!.submitSearch();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("mode:cursor");
    expect(frame).toContain("search:false");
    expect(frame).toContain("matches:0,3");
  });
});

// A document whose text arrives after the first render, the way a streaming or
// reloaded provider delivers it.
let appendLine: ((line: string) => void) | null = null;

const GrowingSearchHarness = function GrowingSearchHarness({
  deps,
}: {
  deps: boolean;
}): React.ReactNode {
  const [lines, setLines] = useState(["alpha", "beta"]);
  appendLine = (line) => {
    setLines((current) => [...current, line]);
  };

  const text = lines.join("\n");
  const nav = useNavigation({ rowCount: lines.length, viewportHeight: 3 });
  const search = useSearch({
    deps: deps ? [text] : undefined,
    match: (query) => findMatchingLines(text, query),
    onJump: nav.setCursor,
  });
  searchHandle = search;

  return <text content={`matches:[${search.matchingLines.join(",")}]`} />;
};

const setupGrowing = async function setupGrowing(deps: boolean) {
  const session = await testRender(
    <TooeeProvider>
      <GrowingSearchHarness deps={deps} />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 60 },
  );
  await session.renderOnce();
  return session;
};

describe("search over changing content", () => {
  test("a committed query re-matches rows added after the search", async () => {
    testSetup = await setupGrowing(true);
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await act(async () => {
      searchHandle!.submitSearch();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("matches:[0]");

    await act(async () => {
      appendLine!("alpha again");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("matches:[0,2]");
  });

  test("without deps the committed matches stay memoized on the query", async () => {
    testSetup = await setupGrowing(false);
    await press(testSetup, "/");

    await act(async () => {
      searchHandle!.setSearchQuery("alpha");
      await Promise.resolve();
    });
    await act(async () => {
      searchHandle!.submitSearch();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await act(async () => {
      appendLine!("alpha again");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("matches:[0]");
  });
});

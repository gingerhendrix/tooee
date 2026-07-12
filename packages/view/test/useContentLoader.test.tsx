import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { useContentLoader } from "../src/hooks/useContentLoader.js";
import type { ContentChunk, ContentProvider } from "../src/types.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const Loader = function Loader({ provider }: { provider: ContentProvider }) {
  const { content, streaming, error } = useContentLoader(provider);
  const text = content && "text" in content ? content.text : "";
  return (
    <box flexDirection="column">
      <text content={`text:${text}`} />
      <text content={`streaming:${streaming}`} />
      <text content={`error:${error ?? "none"}`} />
    </box>
  );
};

const flush = async function flush(s: TestSession) {
  await act(async () => {
    await Promise.resolve();
  });
  await s.renderOnce();
};

describe("useContentLoader streaming lifecycle (R-03)", () => {
  test("cleanup closes the streaming iterator", async () => {
    let returned = false;
    const iterable: AsyncIterable<ContentChunk> = {
      [Symbol.asyncIterator]() {
        let first = true;
        return {
          next: () => {
            if (first) {
              first = false;
              return Promise.resolve({
                done: false as const,
                value: { data: "hello", format: "text" as const, type: "append" as const },
              });
            }
            // Long-lived stream: never yields again
            return new Promise<IteratorResult<ContentChunk>>(() => {});
          },
          return: () => {
            returned = true;
            return Promise.resolve({ done: true as const, value: undefined });
          },
        };
      },
    };
    const provider: ContentProvider = { format: "text", load: () => iterable };

    let hide!: () => void;
    const Harness = function Harness() {
      const [show, setShow] = useState(true);
      hide = () => setShow(false);
      return show ? <Loader provider={provider} /> : <text content="unmounted" />;
    };

    testSetup = await testRender(<Harness />, { height: 10, width: 60 });
    await testSetup.renderOnce();
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("text:hello");
    expect(returned).toBe(false);

    // Unmount mid-stream: the iterator must be closed so the provider's
    // resources (subprocess, file handle, network stream) are released.
    await act(async () => {
      hide();
    });
    await testSetup.renderOnce();
    expect(returned).toBe(true);
  });

  test("non-Error stream failure is surfaced, not dropped", async () => {
    const failing = async function* failing(): AsyncIterable<ContentChunk> {
      yield { data: "partial", format: "text", type: "append" };
      // eslint-disable-next-line no-throw-literal
      throw "stream blew up";
    };
    const provider: ContentProvider = { format: "text", load: () => failing() };

    testSetup = await testRender(<Loader provider={provider} />, { height: 10, width: 60 });
    await testSetup.renderOnce();
    await flush(testSetup);
    await flush(testSetup);

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("error:stream blew up");
    expect(frame).toContain("streaming:false");
  });

  test("non-Error promise rejection is surfaced, not undefined", async () => {
    const provider: ContentProvider = {
      // eslint-disable-next-line prefer-promise-reject-errors
      load: () => Promise.reject("load blew up"),
    };

    testSetup = await testRender(<Loader provider={provider} />, { height: 10, width: 60 });
    await testSetup.renderOnce();
    await flush(testSetup);

    expect(testSetup.captureCharFrame()).toContain("error:load blew up");
  });
});

describe("useContentLoader reload and request identity", () => {
  test("reloads a synchronous provider", async () => {
    let calls = 0;
    let reload!: () => void;
    const provider: ContentProvider = {
      load: () => ({ format: "text", text: `sync-${++calls}` }),
    };
    const Harness = function Harness() {
      const result = useContentLoader(provider);
      reload = result.reload;
      const value = result.content && "text" in result.content ? result.content.text : "";
      return <text content={value} />;
    };
    testSetup = await testRender(<Harness />, { height: 10, width: 60 });
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("sync-1");
    await act(async () => reload());
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("sync-2");
  });

  test("reloads a Promise provider and ignores the stale resolution", async () => {
    const resolvers: Array<(value: { format: "text"; text: string }) => void> = [];
    let reload!: () => void;
    const provider: ContentProvider = {
      load: () => new Promise((resolve) => resolvers.push(resolve)),
    };
    const Harness = function Harness() {
      const result = useContentLoader(provider);
      reload = result.reload;
      const value = result.content && "text" in result.content ? result.content.text : "loading";
      return <text content={value} />;
    };
    testSetup = await testRender(<Harness />, { height: 10, width: 60 });
    await flush(testSetup);
    await act(async () => reload());
    await flush(testSetup);
    expect(resolvers).toHaveLength(2);
    resolvers[0]!({ format: "text", text: "stale" });
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).not.toContain("stale");
    resolvers[1]!({ format: "text", text: "fresh" });
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("fresh");
  });

  test("reloads a stream, closes the old iterator, and ignores its late chunk", async () => {
    let calls = 0;
    let oldReturned = false;
    let resolveOldNext!: (result: IteratorResult<ContentChunk>) => void;
    let reload!: () => void;
    const provider: ContentProvider = {
      format: "text",
      load: () => {
        calls++;
        if (calls === 1) {
          let first = true;
          return {
            [Symbol.asyncIterator]() {
              return {
                next() {
                  if (first) {
                    first = false;
                    return Promise.resolve({
                      done: false as const,
                      value: { data: "old", format: "text" as const, type: "append" as const },
                    });
                  }
                  return new Promise<IteratorResult<ContentChunk>>((resolve) => {
                    resolveOldNext = resolve;
                  });
                },
                return() {
                  oldReturned = true;
                  return Promise.resolve({ done: true as const, value: undefined });
                },
              };
            },
          };
        }
        return (async function* () {
          yield { data: "fresh", format: "text" as const, type: "append" as const };
        })();
      },
    };
    const Harness = function Harness() {
      const result = useContentLoader(provider);
      reload = result.reload;
      const value = result.content && "text" in result.content ? result.content.text : "";
      return <text content={`${result.status}:${value}`} />;
    };
    testSetup = await testRender(<Harness />, { height: 10, width: 60 });
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("old");
    await act(async () => reload());
    await flush(testSetup);
    expect(oldReturned).toBe(true);
    expect(testSetup.captureCharFrame()).toContain("ready:fresh");
    resolveOldNext({
      done: false,
      value: { data: "-late", format: "text", type: "append" },
    });
    await flush(testSetup);
    expect(testSetup.captureCharFrame()).toContain("ready:fresh");
    expect(testSetup.captureCharFrame()).not.toContain("late");
  });
});

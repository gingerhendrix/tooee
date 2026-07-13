import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { TooeeProvider } from "@tooee/shell";
import { Choose } from "../src/choose.js";
import { ChooseOverlay } from "../src/choose-overlay.js";
import type { ChooseContentProvider, ChooseItem } from "../src/types.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const deferred = function deferred<T>() {
  return Promise.withResolvers<T>();
};

const flush = async function flush(s: TestSession) {
  await act(async () => {
    await Promise.resolve();
  });
  await s.renderOnce();
};

describe("Choose async load (R-02)", () => {
  test("load rejection shows an error instead of eternal Loading", async () => {
    const provider: ChooseContentProvider = {
      load: async () => {
        const items = await Promise.reject<ChooseItem[]>(new Error("boom"));
        return items;
      },
    };
    testSetup = await testRender(
      <TooeeProvider initialMode="insert">
        <Choose contentProvider={provider} />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();
    await flush(testSetup);

    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Loading...");
    expect(frame).toContain("Error: boom");
  });

  test("non-Error rejection is stringified", async () => {
    const provider: ChooseContentProvider = {
      load: async () => {
        // eslint-disable-next-line prefer-promise-reject-errors
        await Promise.reject("plain failure");
      },
    };
    testSetup = await testRender(
      <TooeeProvider initialMode="insert">
        <Choose contentProvider={provider} />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();
    await flush(testSetup);

    expect(testSetup.captureCharFrame()).toContain("Error: plain failure");
  });

  test("stale results from a replaced provider are ignored", async () => {
    const slow = deferred<ChooseItem[]>();
    const slowProvider: ChooseContentProvider = {
      load: async () => {
        const items = await slow.promise;
        return items;
      },
    };
    const fastProvider: ChooseContentProvider = { load: () => [{ text: "fresh-item" }] };

    let swap!: () => void;
    const Harness = function Harness(): React.ReactNode {
      const [provider, setProvider] = useState(slowProvider);
      swap = () => {
        setProvider(fastProvider);
      };
      return <Choose contentProvider={provider} />;
    };

    testSetup = await testRender(
      <TooeeProvider initialMode="insert">
        <Harness />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Loading...");

    // Replace the provider, then let the old (stale) load resolve afterwards.
    await act(async () => {
      swap();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    await act(async () => {
      slow.resolve([{ text: "stale-item" }]);
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("fresh-item");
    expect(frame).not.toContain("stale-item");
  });

  test("stale rejection from a replaced provider is ignored", async () => {
    const slow = deferred<ChooseItem[]>();
    const slowProvider: ChooseContentProvider = {
      load: async () => {
        const items = await slow.promise;
        return items;
      },
    };
    const fastProvider: ChooseContentProvider = { load: () => [{ text: "fresh-item" }] };

    let swap!: () => void;
    const Harness = function Harness(): React.ReactNode {
      const [provider, setProvider] = useState(slowProvider);
      swap = () => {
        setProvider(fastProvider);
      };
      return <Choose contentProvider={provider} />;
    };

    testSetup = await testRender(
      <TooeeProvider initialMode="insert">
        <Harness />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      swap();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    await act(async () => {
      slow.reject(new Error("stale failure"));
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("fresh-item");
    expect(frame).not.toContain("stale failure");
  });
});

describe("ChooseOverlay async load (R-02)", () => {
  test("loader rejection shows an error instead of eternal Loading", async () => {
    testSetup = await testRender(
      <TooeeProvider initialMode="insert">
        <ChooseOverlay
          items={async () => {
            const items = await Promise.reject<ChooseItem[]>(new Error("overlay boom"));
            return items;
          }}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();
    await flush(testSetup);

    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Loading...");
    expect(frame).toContain("Error: overlay boom");
  });
});

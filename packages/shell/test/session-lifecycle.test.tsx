import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { useEffect } from "react";
import { createTestRenderer } from "@opentui/core/testing";
import type { CliRendererConfig } from "@opentui/core";
import { guardTerminalHealth, launchCli, mountTooee, runCliSession } from "../src/launch.js";
import type { CliSessionController, TooeeSessionHandle } from "../src/launch.js";

const expectDefined = function expectDefined<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("Expected test value to be defined");
  }
  return value;
};

let testRenderer: Awaited<ReturnType<typeof createTestRenderer>> | undefined;
let sessionHandle: TooeeSessionHandle | undefined;

afterEach(() => {
  sessionHandle?.destroy();
  sessionHandle = undefined;
  testRenderer?.renderer.destroy();
  testRenderer = undefined;
});

const remoteRendererOptions = function remoteRendererOptions(
  onDestroy?: () => void,
): CliRendererConfig {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.setRawMode = () => stdin;

  const stdout = new PassThrough();
  stdout.isTTY = true;
  stdout.columns = 40;
  stdout.rows = 10;

  return {
    height: 10,
    onDestroy,
    remote: true,
    stdin,
    stdout,
    useThread: false,
    width: 40,
  };
};

describe("mountTooee", () => {
  test("unmounts idempotently without destroying an external renderer", async () => {
    testRenderer = await createTestRenderer({ height: 10, width: 40 });
    const { renderer } = testRenderer;
    const originalDestroy = renderer.destroy.bind(renderer);
    let destroyCalls = 0;
    renderer.destroy = () => {
      destroyCalls += 1;
      originalDestroy();
    };

    const mount = mountTooee(renderer, <text>external mount</text>);
    expect(mount.ownership).toBe("external");
    expect(mount.unmounted).toBe(false);

    mount.unmount();
    mount.unmount();

    expect(mount.unmounted).toBe(true);
    expect(destroyCalls).toBe(0);
  });

  test("does not install terminal-health listeners", async () => {
    testRenderer = await createTestRenderer({ height: 10, width: 40 });
    const { stdin } = testRenderer.renderer;
    const beforeEnd = stdin.listenerCount("end");
    const beforeClose = stdin.listenerCount("close");

    const mount = mountTooee(testRenderer.renderer, <text>listener ownership</text>);

    expect(stdin.listenerCount("end")).toBe(beforeEnd);
    expect(stdin.listenerCount("close")).toBe(beforeClose);
    mount.unmount();
  });
});

describe("local sessions", () => {
  test("renderer-originated destroy unmounts the owned React tree", async () => {
    let effectCleanupCalls = 0;
    const ResourceOwner = function ResourceOwner(): React.ReactNode {
      useEffect(() => {
        const interval = setInterval(() => void 0, 1000);
        return () => {
          clearInterval(interval);
          effectCleanupCalls += 1;
        };
      }, []);
      return <text>resource owner</text>;
    };

    sessionHandle = await launchCli(<ResourceOwner />, {
      renderer: remoteRendererOptions(),
      terminalHealth: false,
    });
    await Bun.sleep(20);
    const unmountRoot = sessionHandle.root.unmount.bind(sessionHandle.root);
    let rootUnmountCalls = 0;
    sessionHandle.root.unmount = () => {
      rootUnmountCalls += 1;
      unmountRoot();
    };

    sessionHandle.renderer.destroy();
    sessionHandle.destroy();
    await Bun.sleep(20);

    expect(sessionHandle.destroyed).toBe(true);
    expect(rootUnmountCalls).toBe(1);
    expect(effectCleanupCalls).toBe(1);
  });

  test("destroy releases the renderer and health listeners exactly once", async () => {
    let rendererDestroyCalls = 0;
    const rendererOptions = remoteRendererOptions(() => {
      rendererDestroyCalls += 1;
    });
    const stdin = expectDefined(rendererOptions.stdin);
    const beforeEnd = stdin.listenerCount("end");
    const beforeClose = stdin.listenerCount("close");

    sessionHandle = await launchCli(<text>local session</text>, {
      renderer: rendererOptions,
    });

    expect(sessionHandle.ownership).toBe("local");
    expect(stdin.listenerCount("end")).toBe(beforeEnd + 1);
    expect(stdin.listenerCount("close")).toBe(beforeClose + 1);

    sessionHandle.destroy();
    sessionHandle.destroy();

    expect(sessionHandle.destroyed).toBe(true);
    expect(rendererDestroyCalls).toBe(1);
    expect(stdin.listenerCount("end")).toBe(beforeEnd);
    expect(stdin.listenerCount("close")).toBe(beforeClose);
  });

  test("runCliSession resolves once and destroys owned resources", async () => {
    let controller: CliSessionController<string> | undefined;
    let rendererDestroyCalls = 0;

    const resultPromise = runCliSession<string>(
      (session): React.ReactNode => {
        controller = session;
        return <text>settlement</text>;
      },
      {
        renderer: remoteRendererOptions(() => {
          rendererDestroyCalls += 1;
        }),
        terminalHealth: false,
      },
    );

    await Bun.sleep(20);
    expectDefined(controller).resolve("first");
    expectDefined(controller).resolve("second");
    expectDefined(controller).cancel();

    expect(await resultPromise).toBe("first");
    expect(rendererDestroyCalls).toBe(1);
  });

  test("runCliSession cancels and converts render failures to null", async () => {
    let controller: CliSessionController<string> | undefined;
    const cancelled = runCliSession<string>(
      (session): React.ReactNode => {
        controller = session;
        return <text>cancel</text>;
      },
      { renderer: remoteRendererOptions(), terminalHealth: false },
    );

    await Bun.sleep(20);
    expectDefined(controller).cancel();
    expectDefined(controller).resolve("late");
    expect(await cancelled).toBeNull();

    const failed = await runCliSession<string>(() => {
      throw new Error("render factory failed");
    });
    expect(failed).toBeNull();
  });
});

test("guardTerminalHealth owns and removes only its listeners", async () => {
  testRenderer = await createTestRenderer({ height: 10, width: 40 });
  const { renderer } = testRenderer;
  const { stdin } = renderer;
  const beforeEnd = stdin.listenerCount("end");
  const beforeClose = stdin.listenerCount("close");

  const dispose = guardTerminalHealth(renderer, {
    destroyRenderer: false,
    exitProcess: false,
  });
  expect(stdin.listenerCount("end")).toBe(beforeEnd + 1);
  expect(stdin.listenerCount("close")).toBe(beforeClose + 1);

  dispose();
  dispose();
  expect(stdin.listenerCount("end")).toBe(beforeEnd);
  expect(stdin.listenerCount("close")).toBe(beforeClose);
});

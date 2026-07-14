import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act, useEffect } from "react";
import {
  createRoute,
  createRouter,
  createStateKey,
  RouterProvider,
  Outlet,
  useScreenState,
} from "@tooee/router";
import { counterState, valueState } from "./support/codecs.ts";

// Route specs (identity + screen-state codec) declared before their components.
const screenASpec = { id: "screenA", screenState: valueState } as const;
const savingSpec = { id: "saving", screenState: counterState } as const;

// Typed cache keys: the key carries the codec, so save/restore stay coupled.
const screenAKeyAt = (index: number) => createStateKey(`${index}:screenA`, valueState);
const savingKeyAt = (index: number) => createStateKey(`${index}:saving`, counterState);
const screenBKeyAt = (index: number) => createStateKey(`${index}:screenB`, valueState);

// Screen that displays saved state from useScreenState hook

const ScreenA = function ScreenA(): React.ReactNode {
  const { savedState } = useScreenState(screenASpec);
  return (
    <box>
      <text content={`screenA:saved:${savedState?.value ?? "none"}`} />
    </box>
  );
};

const ScreenB = function ScreenB(): React.ReactNode {
  return (
    <box>
      <text content="screenB" />
    </box>
  );
};

// Screen that saves state via the hook on mount

const SavingScreen = function SavingScreen(): React.ReactNode {
  const { savedState, saveState } = useScreenState(savingSpec);
  const count = savedState?.counter ?? 0;
  useEffect(() => {
    saveState({ counter: count + 1 });
  }, [saveState, count]);
  return (
    <box>
      <text content={`saving:count:${count}`} />
    </box>
  );
};

// Route definitions

const routeA = createRoute({ ...screenASpec, component: ScreenA });
const routeB = createRoute({ component: ScreenB, id: "screenB" });
const savingRoute = createRoute({ ...savingSpec, component: SavingScreen });

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("useScreenState", () => {
  test("saved state is available after pop", async () => {
    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Initially no saved state
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenA:saved:none");

    // Save state via router's cache (simulating component saving before unmount)
    router.stateCache.save(screenAKeyAt(0), { value: "preserved" });

    // Navigate away
    await act(async () => {
      router.push("screenB");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenB");

    // Pop back
    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Saved state should be restored
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenA:saved:preserved");
  });

  test("reset clears all saved state", async () => {
    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Save state
    router.stateCache.save(screenAKeyAt(0), { value: "will-be-cleared" });

    // Push then reset
    await act(async () => {
      router.push("screenB");
      await Promise.resolve();
    });
    await act(async () => {
      router.reset("screenA");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // After reset, saved state should be cleared
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenA:saved:none");
  });

  test("different stack positions have independent cache entries", async () => {
    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Save state for screenA at position 0
    router.stateCache.save(screenAKeyAt(0), { value: "pos0" });

    // Push screenB, then push screenA again (now at position 2)
    await act(async () => {
      router.push("screenB");
      await Promise.resolve();
    });
    await act(async () => {
      router.push("screenA");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Screen A at position 2 should NOT have the state from position 0
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenA:saved:none");

    // Save different state for screenA at position 2
    router.stateCache.save(screenAKeyAt(2), { value: "pos2" });

    // Pop back to screenB
    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    // Pop back to screenA at position 0
    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Screen A at position 0 should have its own state
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screenA:saved:pos0");
  });

  test("saveState from hook stores state in cache", async () => {
    const router = createRouter({
      defaultRoute: "saving",
      routes: [savingRoute, routeB],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // SavingScreen should have saved state via the hook's saveState
    const cached = router.stateCache.restore(savingKeyAt(0));
    expect(cached).toEqual({ counter: 1 });
  });

  test("pop clears cache for the popped entry", async () => {
    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("screenB");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Save state for screenB at position 1
    router.stateCache.save(screenBKeyAt(1), { value: "temp" });
    expect(router.stateCache.restore(screenBKeyAt(1))).toEqual({ value: "temp" });

    // Pop screenB — its cache should be cleared
    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(router.stateCache.restore(screenBKeyAt(1))).toBeUndefined();
  });
});

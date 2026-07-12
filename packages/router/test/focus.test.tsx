import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach, beforeEach } from "bun:test";
import { act } from "react";
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useScreenFocus,
  useScreenEffect,
} from "@tooee/router";

// Simple screen that reports its focus state

const HomeScreen = function HomeScreen(): React.ReactNode {
  const { isFocused } = useScreenFocus();
  return (
    <box>
      <text content={`home:focused:${isFocused}`} />
    </box>
  );
};

// Nested layout that reports focus and renders child outlet

const FocusLayout = function FocusLayout(): React.ReactNode {
  const { isFocused } = useScreenFocus();
  return (
    <box>
      <text content={`layout:focused:${isFocused}`} />
      <Outlet />
    </box>
  );
};

const FocusChild = function FocusChild(): React.ReactNode {
  const { isFocused } = useScreenFocus();
  return (
    <box>
      <text content={`child:focused:${isFocused}`} />
    </box>
  );
};

// Effect tracking components

let effectLog: string[] = [];

const EffectLayout = function EffectLayout(): React.ReactNode {
  useScreenEffect(() => {
    effectLog.push("layout:effect");
    return () => {
      effectLog.push("layout:cleanup");
    };
  });
  const { isFocused } = useScreenFocus();
  return (
    <box>
      <text content={`elayout:focused:${isFocused}`} />
      <Outlet />
    </box>
  );
};

const EffectChild = function EffectChild(): React.ReactNode {
  useScreenEffect(() => {
    effectLog.push("child:effect");
    return () => {
      effectLog.push("child:cleanup");
    };
  });
  return (
    <box>
      <text content="echild" />
    </box>
  );
};

// Route definitions

const homeRoute = createRoute({ component: HomeScreen, id: "home" });
const layoutRoute = createRoute({ component: FocusLayout, id: "layout" });
const nestedRoute = createRoute({
  component: FocusChild,
  id: "nested",
  parent: layoutRoute,
});

const effectLayoutRoute = createRoute({ component: EffectLayout, id: "elayout" });
const effectNestedRoute = createRoute({
  component: EffectChild,
  id: "enested",
  parent: effectLayoutRoute,
});

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

beforeEach(() => {
  effectLog = [];
});

describe("useScreenFocus", () => {
  test("returns isFocused true for top-of-stack screen", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("home:focused:true");
  });

  test("nested parent has isFocused false, leaf has isFocused true", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, layoutRoute, nestedRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("nested");
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("layout:focused:false");
    expect(frame).toContain("child:focused:true");
  });

  test("focus updates when navigating from leaf to parent-only", async () => {
    const router = createRouter({
      defaultRoute: "layout",
      routes: [layoutRoute, nestedRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Layout alone is focused
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("layout:focused:true");

    // Push nested: layout loses focus, child gains it
    await act(async () => {
      router.push("nested");
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("layout:focused:false");
    expect(frame).toContain("child:focused:true");

    // Pop: layout regains focus
    await act(async () => {
      router.pop();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("layout:focused:true");
  });
});

describe("useScreenEffect", () => {
  test("effect fires when screen is focused", async () => {
    const router = createRouter({
      defaultRoute: "elayout",
      routes: [effectLayoutRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    expect(effectLog).toContain("layout:effect");
  });

  test("effect does not fire for unfocused parent", async () => {
    const router = createRouter({
      defaultRoute: "enested",
      routes: [effectLayoutRoute, effectNestedRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Only child effect should fire, not layout's
    expect(effectLog).toContain("child:effect");
    expect(effectLog).not.toContain("layout:effect");
  });

  test("cleanup fires when screen loses focus, re-fires on regain", async () => {
    const router = createRouter({
      defaultRoute: "elayout",
      routes: [effectLayoutRoute, effectNestedRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Layout is focused, effect should have fired
    expect(effectLog).toEqual(["layout:effect"]);

    // Push nested: layout loses focus
    await act(async () => {
      router.push("enested");
    });
    await testSetup.renderOnce();

    expect(effectLog).toContain("layout:cleanup");
    expect(effectLog).toContain("child:effect");

    // Clear log and pop: layout regains focus
    effectLog = [];
    await act(async () => {
      router.pop();
    });
    await testSetup.renderOnce();

    expect(effectLog).toContain("layout:effect");
  });
});

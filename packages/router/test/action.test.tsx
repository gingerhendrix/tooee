import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import React, { act } from "react";
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useActionResultHandler,
} from "@tooee/router";
import type { ActionNavigationResult } from "@tooee/router";

// Screens

const HomeScreen = function HomeScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:home" />
    </box>
  );
};

const DetailScreen = function DetailScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:detail" />
    </box>
  );
};

// Route definitions

const homeRoute = createRoute({ component: HomeScreen, id: "home" });
const detailRoute = createRoute({ component: DetailScreen, id: "detail" });

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("useActionResultHandler", () => {
  test("navigate result triggers router.push", async () => {
    let handler: (result: ActionNavigationResult) => void;

    const HandlerCapture = function HandlerCapture() {
      handler = useActionResultHandler();
      return null;
    };

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");

    await act(async () => {
      handler({ route: "detail", type: "navigate" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:detail");
    expect(router.stack.length).toBe(2);
  });

  test("navigate with mode replace triggers router.replace", async () => {
    let handler: (result: ActionNavigationResult) => void;

    const HandlerCapture = function HandlerCapture() {
      handler = useActionResultHandler();
      return null;
    };

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      handler({ mode: "replace", route: "detail", type: "navigate" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:detail");
    // Replace should keep stack at 1 entry
    expect(router.stack.length).toBe(1);
  });

  test("navigate with params passes params to push", async () => {
    let handler: (result: ActionNavigationResult) => void;

    const HandlerCapture = function HandlerCapture() {
      handler = useActionResultHandler();
      return null;
    };

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      handler({ params: { id: "1" }, route: "detail", type: "navigate" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:detail");
    expect(router.currentRoute.params).toEqual({ id: "1" });
  });

  test("back result triggers router.pop", async () => {
    let handler: (result: ActionNavigationResult) => void;

    const HandlerCapture = function HandlerCapture() {
      handler = useActionResultHandler();
      return null;
    };

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // Push to detail first
    await act(async () => {
      router.push("detail");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:detail");

    // Use handler to go back
    await act(async () => {
      handler({ type: "back" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");
    expect(router.stack.length).toBe(1);
  });

  test("handler is stable across re-renders", async () => {
    const handlerRefs: ((result: ActionNavigationResult) => void)[] = [];
    let forceUpdate: () => void;

    const HandlerCapture = function HandlerCapture() {
      const [, setState] = React.useState(0);
      forceUpdate = () => {
        setState((n) => n + 1);
      };
      const h = useActionResultHandler();
      handlerRefs.push(h);
      return null;
    };

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // Force re-renders
    await act(async () => {
      forceUpdate();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await act(async () => {
      forceUpdate();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Should have captured at least 3 renders
    expect(handlerRefs.length).toBeGreaterThanOrEqual(3);
    // All handler references should be the same function
    for (let i = 1; i < handlerRefs.length; i += 1) {
      expect(handlerRefs[i]).toBe(handlerRefs[0]);
    }
  });
});

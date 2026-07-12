import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useRouterCommands,
} from "@tooee/router";
import { CommandProvider, useCommandContext, useCommand } from "@tooee/commands";

// Screen that calls useRouterCommands

function HomeScreen() {
  useRouterCommands();
  return (
    <box>
      <text content="screen:home" />
    </box>
  );
}

function DetailScreen() {
  useRouterCommands();
  return (
    <box>
      <text content="screen:detail" />
    </box>
  );
}

// Route definitions

const homeRoute = createRoute({ component: HomeScreen, id: "home" });
const detailRoute = createRoute({ component: DetailScreen, id: "detail" });

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("useRouterCommands", () => {
  test("registers a router.back command", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // ctx.commands is a live getter, so it reads the current state of the registry
    const backCommand = ctx!.commands.find((c) => c.id === "router.back");
    expect(backCommand).toBeDefined();
    expect(backCommand!.title).toBe("Go back");
    expect(backCommand!.defaultHotkey).toBe("backspace");
  });

  test("when returns false when stack has single entry", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    const backCommand = ctx!.commands.find((c) => c.id === "router.back");
    expect(backCommand).toBeDefined();
    expect(backCommand!.when!({} as any)).toBe(false);
  });

  test("when returns true when stack has multiple entries", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("detail");
    });
    await testSetup.renderOnce();

    const backCommand = ctx!.commands.find((c) => c.id === "router.back");
    expect(backCommand).toBeDefined();
    expect(backCommand!.when!({} as any)).toBe(true);
  });

  test("calling handler triggers router.pop()", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // Push to detail
    await act(async () => {
      router.push("detail");
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:detail");

    // Invoke the back command handler
    const backCommand = ctx!.commands.find((c) => c.id === "router.back");
    await act(async () => {
      backCommand!.handler({} as any);
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");
  });
});

describe("natural command scoping via unmount", () => {
  test("commands from unmounted screens are removed from registry", async () => {
    function ScreenA() {
      useRouterCommands();
      useCommand({
        handler: () => {},
        hotkey: "a",
        id: "screenA.action",
        modes: ["cursor"],
        title: "Screen A action",
      });
      return (
        <box>
          <text content="screen:A" />
        </box>
      );
    }

    function ScreenB() {
      useCommand({
        handler: () => {},
        hotkey: "b",
        id: "screenB.action",
        modes: ["cursor"],
        title: "Screen B action",
      });
      return (
        <box>
          <text content="screen:B" />
        </box>
      );
    }

    const routeA = createRoute({ component: ScreenA, id: "screenA" });
    const routeB = createRoute({ component: ScreenB, id: "screenB" });

    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // Screen A is mounted — its commands should be registered
    const hasBack = () => ctx!.commands.some((c) => c.id === "router.back");
    const hasScreenA = () => ctx!.commands.some((c) => c.id === "screenA.action");
    const hasScreenB = () => ctx!.commands.some((c) => c.id === "screenB.action");

    expect(hasBack()).toBe(true);
    expect(hasScreenA()).toBe(true);

    // Push screen B — screen A is unmounted, its commands should be gone
    await act(async () => {
      router.push("screenB");
    });
    await testSetup.renderOnce();

    expect(hasScreenB()).toBe(true);
    expect(hasScreenA()).toBe(false);
    // router.back is gone because ScreenB doesn't call useRouterCommands
    expect(hasBack()).toBe(false);
  });

  test("commands re-register when screen remounts after pop", async () => {
    function ScreenA() {
      useRouterCommands();
      useCommand({
        handler: () => {},
        hotkey: "a",
        id: "screenA.action",
        modes: ["cursor"],
        title: "Screen A action",
      });
      return (
        <box>
          <text content="screen:A" />
        </box>
      );
    }

    function ScreenB() {
      return (
        <box>
          <text content="screen:B" />
        </box>
      );
    }

    const routeA = createRoute({ component: ScreenA, id: "screenA" });
    const routeB = createRoute({ component: ScreenB, id: "screenB" });

    const router = createRouter({
      defaultRoute: "screenA",
      routes: [routeA, routeB],
    });

    let ctx: ReturnType<typeof useCommandContext>;

    function CtxCapture() {
      ctx = useCommandContext();
      return null;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RouterProvider router={router}>
          <Outlet />
          <CtxCapture />
        </RouterProvider>
      </CommandProvider>,
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    const hasBack = () => ctx!.commands.some((c) => c.id === "router.back");
    const hasScreenA = () => ctx!.commands.some((c) => c.id === "screenA.action");

    // Screen A is mounted with its commands
    expect(hasScreenA()).toBe(true);
    expect(hasBack()).toBe(true);

    // Push screen B — screen A commands are gone
    await act(async () => {
      router.push("screenB");
    });
    await testSetup.renderOnce();

    expect(hasScreenA()).toBe(false);
    expect(hasBack()).toBe(false);

    // Pop back to screen A — commands should re-register
    await act(async () => {
      router.pop();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:A");
    expect(hasScreenA()).toBe(true);
    expect(hasBack()).toBe(true);
  });
});

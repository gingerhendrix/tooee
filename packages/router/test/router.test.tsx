import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useParams,
  useCurrentRoute,
  useCanGoBack,
} from "@tooee/router";
import { idParams } from "./support/codecs.ts";

// Route specs: identity + codecs, declared before the components that read them
// (a component cannot reference its own route object before it exists).

const detailSpec = { id: "detail", params: idParams } as const;

// Route components

const HomeScreen = function HomeScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:home" />
    </box>
  );
};

const DetailScreen = function DetailScreen(): React.ReactNode {
  const params = useParams(detailSpec);
  return (
    <box>
      <text content={`screen:detail:${params.id}`} />
    </box>
  );
};

const SettingsScreen = function SettingsScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:settings" />
    </box>
  );
};

// Parent/child for nested outlet tests

const LayoutScreen = function LayoutScreen(): React.ReactNode {
  return (
    <box>
      <text content="layout:" />
      <Outlet />
    </box>
  );
};

const NestedChild = function NestedChild(): React.ReactNode {
  return (
    <box>
      <text content="nested-child" />
    </box>
  );
};

// Route definitions

const homeRoute = createRoute({ component: HomeScreen, id: "home" });
const detailRoute = createRoute({ ...detailSpec, component: DetailScreen });
const settingsRoute = createRoute({ component: SettingsScreen, id: "settings" });

const layoutRoute = createRoute({ component: LayoutScreen, id: "layout" });
const nestedRoute = createRoute({
  component: NestedChild,
  id: "nested",
  parent: layoutRoute,
});

// Test harness that exposes navigation controls via rendered text

const NavHarness = function NavHarness(): React.ReactNode {
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();

  return (
    <box>
      <text content={`route:${current.routeId}`} />
      <text content={`back:${canGoBack}`} />
      <Outlet />
    </box>
  );
};

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("RouterProvider + Outlet", () => {
  test("renders default route", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("route:home");
    expect(frame).toContain("screen:home");
    expect(frame).toContain("back:false");
  });

  test("push navigates to new route", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("detail", { id: "42" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("route:detail");
    expect(frame).toContain("screen:detail:42");
    expect(frame).toContain("back:true");
  });

  test("pop returns to previous route", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("detail", { id: "1" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("route:home");
    expect(frame).toContain("screen:home");
    expect(frame).toContain("back:false");
  });

  test("replace swaps current route", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute, settingsRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.replace("settings");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("route:settings");
    expect(frame).toContain("screen:settings");
    expect(frame).toContain("back:false");
  });

  test("reset clears stack", async () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute, settingsRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("detail", { id: "1" });
      await Promise.resolve();
    });
    await act(async () => {
      router.push("settings");
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("back:true");

    await act(async () => {
      router.reset("home");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("route:home");
    expect(frame).toContain("back:false");
  });

  test("nested outlet renders parent chain", async () => {
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
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("layout:");
    expect(frame).toContain("nested-child");
  });
});

describe("createRouter (imperative)", () => {
  test("works outside React", () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    expect(router.currentRoute.routeId).toBe("home");
    expect(router.canGoBack()).toBe(false);

    router.push("detail", { id: "5" });
    expect(router.currentRoute.routeId).toBe("detail");
    expect(router.currentRoute.params).toEqual({ id: "5" });
    expect(router.canGoBack()).toBe(true);

    router.pop();
    expect(router.currentRoute.routeId).toBe("home");
    expect(router.canGoBack()).toBe(false);
  });

  test("subscribe notifies on changes", () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    let callCount = 0;
    const unsub = router.subscribe(() => {
      callCount += 1;
    });

    router.push("detail");
    expect(callCount).toBe(1);

    router.pop();
    expect(callCount).toBe(2);

    // pop at bottom is no-op, should not notify
    router.pop();
    expect(callCount).toBe(2);

    unsub();
    router.push("detail");
    expect(callCount).toBe(2);
  });

  test("getRouteDefinition returns route or undefined", () => {
    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, detailRoute],
    });

    expect(router.getRouteDefinition("home")).toBe(homeRoute);
    expect(router.getRouteDefinition("nonexistent")).toBeUndefined();
  });
});

#!/usr/bin/env bun
import { useState, useEffect } from "react";
import { launchCli } from "@tooee/shell";
import { useCommand } from "@tooee/commands";
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useParams,
  useCurrentRoute,
  useCanGoBack,
  useScreenFocus,
  useRouteData,
  useRouterCommands,
  useScreenState,
} from "@tooee/router";

// Parse CLI args
const args = process.argv.slice(2);
const loaderDelayArg = args.find((a) => a.startsWith("--loader-delay="));
const loaderDelay =
  (loaderDelayArg?.length ?? 0) > 0 ? Math.trunc(Number(loaderDelayArg.split("=")[1])) : 500;

// --- Screen Components ---

const HomeScreen = function HomeScreen(): React.ReactNode {
  useRouterCommands();
  const { isFocused } = useScreenFocus();
  const nav = useNavigate();
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();
  const { savedState, saveState } = useScreenState<number>();
  const [counter, setCounter] = useState(savedState ?? 0);

  // Persist counter to state cache on every change
  useEffect(() => {
    saveState(counter);
  }, [counter, saveState]);

  useCommand({
    handler: () => {
      nav.push("detail", { id: "42" });
    },
    hotkey: "1",
    id: "home.push-detail",
    modes: ["cursor"],
    title: "Push detail",
  });

  useCommand({
    handler: () => {
      nav.push("settings");
    },
    hotkey: "2",
    id: "home.push-settings",
    modes: ["cursor"],
    title: "Push settings",
  });

  useCommand({
    handler: () => {
      nav.push("slow");
    },
    hotkey: "3",
    id: "home.push-slow",
    modes: ["cursor"],
    title: "Push slow",
  });

  useCommand({
    handler: () => {
      nav.push("error-route");
    },
    hotkey: "4",
    id: "home.push-error",
    modes: ["cursor"],
    title: "Push error route",
  });

  useCommand({
    handler: () => {
      nav.push("child");
    },
    hotkey: "5",
    id: "home.push-nested",
    modes: ["cursor"],
    title: "Push nested",
  });

  useCommand({
    handler: () => {
      nav.replace("settings");
    },
    hotkey: "r",
    id: "home.replace-settings",
    modes: ["cursor"],
    title: "Replace with settings",
  });

  useCommand({
    handler: () => {
      nav.reset("home");
    },
    hotkey: "x",
    id: "home.reset",
    modes: ["cursor"],
    title: "Reset to home",
  });

  useCommand({
    handler: () => {
      setCounter((c) => c + 1);
    },
    hotkey: "plus",
    id: "home.increment",
    modes: ["cursor"],
    title: "Increment counter",
  });

  useCommand({
    handler: ({ exit }) => {
      exit();
    },
    hotkey: "q",
    id: "home.quit",
    modes: ["cursor"],
    title: "Quit",
  });

  return (
    <box flexDirection="column">
      <text content={`Screen:home Counter:${counter}`} />
      <text
        content={`Route:${current.routeId} | Stack:1 | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  );
};

const DetailScreen = function DetailScreen(): React.ReactNode {
  useRouterCommands();
  const { isFocused } = useScreenFocus();
  const params = useParams<{ id: string }>();
  const nav = useNavigate();
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();

  useCommand({
    handler: () => {
      nav.replace("settings");
    },
    hotkey: "r",
    id: "detail.replace-settings",
    modes: ["cursor"],
    title: "Replace with settings",
  });

  useCommand({
    handler: () => {
      nav.reset("home");
    },
    hotkey: "x",
    id: "detail.reset",
    modes: ["cursor"],
    title: "Reset to home",
  });

  useCommand({
    handler: () => {
      nav.push("settings");
    },
    hotkey: "2",
    id: "detail.push-settings",
    modes: ["cursor"],
    title: "Push settings",
  });

  useCommand({
    handler: ({ exit }) => {
      exit();
    },
    hotkey: "q",
    id: "detail.quit",
    modes: ["cursor"],
    title: "Quit",
  });

  return (
    <box flexDirection="column">
      <text content={`Screen:detail:${params.id ?? "none"}`} />
      <text
        content={`Route:${current.routeId} | Stack:detail | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  );
};

const SettingsScreen = function SettingsScreen(): React.ReactNode {
  useRouterCommands();
  const { isFocused } = useScreenFocus();
  const nav = useNavigate();
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();

  useCommand({
    handler: () => {
      nav.reset("home");
    },
    hotkey: "x",
    id: "settings.reset",
    modes: ["cursor"],
    title: "Reset to home",
  });

  useCommand({
    handler: ({ exit }) => {
      exit();
    },
    hotkey: "q",
    id: "settings.quit",
    modes: ["cursor"],
    title: "Quit",
  });

  return (
    <box flexDirection="column">
      <text content="Screen:settings" />
      <text
        content={`Route:${current.routeId} | Stack:settings | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  );
};

const SlowScreen = function SlowScreen(): React.ReactNode {
  useRouterCommands();
  const { isFocused } = useScreenFocus();
  const data = useRouteData<{ message: string }>();
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();

  return (
    <box flexDirection="column">
      <text content={`Screen:slow:${data?.message ?? "none"}`} />
      <text
        content={`Route:${current.routeId} | Stack:slow | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  );
};

const SlowPending = function SlowPending(): React.ReactNode {
  return (
    <box>
      <text content="Loading..." />
    </box>
  );
};

const ErrorRouteScreen = function ErrorRouteScreen(): React.ReactNode {
  return (
    <box>
      <text content="Screen:error-route" />
    </box>
  );
};

const ErrorComponent = function ErrorComponent({ error }: { error: Error }): React.ReactNode {
  return (
    <box>
      <text content={`Error:${error.message}`} />
    </box>
  );
};

const ParentLayout = function ParentLayout(): React.ReactNode {
  const { isFocused } = useScreenFocus();
  return (
    <box flexDirection="column">
      <text content={`Layout:parent Focus:${isFocused}`} />
      <Outlet />
    </box>
  );
};

const ChildScreen = function ChildScreen(): React.ReactNode {
  useRouterCommands();
  const { isFocused } = useScreenFocus();
  const current = useCurrentRoute();
  const canGoBack = useCanGoBack();

  return (
    <box flexDirection="column">
      <text content="Child:content" />
      <text
        content={`Route:${current.routeId} | Stack:child | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  );
};

// --- Route Definitions ---

const homeRoute = createRoute({ component: HomeScreen, id: "home" });
const detailRoute = createRoute({ component: DetailScreen, id: "detail" });
const settingsRoute = createRoute({ component: SettingsScreen, id: "settings" });

const slowRoute = createRoute({
  component: SlowScreen,
  id: "slow",
  loader: async () => {
    await Bun.sleep(loaderDelay);
    return { message: "loaded" };
  },
  pendingComponent: SlowPending,
});

const errorRoute = createRoute({
  component: ErrorRouteScreen,
  errorComponent: ErrorComponent,
  id: "error-route",
  loader: async () => {
    await Promise.reject(new Error("route-failed"));
  },
  pendingComponent: SlowPending,
});

const parentRoute = createRoute({ component: ParentLayout, id: "parent" });
const childRoute = createRoute({
  component: ChildScreen,
  id: "child",
  parent: parentRoute,
});

// --- Router ---

const router = createRouter({
  defaultRoute: "home",
  routes: [homeRoute, detailRoute, settingsRoute, slowRoute, errorRoute, parentRoute, childRoute],
});

// --- Launch ---

const App = function App(): React.ReactNode {
  return (
    <RouterProvider router={router}>
      <Outlet />
    </RouterProvider>
  );
};

await launchCli(<App />);

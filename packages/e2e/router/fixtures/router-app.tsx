#!/usr/bin/env bun
import { useState, useEffect } from "react"
import { launchCli } from "@tooee/shell"
import { useCommand } from "@tooee/commands"
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
} from "@tooee/router"

// Parse CLI args
const args = process.argv.slice(2)
const loaderDelayArg = args.find((a) => a.startsWith("--loader-delay="))
const loaderDelay = loaderDelayArg ? parseInt(loaderDelayArg.split("=")[1], 10) : 500

// --- Screen Components ---

function HomeScreen() {
  useRouterCommands()
  const { isFocused } = useScreenFocus()
  const nav = useNavigate()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()
  const { savedState, saveState } = useScreenState<number>()
  const [counter, setCounter] = useState(savedState ?? 0)

  // Persist counter to state cache on every change
  useEffect(() => {
    saveState(counter)
  }, [counter, saveState])

  useCommand({
    id: "home.push-detail",
    title: "Push detail",
    hotkey: "1",
    modes: ["cursor"],
    handler: () => nav.push("detail", { id: "42" }),
  })

  useCommand({
    id: "home.push-settings",
    title: "Push settings",
    hotkey: "2",
    modes: ["cursor"],
    handler: () => nav.push("settings"),
  })

  useCommand({
    id: "home.push-slow",
    title: "Push slow",
    hotkey: "3",
    modes: ["cursor"],
    handler: () => nav.push("slow"),
  })

  useCommand({
    id: "home.push-error",
    title: "Push error route",
    hotkey: "4",
    modes: ["cursor"],
    handler: () => nav.push("error-route"),
  })

  useCommand({
    id: "home.push-nested",
    title: "Push nested",
    hotkey: "5",
    modes: ["cursor"],
    handler: () => nav.push("child"),
  })

  useCommand({
    id: "home.replace-settings",
    title: "Replace with settings",
    hotkey: "r",
    modes: ["cursor"],
    handler: () => nav.replace("settings"),
  })

  useCommand({
    id: "home.reset",
    title: "Reset to home",
    hotkey: "x",
    modes: ["cursor"],
    handler: () => nav.reset("home"),
  })

  useCommand({
    id: "home.increment",
    title: "Increment counter",
    hotkey: "plus",
    modes: ["cursor"],
    handler: () => setCounter((c) => c + 1),
  })

  useCommand({
    id: "home.quit",
    title: "Quit",
    hotkey: "q",
    modes: ["cursor"],
    handler: ({ exit }) => exit(),
  })

  return (
    <box flexDirection="column">
      <text content={`Screen:home Counter:${counter}`} />
      <text
        content={`Route:${current.routeId} | Stack:${1} | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  )
}

function DetailScreen() {
  useRouterCommands()
  const { isFocused } = useScreenFocus()
  const params = useParams<{ id: string }>()
  const nav = useNavigate()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()

  useCommand({
    id: "detail.replace-settings",
    title: "Replace with settings",
    hotkey: "r",
    modes: ["cursor"],
    handler: () => nav.replace("settings"),
  })

  useCommand({
    id: "detail.reset",
    title: "Reset to home",
    hotkey: "x",
    modes: ["cursor"],
    handler: () => nav.reset("home"),
  })

  useCommand({
    id: "detail.push-settings",
    title: "Push settings",
    hotkey: "2",
    modes: ["cursor"],
    handler: () => nav.push("settings"),
  })

  useCommand({
    id: "detail.quit",
    title: "Quit",
    hotkey: "q",
    modes: ["cursor"],
    handler: ({ exit }) => exit(),
  })

  return (
    <box flexDirection="column">
      <text content={`Screen:detail:${params.id ?? "none"}`} />
      <text
        content={`Route:${current.routeId} | Stack:detail | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  )
}

function SettingsScreen() {
  useRouterCommands()
  const { isFocused } = useScreenFocus()
  const nav = useNavigate()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()

  useCommand({
    id: "settings.reset",
    title: "Reset to home",
    hotkey: "x",
    modes: ["cursor"],
    handler: () => nav.reset("home"),
  })

  useCommand({
    id: "settings.quit",
    title: "Quit",
    hotkey: "q",
    modes: ["cursor"],
    handler: ({ exit }) => exit(),
  })

  return (
    <box flexDirection="column">
      <text content="Screen:settings" />
      <text
        content={`Route:${current.routeId} | Stack:settings | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  )
}

function SlowScreen() {
  useRouterCommands()
  const { isFocused } = useScreenFocus()
  const data = useRouteData<{ message: string }>()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()

  return (
    <box flexDirection="column">
      <text content={`Screen:slow:${data?.message ?? "none"}`} />
      <text
        content={`Route:${current.routeId} | Stack:slow | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  )
}

function SlowPending() {
  return (
    <box>
      <text content="Loading..." />
    </box>
  )
}

function ErrorRouteScreen() {
  return (
    <box>
      <text content="Screen:error-route" />
    </box>
  )
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <box>
      <text content={`Error:${error.message}`} />
    </box>
  )
}

function ParentLayout() {
  const { isFocused } = useScreenFocus()
  return (
    <box flexDirection="column">
      <text content={`Layout:parent Focus:${isFocused}`} />
      <Outlet />
    </box>
  )
}

function ChildScreen() {
  useRouterCommands()
  const { isFocused } = useScreenFocus()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()

  return (
    <box flexDirection="column">
      <text content="Child:content" />
      <text
        content={`Route:${current.routeId} | Stack:child | Back:${canGoBack} | Focus:${isFocused}`}
      />
    </box>
  )
}

// --- Route Definitions ---

const homeRoute = createRoute({ id: "home", component: HomeScreen })
const detailRoute = createRoute({ id: "detail", component: DetailScreen })
const settingsRoute = createRoute({ id: "settings", component: SettingsScreen })

const slowRoute = createRoute({
  id: "slow",
  component: SlowScreen,
  loader: async () => {
    await new Promise((r) => setTimeout(r, loaderDelay))
    return { message: "loaded" }
  },
  pendingComponent: SlowPending,
})

const errorRoute = createRoute({
  id: "error-route",
  component: ErrorRouteScreen,
  loader: async () => {
    throw new Error("route-failed")
  },
  pendingComponent: SlowPending,
  errorComponent: ErrorComponent,
})

const parentRoute = createRoute({ id: "parent", component: ParentLayout })
const childRoute = createRoute({
  id: "child",
  parent: parentRoute,
  component: ChildScreen,
})

// --- Router ---

const router = createRouter({
  routes: [homeRoute, detailRoute, settingsRoute, slowRoute, errorRoute, parentRoute, childRoute],
  defaultRoute: "home",
})

// --- Launch ---

function App() {
  return (
    <RouterProvider router={router}>
      <Outlet />
    </RouterProvider>
  )
}

launchCli(<App />)

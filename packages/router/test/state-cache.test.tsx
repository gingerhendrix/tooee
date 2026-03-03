import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { act, useEffect } from "react"
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useScreenState,
} from "@tooee/router"

// Screen that displays saved state from useScreenState hook

function ScreenA() {
  const { savedState } = useScreenState<{ value: string }>()
  return (
    <box>
      <text content={`screenA:saved:${savedState?.value ?? "none"}`} />
    </box>
  )
}

function ScreenB() {
  return (
    <box>
      <text content="screenB" />
    </box>
  )
}

// Screen that saves state via the hook on mount

function SavingScreen() {
  const { savedState, saveState } = useScreenState<{ counter: number }>()
  const count = savedState?.counter ?? 0
  useEffect(() => {
    saveState({ counter: count + 1 })
  }, [])
  return (
    <box>
      <text content={`saving:count:${count}`} />
    </box>
  )
}

// Route definitions

const routeA = createRoute({ id: "screenA", component: ScreenA })
const routeB = createRoute({ id: "screenB", component: ScreenB })
const savingRoute = createRoute({ id: "saving", component: SavingScreen })

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("useScreenState", () => {
  test("saved state is available after pop", async () => {
    const router = createRouter({
      routes: [routeA, routeB],
      defaultRoute: "screenA",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Initially no saved state
    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenA:saved:none")

    // Save state via router's cache (simulating component saving before unmount)
    router.stateCache.save("0:screenA", { value: "preserved" })

    // Navigate away
    await act(async () => {
      router.push("screenB")
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenB")

    // Pop back
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    // Saved state should be restored
    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenA:saved:preserved")
  })

  test("reset clears all saved state", async () => {
    const router = createRouter({
      routes: [routeA, routeB],
      defaultRoute: "screenA",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Save state
    router.stateCache.save("0:screenA", { value: "will-be-cleared" })

    // Push then reset
    await act(async () => {
      router.push("screenB")
    })
    await act(async () => {
      router.reset("screenA")
    })
    await testSetup.renderOnce()

    // After reset, saved state should be cleared
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenA:saved:none")
  })

  test("different stack positions have independent cache entries", async () => {
    const router = createRouter({
      routes: [routeA, routeB],
      defaultRoute: "screenA",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Save state for screenA at position 0
    router.stateCache.save("0:screenA", { value: "pos0" })

    // Push screenB, then push screenA again (now at position 2)
    await act(async () => {
      router.push("screenB")
    })
    await act(async () => {
      router.push("screenA")
    })
    await testSetup.renderOnce()

    // Screen A at position 2 should NOT have the state from position 0
    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenA:saved:none")

    // Save different state for screenA at position 2
    router.stateCache.save("2:screenA", { value: "pos2" })

    // Pop back to screenB
    await act(async () => {
      router.pop()
    })
    // Pop back to screenA at position 0
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    // Screen A at position 0 should have its own state
    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screenA:saved:pos0")
  })

  test("saveState from hook stores state in cache", async () => {
    const router = createRouter({
      routes: [savingRoute, routeB],
      defaultRoute: "saving",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // SavingScreen should have saved state via the hook's saveState
    const cached = router.stateCache.restore<{ counter: number }>("0:saving")
    expect(cached).toEqual({ counter: 1 })
  })

  test("pop clears cache for the popped entry", async () => {
    const router = createRouter({
      routes: [routeA, routeB],
      defaultRoute: "screenA",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("screenB")
    })
    await testSetup.renderOnce()

    // Save state for screenB at position 1
    router.stateCache.save("1:screenB", { data: "temp" })
    expect(router.stateCache.restore("1:screenB")).toEqual({ data: "temp" })

    // Pop screenB — its cache should be cleared
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    expect(router.stateCache.restore("1:screenB")).toBeUndefined()
  })
})

import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchShellFixture } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

function expectSomeFrame(frames: string[], pattern: RegExp | string): string {
  const matchingFrame = frames.find((frame) =>
    typeof pattern === "string" ? frame.includes(pattern) : pattern.test(frame),
  )
  expect(matchingFrame, frames.join("\n--- frame ---\n")).toBeDefined()
  return matchingFrame!
}

describe("which-key overlay", () => {
  test("leader opens a real terminal overlay with visible groups and actions", async () => {
    session = await launchShellFixture("which-key-app.tsx")

    const frames = await session.captureFrames("space", { frameCount: 12, intervalMs: 50 })
    const overlayFrame = expectSomeFrame(frames, "which-key: space")

    expect(overlayFrame).toContain("s → Stream")
    expect(overlayFrame).toContain("a → Artifact")
    expect(overlayFrame).toContain("r → Refresh")
    expect(overlayFrame).not.toContain("Hidden maintenance action")
  }, 20000)

  test("group key drills the overlay down to child actions", async () => {
    session = await launchShellFixture("which-key-app.tsx")

    const frames = await session.captureFrames(["space", "s"], { frameCount: 12, intervalMs: 50 })
    const overlayFrame = expectSomeFrame(frames, "which-key: space s")

    expect(overlayFrame).toContain("t → Open today stream")
    expect(overlayFrame).toContain("d → Dispatch task")
    expect(overlayFrame).not.toContain("a → Artifact")
  }, 20000)

  test("completed leader sequence dispatches the command and hides which-key", async () => {
    session = await launchShellFixture("which-key-app.tsx")

    await session.press(["space", "s", "d"])
    await session.waitForText("last:dispatched task", { timeout: 5000 })
    const text = await session.text()

    expect(text).toContain("last:dispatched task")
    expect(text).not.toContain("which-key:")
  }, 20000)

  test("non-leader sequences still dispatch without showing which-key", async () => {
    session = await launchShellFixture("which-key-app.tsx")

    const frames = await session.captureFrames(["g", "g"], { frameCount: 6, intervalMs: 50 })
    expect(frames.join("\n--- frame ---\n")).not.toContain("which-key:")

    await session.waitForText("last:local go", { timeout: 5000 })
  }, 20000)
})

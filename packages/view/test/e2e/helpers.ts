import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"

const REPO_ROOT = resolve(import.meta.dir, "../../../..")
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts")

export async function launchView(fixture: string): Promise<Session> {
  const fixturePath = resolve(import.meta.dir, "../fixtures", fixture)
  const session = await launchTerminal({
    command: "bun",
    args: [CLI, "view", fixturePath],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
  })
  // Wait for the app to be ready — status bar shows "Format:"
  await session.waitForText("Format:", { timeout: 15000 })
  return session
}

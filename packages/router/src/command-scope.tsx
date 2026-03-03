import { useCommand } from "@tooee/commands"
import { useRouter } from "./hooks.js"

export function useRouterCommands() {
  const router = useRouter()

  useCommand({
    id: "router.back",
    title: "Go back",
    hotkey: "backspace",
    modes: ["cursor"],
    when: () => router.canGoBack(),
    handler: () => router.pop(),
  })
}

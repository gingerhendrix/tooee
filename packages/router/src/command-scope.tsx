import { useCommand } from "@tooee/commands";
import { useRouter } from "./hooks.js";

export const useRouterCommands = function useRouterCommands() {
  const router = useRouter();

  useCommand({
    handler: () => router.pop(),
    hotkey: "backspace",
    id: "router.back",
    modes: ["cursor"],
    title: "Go back",
    when: () => router.canGoBack(),
  });
};

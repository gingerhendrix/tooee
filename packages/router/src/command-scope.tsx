import { useCommand } from "@tooee/commands";
import { useRouter } from "./hooks.js";

export const useRouterCommands = function useRouterCommands(): void {
  const router = useRouter();

  useCommand({
    handler: () => {
      void router.pop();
    },
    hotkey: "backspace",
    id: "router.back",
    modes: ["cursor"],
    title: "Go back",
    when: () => router.canGoBack(),
  });
};

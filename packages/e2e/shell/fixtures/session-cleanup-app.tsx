import { useEffect } from "react";
import { useQuitCommand, launchCli } from "@tooee/shell";

let effectCleanupRan = false;

const SessionCleanupApp = function SessionCleanupApp(): React.ReactNode {
  useQuitCommand();
  useEffect(() => {
    const interval = setInterval(() => void 0, 1000);
    return () => {
      clearInterval(interval);
      effectCleanupRan = true;
    };
  }, []);
  return <text>session cleanup ready</text>;
};

const beforeEnd = process.stdin.listenerCount("end");
const beforeClose = process.stdin.listenerCount("close");
const handle = await launchCli(<SessionCleanupApp />);

const { promise: destroyed, resolve: resolveDestroyed } = Promise.withResolvers<null>();
handle.renderer.once("destroy", () => {
  resolveDestroyed(null);
});
await destroyed;
await Bun.sleep(20);

const endListeners = process.stdin.listenerCount("end") - beforeEnd;
const closeListeners = process.stdin.listenerCount("close") - beforeClose;
process.stdout.write(
  `session cleanup complete raw=${String(process.stdin.isRaw)} end=${endListeners} close=${closeListeners} effect=${String(effectCleanupRan)}\n`,
);

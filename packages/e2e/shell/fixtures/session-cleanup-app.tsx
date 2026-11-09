import { useQuitCommand, launchCli } from "@tooee/shell";
import { useEffect } from "react";
import type { ReactNode } from "react";

let effectCleanupRan = false;

const SessionCleanupApp = function SessionCleanupApp(): ReactNode {
  useQuitCommand();
  useEffect(() => {
    const interval = setInterval(() => {
      // Keeps a live timer that the effect cleanup must clear.
    }, 1000);

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

await handle.closed;

const endListeners = process.stdin.listenerCount("end") - beforeEnd;

const closeListeners = process.stdin.listenerCount("close") - beforeClose;

process.stdout.write(
  `session cleanup complete raw=${String(process.stdin.isRaw)} end=${endListeners} close=${closeListeners} effect=${String(effectCleanupRan)}\n`
);

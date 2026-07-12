import { useQuitCommand, launchCli } from "@tooee/shell";

const SessionCleanupApp = function SessionCleanupApp(): React.ReactNode {
  useQuitCommand();
  return <text>session cleanup ready</text>;
};

const beforeEnd = process.stdin.listenerCount("end");
const beforeClose = process.stdin.listenerCount("close");
const handle = await launchCli(<SessionCleanupApp />);

await new Promise<void>((resolve) => handle.renderer.once("destroy", resolve));

const endListeners = process.stdin.listenerCount("end") - beforeEnd;
const closeListeners = process.stdin.listenerCount("close") - beforeClose;
process.stdout.write(
  `session cleanup complete raw=${String(process.stdin.isRaw)} end=${endListeners} close=${closeListeners}\n`,
);

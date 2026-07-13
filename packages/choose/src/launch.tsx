import { runCliSession } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import { Choose } from "./choose.js";
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js";

export interface ChooseLaunchOptions {
  contentProvider: ChooseContentProvider;
  options?: ChooseOptions;
  actions?: ActionDefinition[];
}

export const launch = async function launch(
  opts: ChooseLaunchOptions,
): Promise<ChooseResult | null> {
  const result = await runCliSession<ChooseResult>(
    ({ resolve, cancel }): React.ReactNode => {
      const callbacks: {
        onCancel: () => void;
        onConfirm: (result: ChooseResult) => void;
      } = { onCancel: cancel, onConfirm: resolve };
      return (
        <Choose
          contentProvider={opts.contentProvider}
          options={opts.options}
          actions={opts.actions}
          {...callbacks}
        />
      );
    },
    {
      exitOnCtrlC: false,
      provider: { initialMode: "insert" },
      stdinPolicy: "tty-if-piped",
    },
  );
  return result;
};

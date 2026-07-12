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
  return await runCliSession<ChooseResult>(
    ({ resolve, cancel }): React.ReactNode => (
      <Choose
        contentProvider={opts.contentProvider}
        options={opts.options}
        actions={opts.actions}
        onConfirm={resolve}
        onCancel={cancel}
      />
    ),
    {
      exitOnCtrlC: false,
      provider: { initialMode: "insert" },
      stdinPolicy: "tty-if-piped",
    },
  );
};

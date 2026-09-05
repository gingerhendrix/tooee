import { runCliSession } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import { Choose } from "./choose.js";
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js";
import type { ReactNode } from "react";

export interface ChooseLaunchOptions {
  contentProvider: ChooseContentProvider;
  options?: ChooseOptions;
  actions?: ActionDefinition[];
}

export const launch = async function launch(
  opts: ChooseLaunchOptions,
): Promise<ChooseResult | null> {
  const result = await runCliSession<ChooseResult>(
    ({ resolve, cancel }): ReactNode => (
      <Choose
        contentProvider={opts.contentProvider}
        title={opts.options?.title}
        prompt={opts.options?.prompt}
        placeholder={opts.options?.placeholder}
        multi={opts.options?.multi}
        emptyMessage={opts.options?.emptyMessage}
        actions={opts.actions}
        onConfirm={resolve}
        onCancel={cancel}
      />
    ),
    {
      provider: { initialMode: "insert" },
      stdinPolicy: "tty-if-piped",
    },
  );
  return result;
};

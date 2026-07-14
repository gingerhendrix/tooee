import { launchCli } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import { Ask } from "./ask.js";
import type { AskOptions } from "./types.js";

export interface AskLaunchOptions extends AskOptions {
  actions?: ActionDefinition[];
  /** Called with the submitted text. Default: write to stdout and exit. */
  onSubmit?: (value: string) => void;
}

export const launch = async function launch(options: AskLaunchOptions): Promise<void> {
  const handleSubmit = options.onSubmit;
  await launchCli(
    <Ask
      title={options.title}
      prompt={options.prompt}
      placeholder={options.placeholder}
      defaultValue={options.defaultValue}
      multiline={options.multiline}
      actions={options.actions}
      onSubmit={handleSubmit}
    />,
    { exitOnCtrlC: false, provider: { initialMode: "insert" } },
  );
};

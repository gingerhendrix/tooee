import { runCliSession } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import { Ask } from "./ask.js";
import type { AskOptions } from "./types.js";

export interface AskLaunchOptions extends AskOptions {
  actions?: ActionDefinition[];
  /** Called with the submitted text before the launch promise resolves. */
  onSubmit?: (value: string) => void;
}

export const launch = async function launch(options: AskLaunchOptions): Promise<string | null> {
  return await runCliSession<string>(
    ({ resolve }): React.ReactNode => (
      <Ask
        title={options.title}
        prompt={options.prompt}
        placeholder={options.placeholder}
        defaultValue={options.defaultValue}
        multiline={options.multiline}
        actions={options.actions}
        onSubmit={(value) => {
          options.onSubmit?.(value);
          resolve(value);
        }}
      />
    ),
    { provider: { initialMode: "insert" } },
  );
};

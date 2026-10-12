import type { ContextGetter } from "./command-store.js";
import type { Mode } from "./mode.js";
import type {
  CommandCommands,
  CommandContext,
  CommandContextBase,
  CommandRegistry,
} from "./types.js";

export interface BuildCommandContextInput {
  commands: CommandCommands;
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** Registered context sources, in registration order (later sources win). */
  contributions?: Iterable<ContextGetter>;
  /**
   * Default `exit` before context sources apply. The command provider passes
   * the renderer's `destroy`. A context source can still replace it.
   */
  exit?: () => void;
}

/** The `commands` slice of a context, backed by a live surface registry. */
export const commandsFromRegistry = function commandsFromRegistry(
  registry: CommandRegistry
): CommandCommands {
  return {
    invoke: (id: string) => {
      registry.invoke(id);
    },
    list: () => [...registry.commands.values()],
  };
};

/**
 * The single place a `CommandContext` is assembled — shared by the root
 * dispatcher, every command surface, and the pre-dispatch placeholder.
 *
 * The core fields are built as a concrete, typed `CommandContextBase`: no
 * `Record<string, any>` staging object. Domain packages add optional fields to
 * `CommandContext` by declaration merging, then supply values at runtime
 * through context sources registered by their providers.
 */
export const buildCommandContext = function buildCommandContext(
  input: BuildCommandContextInput
): CommandContext {
  const base: CommandContextBase = {
    commands: input.commands,
    exit:
      input.exit ??
      (() => {
        // No renderer: the placeholder context has nothing to close.
      }),
    mode: input.mode,
    setMode: input.setMode,
  };

  for (const getter of input.contributions ?? []) {
    Object.assign(base, getter());
  }

  return base;
};

import type {
  CommandCommands,
  CommandContext,
  CommandContextBase,
  CommandRegistry,
} from "./types.js";
import type { ContextGetter } from "./command-store.js";
import type { Mode } from "./mode.js";

export interface BuildCommandContextInput {
  commands: CommandCommands;
  mode: Mode;
  setMode: (mode: Mode) => void;
  /** Registered context sources, in registration order (later sources win). */
  contributions?: Iterable<ContextGetter>;
}

/** The `commands` slice of a context, backed by a live surface registry. */
export const commandsFromRegistry = function commandsFromRegistry(
  registry: CommandRegistry,
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
 * `Record<string, any>` staging object. Domain packages (overlay, toast, ask,
 * choose, view) add their own required fields to `CommandContext` by
 * declaration merging, and supply the values at runtime through a context
 * source registered by that package's provider.
 *
 * Registration is the readiness contract: a domain's commands are registered by
 * that domain's components, and those components mount the domain's context
 * source. A handler therefore always observes the fields its own package
 * declared. TypeScript cannot express that relationship (the merged interface
 * demands every domain's fields everywhere, including in packages that cannot
 * see the providers), so it is enforced by construction and narrowed exactly
 * once here, rather than being asserted or `any`-typed at every consumer.
 */
export const buildCommandContext = function buildCommandContext(
  input: BuildCommandContextInput,
): CommandContext {
  const base: CommandContextBase = {
    commands: input.commands,
    exit: () => void 0,
    mode: input.mode,
    setMode: input.setMode,
  };
  for (const getter of input.contributions ?? []) {
    Object.assign(base, getter());
  }
  // The assertion is required by the whole-program build (where every domain's
  // augmentation is visible) and is redundant in the package-local program,
  // hence both suppressions.
  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion -- single documented augmentation boundary (see above)
  return base as CommandContext;
};

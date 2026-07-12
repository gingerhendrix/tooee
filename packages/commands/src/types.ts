import type { Mode } from "./mode.js";

export interface CommandContextBase {
  mode: Mode;
  setMode: (mode: Mode) => void;
  commands: { invoke: (id: string) => void; list: () => Command[] };
  exit: () => void;
}

/**
 * The context handed to command handlers. Domain packages contribute typed
 * fields via module augmentation (the mechanism the shell already uses for
 * `overlay` and `toast`):
 *
 * ```ts
 * declare module "@tooee/commands" {
 *   interface CommandContext {
 *     myDomain: MyDomainContext
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CommandContext extends CommandContextBase {}

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;
export type CommandWhen = (ctx: CommandContext) => boolean;

export interface Command {
  id: string;
  title: string;
  handler: CommandHandler;
  defaultHotkey?: string;
  modes?: Mode[];
  when?: CommandWhen;
  category?: string;
  group?: string;
  icon?: string;
  hidden?: boolean;
}

export interface ParsedHotkey {
  steps: ParsedStep[];
}

export interface ParsedStep {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  option: boolean;
  /** Super/Windows/Cmd-as-super modifier. Optional for back-compat. */
  super?: boolean;
}

export interface CommandRegistry {
  commands: Map<string, Command>;
  register: (command: Command) => () => void;
  invoke: (id: string) => void;
}

/**
 * Interaction role of a command surface.
 * - `modal`: owns keyboard input while topmost and suspends every lower surface
 *   (including the root app) — even for keys it does not handle.
 * - `passive`: never becomes the keyboard owner; purely visual.
 */
export type CommandSurfaceRole = "modal" | "passive";

/**
 * A command surface is an interaction surface that can own keyboard input.
 * The root app is the implicit base surface; modal overlays push surfaces on
 * top of it. Each surface carries its own command registry and local mode so
 * the same command definitions can be rooted in a standalone app or pushed by
 * an overlay without leaking mode/command state into the parent.
 */
export interface CommandSurfaceEntry {
  id: string;
  role: CommandSurfaceRole;
  /** Nesting depth (root children are depth 0; the first overlay surface is 1). */
  depth: number;
  /** Monotonic registration order, used to break depth ties. */
  order: number;
  registry: CommandRegistry;
  /** Reads this surface's current local mode. */
  getMode: () => Mode;
  /** Builds the command context handed to this surface's command handlers. */
  buildCtx: () => CommandContext;
}

export interface ActiveCommandSurface {
  id: string;
  role: CommandSurfaceRole;
  /**
   * Commands registered on this surface (reactive). Enables surface-aware
   * which-key/help/palette consumers.
   */
  commands: readonly Command[];
}

export interface CommandGroup {
  id: string;
  title: string;
  prefix: string;
  description?: string;
  icon?: string;
  order?: number;
}

export interface RegisteredCommandGroup extends CommandGroup {
  prefixKey: string;
}

export interface CommandSequenceCandidate {
  command: Command;
  hotkey: string;
  steps: ParsedStep[];
  remainingSteps: ParsedStep[];
  nextStep: ParsedStep;
  group?: CommandGroup;
}

export interface CommandSequenceState {
  prefix: ParsedStep[];
  candidates: CommandSequenceCandidate[];
}

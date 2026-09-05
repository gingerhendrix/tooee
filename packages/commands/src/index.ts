export type {
  ActiveCommandSurface,
  Command,
  CommandContext,
  CommandCommands,
  CommandContextBase,
  CommandGroup,
  CommandHandler,
  CommandSequenceCandidate,
  CommandSequenceState,
  CommandSurfaceEntry,
  CommandSurfaceRole,
  CommandWhen,
  ParsedHotkey,
  ParsedStep,
  RegisteredCommandGroup,
} from "./types.js";
export type { Mode } from "./mode.js";
export { useMode, useSetMode } from "./mode.js";
export { parseHotkey } from "./parse.js";
export { matchStep } from "./match.js";
export { ScreenScopeProvider, useScreenScope } from "./screen-focus.js";
export type { ScreenScopeState } from "./screen-focus.js";
export {
  CommandProvider,
  CommandSurfaceProvider,
  useActiveCommandSurface,
  useEffectiveCommands,
  useBuildCommandContext,
  // oxlint-disable-next-line typescript/no-deprecated -- retained as the documented compatibility alias for useSurfaceInvoke
  useCommandContext,
  useCommandGroup,
  useCommandRegistry,
  useCommandSequenceState,
  useCommandStore,
  useCommandSurfaceId,
  useProvideCommandContext,
  useProvideCommandContextKey,
  useSurfaceCommands,
  useSurfaceInvoke,
} from "./context.js";
export {
  ROOT_SURFACE_ID,
  formatStepKey,
  selectActiveModalSurface,
  selectActivePanelSurface,
  selectKeyboardOwnerSurface,
  selectSequence,
  selectSurfaceCommands,
} from "./command-store.js";
export type { CommandStoreContext, SurfaceRecord } from "./command-store.js";
export type { CommandStore, CommandStoreConfig } from "./command-store-wrapper.js";
export type {
  CommandProviderProps,
  CommandSurfaceProviderProps,
  EffectiveCommands,
} from "./context.js";
export { useCommand } from "./use-command.js";
export type { UseCommandOptions } from "./use-command.js";
export { useActions } from "./use-actions.js";
export type { ActionDefinition } from "./use-actions.js";
export { useLatest } from "./hooks/use-latest.js";
export { useLazyRef } from "./hooks/use-lazy-ref.js";

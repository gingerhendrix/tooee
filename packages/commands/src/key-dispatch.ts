import type { KeyEvent } from "@opentui/core";
import type { Mode } from "./mode.js";
import { matchStep } from "./match.js";
import { parseHotkey } from "./parse.js";
import {
  ROOT_SURFACE_ID,
  selectActiveModalSurface,
  selectActivePanelSurface,
  stepsKey,
} from "./command-store.js";
import type { CommandStoreContext, CommandStoreInstance, SurfaceRecord } from "./command-store.js";
import {
  DEFAULT_SEQUENCE_TIMEOUT_MS,
  findPendingMatch,
  matchesBuffer,
  pruneBuffer,
} from "./sequence.js";
import type { Command, CommandContext, CommandSequenceState, ParsedHotkey } from "./types.js";

const DEFAULT_MODES: Mode[] = ["cursor"];

export interface KeyDispatchResult {
  handled: boolean;
  invoke?: () => void;
}

export interface KeyDispatchConfig {
  leader?: string;
  keymap?: Record<string, string>;
  sequenceTimeoutMs?: number;
}

interface HotkeyCandidates {
  singleStep: { command: Command; parsed: ParsedHotkey }[];
  multiStep: { command: Command; hotkey: string; parsed: ParsedHotkey }[];
}

type SurfaceDispatch =
  | { outcome: "invoke"; invoke: () => void }
  | { outcome: "pending" }
  | { outcome: "miss" };

interface DispatchState {
  buffer: readonly KeyEvent[];
  sequenceOwnerId: string | null;
  timer: ReturnType<typeof setTimeout> | null;
}

interface DispatchEnvironment {
  getConfig: () => KeyDispatchConfig;
  rootRecord: SurfaceRecord;
  store: CommandStoreInstance;
}

const collectCandidates = function collectCandidates(
  commands: ReadonlyMap<string, Command> | undefined,
  currentMode: Mode,
  cmdCtx: CommandContext,
  config: KeyDispatchConfig,
  getParsedHotkey: (hotkey: string) => ParsedHotkey,
): HotkeyCandidates {
  const singleStep: HotkeyCandidates["singleStep"] = [];
  const multiStep: HotkeyCandidates["multiStep"] = [];

  for (const command of commands?.values() ?? []) {
    const commandModes = command.modes ?? DEFAULT_MODES;
    if (!commandModes.includes(currentMode) || (command.when && !command.when(cmdCtx))) {
      continue;
    }
    const hotkey = config.keymap?.[command.id] ?? command.defaultHotkey;
    if (hotkey === undefined || hotkey === "") {
      continue;
    }
    const parsed = getParsedHotkey(hotkey);
    if (parsed.steps.length === 0) {
      continue;
    }
    if (parsed.steps.length === 1) {
      singleStep.push({ command, parsed });
    } else {
      multiStep.push({ command, hotkey, parsed });
    }
  }
  return { multiStep, singleStep };
};

const runSurface = function runSurface(
  record: SurfaceRecord,
  event: KeyEvent,
  ctx: CommandStoreContext,
  state: DispatchState,
  environment: DispatchEnvironment,
  getParsedHotkey: (hotkey: string) => ParsedHotkey,
  armTimer: () => void,
  clearBufferAndTimer: () => void,
): SurfaceDispatch {
  const cmdCtx = record.buildCtx();
  const candidates = collectCandidates(
    ctx.commandsBySurface.get(record.id),
    record.getMode(),
    cmdCtx,
    environment.getConfig(),
    getParsedHotkey,
  );

  if (candidates.multiStep.length > 0) {
    const hotkeys = candidates.multiStep.map((candidate) => candidate.parsed);
    state.buffer = [...state.buffer, event];
    armTimer();

    const matchedIndex = hotkeys.findIndex((hotkey) => matchesBuffer(state.buffer, hotkey));
    if (matchedIndex !== -1) {
      clearBufferAndTimer();
      environment.store.trigger.sequenceReset();
      const matched = candidates.multiStep[matchedIndex].command;
      return {
        invoke: (): void => {
          void matched.handler(cmdCtx);
        },
        outcome: "invoke",
      };
    }

    state.buffer = pruneBuffer(state.buffer, hotkeys);
    const pending = findPendingMatch(state.buffer, hotkeys);
    if (pending) {
      const firstCandidate = candidates.multiStep[pending.indexes[0]];
      const sequence: CommandSequenceState = {
        candidates: pending.indexes
          .map((index) => candidates.multiStep[index])
          .filter(({ command }) => command.hidden !== true)
          .map(({ command, hotkey, parsed }) => ({
            command,
            group: ctx.groups.get(stepsKey(parsed.steps.slice(0, pending.prefixLength + 1))),
            hotkey,
            nextStep: parsed.steps[pending.prefixLength],
            remainingSteps: parsed.steps.slice(pending.prefixLength),
            steps: parsed.steps,
          })),
        prefix: firstCandidate.parsed.steps.slice(0, pending.prefixLength),
      };
      environment.store.trigger.sequencePending({ state: sequence });
      return { outcome: "pending" };
    }

    clearBufferAndTimer();
    environment.store.trigger.sequenceReset();
  }

  for (const { command, parsed } of candidates.singleStep) {
    if (matchStep(event, parsed.steps[0])) {
      environment.store.trigger.sequenceReset();
      return {
        invoke: (): void => {
          void command.handler(cmdCtx);
        },
        outcome: "invoke",
      };
    }
  }

  clearBufferAndTimer();
  environment.store.trigger.sequenceReset();
  return { outcome: "miss" };
};

const finishDispatch = function finishDispatch(
  dispatch: SurfaceDispatch,
  ownerId: string,
  state: DispatchState,
): KeyDispatchResult {
  if (dispatch.outcome === "pending") {
    state.sequenceOwnerId = ownerId;
    return { handled: true };
  }
  state.sequenceOwnerId = null;
  return dispatch.outcome === "invoke"
    ? { handled: true, invoke: dispatch.invoke }
    : { handled: false };
};

export interface KeyDispatcher {
  dispose: () => void;
  key: (event: KeyEvent) => KeyDispatchResult;
  reset: () => void;
}

export const createKeyDispatcher = function createKeyDispatcher(
  environment: DispatchEnvironment,
): KeyDispatcher {
  const state: DispatchState = { buffer: [], sequenceOwnerId: null, timer: null };
  const parseCache = new Map<string, ParsedHotkey>();

  const clearTimer = (): void => {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  };
  const clearBufferAndTimer = (): void => {
    state.buffer = [];
    state.sequenceOwnerId = null;
    clearTimer();
  };
  const reset = (): void => {
    clearBufferAndTimer();
    environment.store.trigger.sequenceReset();
  };
  const armTimer = (): void => {
    clearTimer();
    state.timer = setTimeout(
      reset,
      environment.getConfig().sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS,
    );
  };
  const getParsedHotkey = (hotkey: string): ParsedHotkey => {
    const { leader } = environment.getConfig();
    const cacheKey = `${hotkey}:${leader ?? ""}`;
    let parsed = parseCache.get(cacheKey);
    if (!parsed) {
      parsed = parseHotkey(hotkey, leader);
      parseCache.set(cacheKey, parsed);
    }
    return parsed;
  };
  const dispatchTo = (
    record: SurfaceRecord,
    event: KeyEvent,
    ctx: CommandStoreContext,
  ): SurfaceDispatch =>
    runSurface(
      record,
      event,
      ctx,
      state,
      environment,
      getParsedHotkey,
      armTimer,
      clearBufferAndTimer,
    );
  const finish = (dispatch: SurfaceDispatch, ownerId: string): KeyDispatchResult =>
    finishDispatch(dispatch, ownerId, state);

  const key = (event: KeyEvent): KeyDispatchResult => {
    const ctx = environment.store.getSnapshot().context;
    if (state.buffer.length > 0 && state.sequenceOwnerId !== null) {
      const owner =
        state.sequenceOwnerId === ROOT_SURFACE_ID
          ? environment.rootRecord
          : (ctx.surfaces.find((record) => record.id === state.sequenceOwnerId) ?? null);
      if (owner) {
        return finish(dispatchTo(owner, event, ctx), state.sequenceOwnerId);
      }
      clearBufferAndTimer();
    }

    const modal = selectActiveModalSurface(ctx);
    if (modal) {
      return finish(dispatchTo(modal, event, ctx), modal.id);
    }
    const panel = selectActivePanelSurface(ctx);
    if (panel) {
      const dispatch = dispatchTo(panel, event, ctx);
      if (dispatch.outcome !== "miss" || panel.getMode() === "insert") {
        return finish(dispatch, panel.id);
      }
    }
    return finish(dispatchTo(environment.rootRecord, event, ctx), ROOT_SURFACE_ID);
  };

  return { dispose: clearBufferAndTimer, key, reset };
};

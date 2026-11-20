import type { KeyEvent } from "@opentui/core";

import {
  formatStepKey,
  ROOT_SURFACE_ID,
  selectActiveModalSurface,
  selectActivePanelSurface,
  stepsKey,
} from "./command-store.js";
import type { CommandStoreContext, CommandStoreInstance, SurfaceRecord } from "./command-store.js";
import { isQuestionMark, matchStep } from "./match.js";
import type { Mode } from "./mode.js";
import { parseHotkey } from "./parse.js";
import {
  DEFAULT_SEQUENCE_TIMEOUT_MS,
  findPendingMatch,
  matchesBuffer,
  pruneBuffer,
} from "./sequence.js";
import type {
  Command,
  CommandContext,
  CommandSequenceCandidate,
  CommandSequenceState,
  ParsedHotkey,
} from "./types.js";

const DEFAULT_MODES: Mode[] = ["cursor"];

const [ESCAPE] = parseHotkey("escape").steps;

export interface KeyDispatchResult {
  handled: boolean;
  invoke?: () => void;
}

export interface KeyDispatchConfig {
  leader?: string;
  keymap?: Record<string, string>;
  sequenceTimeoutMs?: number;
}

interface HotkeyCandidate {
  command: Command;
  hotkey: string;
  parsed: ParsedHotkey;
}

interface HotkeyCandidates {
  singleStep: HotkeyCandidate[];
  multiStep: HotkeyCandidate[];
}

type SurfaceDispatch =
  | { outcome: "invoke"; invoke: () => void }
  | { outcome: "pending"; sequence: CommandSequenceState }
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
  getParsedHotkey: (hotkey: string) => ParsedHotkey
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
      singleStep.push({ command, hotkey, parsed });
    } else {
      multiStep.push({ command, hotkey, parsed });
    }
  }

  return { multiStep, singleStep };
};

const toHint = function toHint(
  { command, hotkey, parsed }: HotkeyCandidate,
  ctx: CommandStoreContext,
  prefixLength: number
): CommandSequenceCandidate {
  return {
    command,
    group:
      prefixLength === 0 && parsed.steps.length === 1
        ? undefined
        : ctx.groups.get(stepsKey(parsed.steps.slice(0, prefixLength + 1))),
    hotkey,
    nextStep: parsed.steps[prefixLength],
    remainingSteps: parsed.steps.slice(prefixLength),
    steps: parsed.steps,
  };
};

const collectRootHints = function collectRootHints(
  surfaces: readonly HotkeyCandidates[],
  ctx: CommandStoreContext
): CommandSequenceCandidate[] {
  const hints: CommandSequenceCandidate[] = [];
  const claimed = new Set<string>();

  for (const { multiStep, singleStep } of surfaces) {
    const prefixes = new Set<string>();
    const bindings = new Set<string>();

    // Dispatch tries sequences first. Hidden commands still claim their keys,
    // and a prefix claimed by a higher surface keeps the whole chord there.
    for (const candidate of [...multiStep, ...singleStep]) {
      const first = formatStepKey(candidate.parsed.steps[0]);
      const binding = stepsKey(candidate.parsed.steps);

      if (
        claimed.has(first) ||
        bindings.has(binding) ||
        (candidate.parsed.steps.length === 1 && prefixes.has(first))
      ) {
        continue;
      }

      prefixes.add(first);
      bindings.add(binding);

      if (candidate.command.hidden !== true) {
        hints.push(toHint(candidate, ctx, 0));
      }
    }

    for (const first of prefixes) {
      claimed.add(first);
    }
  }

  return hints;
};

const runSurface = function runSurface(
  cmdCtx: CommandContext,
  candidates: HotkeyCandidates,
  event: KeyEvent,
  ctx: CommandStoreContext,
  state: DispatchState,
  armTimer: () => void,
  clearBufferAndTimer: () => void
): SurfaceDispatch {
  if (candidates.multiStep.length > 0) {
    const hotkeys = candidates.multiStep.map((candidate) => candidate.parsed);
    state.buffer = [...state.buffer, event];
    armTimer();

    const matchedIndex = hotkeys.findIndex((hotkey) => matchesBuffer(state.buffer, hotkey));

    if (matchedIndex !== -1) {
      clearBufferAndTimer();
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
          .map((candidate) => toHint(candidate, ctx, pending.prefixLength)),
        prefix: firstCandidate.parsed.steps.slice(0, pending.prefixLength),
      };

      return { outcome: "pending", sequence };
    }
  }

  clearBufferAndTimer();

  for (const { command, parsed } of candidates.singleStep) {
    if (matchStep(event, parsed.steps[0])) {
      return {
        invoke: (): void => {
          void command.handler(cmdCtx);
        },
        outcome: "invoke",
      };
    }
  }

  return { outcome: "miss" };
};

export interface KeyDispatcher {
  dispose: () => void;
  enableRootKeyHints: () => () => void;
  key: (event: KeyEvent, textInputFocused?: boolean) => KeyDispatchResult;
  reset: () => void;
}

export const createKeyDispatcher = function createKeyDispatcher(
  environment: DispatchEnvironment
): KeyDispatcher {
  const state: DispatchState = { buffer: [], sequenceOwnerId: null, timer: null };
  const parseCache = new Map<string, ParsedHotkey>();
  let rootHintConsumers = 0;

  const enableRootKeyHints = (): (() => void) => {
    rootHintConsumers += 1;

    return () => {
      rootHintConsumers -= 1;

      if (
        rootHintConsumers === 0 &&
        environment.store.getSnapshot().context.rootKeyHints !== null
      ) {
        environment.store.trigger.sequenceReset();
      }
    };
  };

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
      environment.getConfig().sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS
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
    rootHintSources?: HotkeyCandidates[]
  ): SurfaceDispatch => {
    const cmdCtx = record.buildCtx();

    const candidates = collectCandidates(
      ctx.commandsBySurface.get(record.id),
      record.getMode(),
      cmdCtx,
      environment.getConfig(),
      getParsedHotkey
    );

    rootHintSources?.push(candidates);

    return runSurface(cmdCtx, candidates, event, ctx, state, armTimer, clearBufferAndTimer);
  };

  const finish = (dispatch: SurfaceDispatch, ownerId: string): KeyDispatchResult => {
    if (dispatch.outcome === "pending") {
      state.sequenceOwnerId = ownerId;
      environment.store.trigger.sequencePending({ state: dispatch.sequence });

      return { handled: true };
    }

    environment.store.trigger.sequenceReset();

    return dispatch.outcome === "invoke"
      ? { handled: true, invoke: dispatch.invoke }
      : { handled: false };
  };

  const dispatchIdleKey = (
    event: KeyEvent,
    ctx: CommandStoreContext,
    textInputFocused: boolean
  ): KeyDispatchResult => {
    const modal = selectActiveModalSurface(ctx);

    const panel = modal === null ? selectActivePanelSurface(ctx) : null;
    const active = modal ?? panel ?? environment.rootRecord;
    const activeMode = active.getMode();

    const sources: HotkeyCandidates[] | undefined =
      rootHintConsumers > 0 && !textInputFocused && activeMode !== "insert" && isQuestionMark(event)
        ? []
        : undefined;

    const surfaces =
      panel !== null && activeMode !== "insert" ? [active, environment.rootRecord] : [active];

    for (const surface of surfaces) {
      const dispatch = dispatchTo(surface, event, ctx, sources);

      if (dispatch.outcome !== "miss") {
        return finish(dispatch, surface.id);
      }
    }

    if (sources) {
      const candidates = collectRootHints(sources, ctx);

      if (candidates.length > 0) {
        environment.store.trigger.rootKeyHintsShown({ state: { candidates, prefix: [] } });

        return { handled: true };
      }
    }

    environment.store.trigger.sequenceReset();

    return { handled: false };
  };

  const key = (event: KeyEvent, textInputFocused = false): KeyDispatchResult => {
    const ctx = environment.store.getSnapshot().context;

    if (ctx.rootKeyHints !== null && matchStep(event, ESCAPE)) {
      environment.store.trigger.sequenceReset();

      return { handled: true };
    }

    if (state.buffer.length > 0 && state.sequenceOwnerId !== null) {
      const owner =
        state.sequenceOwnerId === ROOT_SURFACE_ID
          ? environment.rootRecord
          : ctx.surfaces.find((record) => record.id === state.sequenceOwnerId);

      if (owner) {
        return finish(dispatchTo(owner, event, ctx), owner.id);
      }

      clearBufferAndTimer();
    }

    return dispatchIdleKey(event, ctx, textInputFocused);
  };

  return { dispose: clearBufferAndTimer, enableRootKeyHints, key, reset };
};

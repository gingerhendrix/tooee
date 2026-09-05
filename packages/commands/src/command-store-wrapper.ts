import type { KeyEvent } from "@opentui/core";
import type { Mode } from "./mode.js";
import { ROOT_SURFACE_ID, createBaseStore, selectKeyboardOwnerSurface } from "./command-store.js";
import type { CommandStoreInstance, SurfaceRecord } from "./command-store.js";
import { createKeyDispatcher } from "./key-dispatch.js";
import type { KeyDispatchConfig, KeyDispatchResult } from "./key-dispatch.js";
import type { Command, CommandContext, CommandRegistry } from "./types.js";

export type { KeyDispatchResult } from "./key-dispatch.js";

export type CommandStoreConfig = KeyDispatchConfig;

export interface CreateCommandStoreOptions extends CommandStoreConfig {
  root: { getMode: () => Mode; buildCtx: () => CommandContext };
}

export interface CommandStore {
  store: CommandStoreInstance;
  rootRecord: SurfaceRecord;
  key: (event: KeyEvent) => KeyDispatchResult;
  reset: () => void;
  dispose: () => void;
  pushSurface: (surface: SurfaceRecord) => () => void;
  activatePanel: (groupId: string, panelId: string) => void;
  removePanelGroup: (groupId: string) => void;
  modeChanged: (surfaceId: string) => void;
  registryFor: (record: SurfaceRecord) => CommandRegistry;
  setConfig: (config: CommandStoreConfig) => void;
}

const reportCommandFailure = async function reportCommandFailure(result: Promise<void>) {
  try {
    await result;
  } catch (error: unknown) {
    console.error("Command handler failed", error);
  }
};

export const createCommandStore = function createCommandStore(
  options: CreateCommandStoreOptions,
): CommandStore {
  const rootRecord: SurfaceRecord = {
    buildCtx: options.root.buildCtx,
    depth: 0,
    getMode: options.root.getMode,
    id: ROOT_SURFACE_ID,
    order: 0,
    role: "root",
  };
  const store = createBaseStore({
    activePanels: new Map(),
    commandsBySurface: new Map(),
    contextSources: new Map(),
    groups: new Map(),
    sequence: null,
    surfaces: [rootRecord],
  });
  let config: CommandStoreConfig = {
    keymap: options.keymap,
    leader: options.leader,
    sequenceTimeoutMs: options.sequenceTimeoutMs,
  };
  const dispatcher = createKeyDispatcher({ getConfig: () => config, rootRecord, store });
  const registries = new Map<SurfaceRecord, CommandRegistry>();
  let orderCounter = 1;

  const clearIfOwnerChanged = (before: SurfaceRecord | null): void => {
    const after = selectKeyboardOwnerSurface(store.getSnapshot().context);
    if (before !== after) {
      dispatcher.dispose();
    }
  };

  const pushSurface = (surface: SurfaceRecord): (() => void) => {
    surface.order = orderCounter;
    orderCounter += 1;
    const before = selectKeyboardOwnerSurface(store.getSnapshot().context);
    store.trigger.surfacePushed({ surface });
    clearIfOwnerChanged(before);
    return () => {
      const beforePop = selectKeyboardOwnerSurface(store.getSnapshot().context);
      store.trigger.surfacePopped({ surface });
      clearIfOwnerChanged(beforePop);
    };
  };

  const activatePanel = (groupId: string, panelId: string): void => {
    const before = selectKeyboardOwnerSurface(store.getSnapshot().context);
    store.trigger.panelActivated({ groupId, panelId });
    clearIfOwnerChanged(before);
  };
  const removePanelGroup = (groupId: string): void => {
    const before = selectKeyboardOwnerSurface(store.getSnapshot().context);
    store.trigger.panelGroupRemoved({ groupId });
    clearIfOwnerChanged(before);
  };
  const modeChanged = (surfaceId: string): void => {
    dispatcher.dispose();
    store.trigger.modeChanged({ surfaceId });
  };

  const registryFor = (record: SurfaceRecord): CommandRegistry => {
    let registry = registries.get(record);
    if (!registry) {
      registry = {
        get commands() {
          return store.getSnapshot().context.commandsBySurface.get(record.id) ?? new Map();
        },
        invoke(id: string) {
          const command = store.getSnapshot().context.commandsBySurface.get(record.id)?.get(id);
          if (!command) {
            return;
          }
          const commandContext = record.buildCtx();
          if (!command.when || command.when(commandContext)) {
            const result = command.handler(commandContext);
            if (result) {
              void reportCommandFailure(result);
            }
          }
        },
        register(command: Command) {
          store.trigger.commandRegistered({ command, surfaceId: record.id });
          return () => {
            store.trigger.commandUnregistered({ command, surfaceId: record.id });
          };
        },
      };
      registries.set(record, registry);
    }
    return registry;
  };

  return {
    activatePanel,
    dispose: dispatcher.dispose,
    key: dispatcher.key,
    modeChanged,
    pushSurface,
    registryFor,
    removePanelGroup,
    reset: dispatcher.reset,
    rootRecord,
    setConfig: (next) => {
      config = next;
    },
    store,
  };
};

/**
 * Pi settings for the demo, read only, and the choice of start model: the
 * default from ~/.pi/agent/settings.json when it is available, else the first
 * available model.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { SettingsManager, getAgentDir } from "@earendil-works/pi-coding-agent";
import type { ModelRuntime } from "@earendil-works/pi-coding-agent";

export type PiModel = Awaited<ReturnType<ModelRuntime["getAvailable"]>>[number];

type SettingsStorage = Parameters<typeof SettingsManager.fromStorage>[0];

export interface ModelRef {
  provider: string;
  id: string;
}

export const modelLabel = function modelLabel(model: ModelRef): string {
  return `${model.provider}/${model.id}`;
};

/**
 * Settings storage that reads the global Pi settings file and drops every
 * write, so the demo never edits ~/.pi/agent. Project settings are ignored.
 */
const readOnlySettingsStorage = function readOnlySettingsStorage(
  settingsPath: string
): SettingsStorage {
  return {
    withLock: (scope, read) => {
      const current =
        scope === "global" && existsSync(settingsPath)
          ? readFileSync(settingsPath, "utf-8")
          : undefined;

      // The callback returns the next file content; discarding it drops the write.
      read(current);
    },
  };
};

export const loadReadOnlySettings = function loadReadOnlySettings(
  settingsPath = path.join(getAgentDir(), "settings.json")
): SettingsManager {
  return SettingsManager.fromStorage(readOnlySettingsStorage(settingsPath));
};

export const defaultModelRef = function defaultModelRef(
  settings: SettingsManager
): ModelRef | undefined {
  const provider = settings.getDefaultProvider();
  const id = settings.getDefaultModel();

  return provider === undefined || id === undefined ? undefined : { id, provider };
};

export const pickInitialModel = function pickInitialModel<T extends ModelRef>(
  available: readonly T[],
  preferred?: ModelRef
): T | undefined {
  const match =
    preferred === undefined
      ? undefined
      : available.find(
          (model) => model.provider === preferred.provider && model.id === preferred.id
        );

  return match ?? available[0];
};

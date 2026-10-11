/**
 * Boots a Pi SDK chat session: model runtime from ~/.pi/agent, start model,
 * and an in-memory session with the read-only built-in tools (read, grep,
 * find, ls) in the current directory. The assistant can read files but
 * cannot run commands or change files. Nothing here writes to ~/.pi/agent.
 */

import { ModelRuntime, SessionManager, createAgentSession } from "@earendil-works/pi-coding-agent";
import type { AgentSession } from "@earendil-works/pi-coding-agent";

import { defaultModelRef, loadReadOnlySettings, pickInitialModel } from "./initial-model.js";
import type { PiModel } from "./initial-model.js";

const NO_MODELS_MESSAGE =
  "No Pi models are available. Add credentials to ~/.pi/agent/auth.json (for example with `pi` and /login), then restart the demo.";

/** Pi's read-only built-in tools. bash, edit, and write stay off. */
export const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"];

export type BootResult =
  | { ok: true; runtime: ModelRuntime; session: AgentSession; model: PiModel }
  | { ok: false; message: string };

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- caught SDK failures enter here before conversion to display text
export const errorText = function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
};

const startSession = async function startSession(): Promise<BootResult> {
  const runtime = await ModelRuntime.create();
  const available = await runtime.getAvailable();
  const settings = loadReadOnlySettings();
  const model = pickInitialModel(available, defaultModelRef(settings));

  if (model === undefined) {
    return { message: NO_MODELS_MESSAGE, ok: false };
  }

  const { session } = await createAgentSession({
    model,
    modelRuntime: runtime,
    sessionManager: SessionManager.inMemory(),
    settingsManager: settings,
    tools: READ_ONLY_TOOLS,
  });

  return { model, ok: true, runtime, session };
};

/** Never rejects: auth and runtime failures come back as `{ ok: false }`. */
export const bootPiSession = async function bootPiSession(): Promise<BootResult> {
  try {
    return await startSession();
  } catch (error) {
    return { message: `Pi session failed to start: ${errorText(error)}`, ok: false };
  }
};

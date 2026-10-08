/**
 * React side of the Pi session: boots it once, feeds session events into the
 * chat reducer, exposes send/abort/model actions, and disposes the session on
 * unmount (quit destroys the renderer, which unmounts the tree).
 */

import type { AgentSession, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { chatReducer, initialChatState } from "./chat-state.js";
import type { ChatState } from "./chat-state.js";
import { modelLabel } from "./initial-model.js";
import type { PiModel } from "./initial-model.js";
import { toChatAction } from "./pi-events.js";
import { bootPiSession, errorText } from "./pi-session.js";

export interface PiChat {
  state: ChatState;
  /** Starts a prompt. Returns false when the session cannot take input now. */
  send: (text: string) => boolean;
  abort: () => void;
  listModels: () => Promise<readonly PiModel[]>;
  selectModel: (model: PiModel) => Promise<void>;
}

export const usePiChat = function usePiChat(): PiChat {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const sessionRef = useRef<AgentSession | null>(null);
  const runtimeRef = useRef<ModelRuntime | null>(null);
  // Mirrors state.phase, but send() also sets it at once so a fast second
  // Enter cannot start a second run before React re-renders.
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  useEffect(() => {
    let disposed = false;
    let session: AgentSession | undefined;
    let unsubscribe: (() => void) | undefined;

    const start = async (): Promise<void> => {
      const result = await bootPiSession();

      if (!result.ok) {
        if (!disposed) {
          dispatch({ message: result.message, type: "bootFailed" });
        }

        return;
      }

      if (disposed) {
        result.session.dispose();

        return;
      }

      ({ session } = result);
      sessionRef.current = result.session;
      runtimeRef.current = result.runtime;
      unsubscribe = result.session.subscribe((event) => {
        const action = toChatAction(event);

        if (action !== undefined) {
          dispatch(action);
        }
      });
      dispatch({ modelLabel: modelLabel(result.model), type: "booted" });
    };

    void start();

    return () => {
      disposed = true;
      unsubscribe?.();
      session?.dispose();
      sessionRef.current = null;
    };
  }, []);

  const runPrompt = useCallback(async (session: AgentSession, text: string): Promise<void> => {
    try {
      await session.prompt(text);
      dispatch({ type: "runSettled" });
    } catch (error) {
      dispatch({ message: errorText(error), type: "runFailed" });
    }
  }, []);

  const send = useCallback(
    (text: string): boolean => {
      const session = sessionRef.current;

      if (session === null || phaseRef.current !== "ready") {
        return false;
      }

      phaseRef.current = "streaming";
      dispatch({ text, type: "userSent" });
      void runPrompt(session, text);

      return true;
    },
    [runPrompt]
  );

  const abort = useCallback(() => {
    void sessionRef.current?.abort();
  }, []);

  const listModels = useCallback(
    async (): Promise<readonly PiModel[]> => (await runtimeRef.current?.getAvailable()) ?? [],
    []
  );

  const selectModel = useCallback(async (model: PiModel): Promise<void> => {
    const session = sessionRef.current;

    if (session === null) {
      return;
    }

    try {
      await session.setModel(model);
      dispatch({ modelLabel: modelLabel(model), type: "modelChanged" });
    } catch (error) {
      dispatch({ message: `Could not switch model: ${errorText(error)}`, type: "error" });
    }
  }, []);

  return { abort, listModels, selectModel, send, state };
};

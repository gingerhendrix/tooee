/**
 * React side of the Pi session: boots it once, feeds session events into the
 * chat reducer, exposes send/abort/model/thinking actions, and disposes the
 * session on unmount (quit destroys the renderer, which unmounts the tree).
 */

import type { AgentSession, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { chatReducer, initialChatState } from "./chat-state.js";
import type { ChatState } from "./chat-state.js";
import { imagePart, userParts } from "./content-parts.js";
import { loadImageAttachments } from "./image-attachments.js";
import { modelLabel } from "./initial-model.js";
import type { PiModel } from "./initial-model.js";
import { toChatAction } from "./pi-events.js";
import { bootPiSession, errorText } from "./pi-session.js";

export interface PiChat {
  state: ChatState;
  /**
   * Starts a prompt. `@path.png` words attach images. Returns false when the
   * session cannot take input now.
   */
  send: (text: string) => boolean;
  abort: () => void;
  /** Moves to the next thinking level. Returns undefined when the model has none. */
  cycleThinking: () => string | undefined;
  toggleDetails: () => void;
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
      dispatch({
        modelLabel: modelLabel(result.model),
        thinkingLevel: result.session.thinkingLevel,
        type: "booted",
      });
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
      const attachments = await loadImageAttachments(text);

      if (!attachments.ok) {
        dispatch({ message: attachments.message, type: "runFailed" });

        return;
      }

      const { images } = attachments;
      dispatch({ images: images.map(imagePart), type: "imagesAttached" });
      await session.prompt(text, { images });
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
      dispatch({ parts: userParts(text), type: "userSent" });
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
      // Pi clamps the thinking level for the new model and emits
      // thinking_level_changed, which pi-events maps to the reducer.
      dispatch({ modelLabel: modelLabel(model), type: "modelChanged" });
    } catch (error) {
      dispatch({ message: `Could not switch model: ${errorText(error)}`, type: "error" });
    }
  }, []);

  // The session emits thinking_level_changed, so the reducer needs no dispatch here.
  const cycleThinking = useCallback(
    (): string | undefined => sessionRef.current?.cycleThinkingLevel(),
    []
  );

  const toggleDetails = useCallback(() => {
    dispatch({ type: "detailsToggled" });
  }, []);

  return { abort, cycleThinking, listModels, selectModel, send, state, toggleDetails };
};

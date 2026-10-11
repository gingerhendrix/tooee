/**
 * Pure chat state for the Pi chat demo: session phase, the current model
 * label and thinking level, and the list of turns shown in the history
 * panel. Each turn holds display parts (text, thinking, tool calls, images).
 * No React, no SDK.
 */

import { keepToolProgress } from "./content-parts.js";
import type { ImagePart, ToolCallPart, ToolResultView, TurnPart } from "./content-parts.js";

export type ChatPhase = "booting" | "ready" | "streaming" | "failed";

export type ChatTurnRole = "user" | "assistant" | "error";

export interface ChatTurn {
  id: number;
  role: ChatTurnRole;
  parts: readonly TurnPart[];
  /** Assistant turns only: true while content still arrives. */
  streaming: boolean;
  /** Assistant turns only: true when the user aborted the run. */
  aborted: boolean;
  /** Assistant turns only: the model label at the time of the turn. */
  model?: string;
}

export interface ChatState {
  phase: ChatPhase;
  modelLabel?: string;
  /** Pi thinking level for the next prompt, for example "off" or "medium". */
  thinkingLevel?: string;
  /** Show full thinking text and tool output instead of short previews. */
  showDetails: boolean;
  /** Set when booting fails (no models, auth error). */
  failure?: string;
  turns: readonly ChatTurn[];
  nextId: number;
}

export type ChatAction =
  | { type: "booted"; modelLabel: string; thinkingLevel?: string }
  | { type: "bootFailed"; message: string }
  | { type: "userSent"; parts: readonly TurnPart[] }
  | { type: "imagesAttached"; images: readonly ImagePart[] }
  | { type: "assistantStarted" }
  | { type: "assistantUpdated"; parts: readonly TurnPart[] }
  | {
      type: "assistantEnded";
      parts: readonly TurnPart[];
      stopReason?: string;
      errorMessage?: string;
    }
  | { type: "toolStarted"; toolCallId: string }
  | { type: "toolFinished"; toolCallId: string; result: ToolResultView }
  | { type: "runSettled" }
  | { type: "runFailed"; message: string }
  | { type: "modelChanged"; modelLabel: string }
  | { type: "thinkingLevelChanged"; thinkingLevel: string }
  | { type: "detailsToggled" }
  | { type: "error"; message: string };

export const initialChatState: ChatState = {
  nextId: 1,
  phase: "booting",
  showDetails: false,
  turns: [],
};

const appendTurn = function appendTurn(
  state: ChatState,
  turn: Omit<ChatTurn, "id" | "streaming" | "aborted"> & Partial<ChatTurn>
): ChatState {
  return {
    ...state,
    nextId: state.nextId + 1,
    turns: [...state.turns, { aborted: false, streaming: false, ...turn, id: state.nextId }],
  };
};

const textParts = function textParts(text: string): TurnPart[] {
  return [{ kind: "text", text }];
};

const replaceTurn = function replaceTurn(
  state: ChatState,
  index: number,
  update: (turn: ChatTurn) => ChatTurn
): ChatState {
  const turn = state.turns[index];

  if (turn === undefined) {
    return state;
  }

  const turns = [...state.turns];
  turns[index] = update(turn);

  return { ...state, turns };
};

/** Apply `update` to the newest assistant turn that is still streaming. */
const updateStreamingTurn = function updateStreamingTurn(
  state: ChatState,
  update: (turn: ChatTurn) => ChatTurn
): ChatState {
  const index = state.turns.findLastIndex((turn) => turn.role === "assistant" && turn.streaming);

  return index === -1 ? state : replaceTurn(state, index, update);
};

/** Apply `update` to the tool call part with this id, in the newest turn that has it. */
const updateToolCall = function updateToolCall(
  state: ChatState,
  toolCallId: string,
  update: (part: ToolCallPart) => ToolCallPart
): ChatState {
  const hasCall = (part: TurnPart): boolean => part.kind === "toolCall" && part.id === toolCallId;
  const index = state.turns.findLastIndex((turn) => turn.parts.some(hasCall));

  return replaceTurn(state, index, (turn) => ({
    ...turn,
    parts: turn.parts.map((part) =>
      part.kind === "toolCall" && part.id === toolCallId ? update(part) : part
    ),
  }));
};

/** Adds image parts to the newest user turn, after its text. */
const attachImages = function attachImages(
  state: ChatState,
  images: readonly ImagePart[]
): ChatState {
  const index = state.turns.findLastIndex((turn) => turn.role === "user");

  if (images.length === 0) {
    return state;
  }

  return replaceTurn(state, index, (turn) => ({ ...turn, parts: [...turn.parts, ...images] }));
};

const isOpenToolCall = function isOpenToolCall(part: TurnPart): boolean {
  return part.kind === "toolCall" && (part.status === "pending" || part.status === "running");
};

/** Tool calls that never ran or never finished when the run stopped. */
const cancelOpenToolCalls = function cancelOpenToolCalls(turn: ChatTurn): ChatTurn {
  if (!turn.parts.some(isOpenToolCall)) {
    return turn;
  }

  return {
    ...turn,
    parts: turn.parts.map((part) =>
      part.kind === "toolCall" && isOpenToolCall(part) ? { ...part, status: "cancelled" } : part
    ),
  };
};

const endAssistantTurn = function endAssistantTurn(
  state: ChatState,
  action: Extract<ChatAction, { type: "assistantEnded" }>
): ChatState {
  const ended = updateStreamingTurn(state, (turn) => ({
    ...turn,
    aborted: action.stopReason === "aborted",
    parts: action.parts.length === 0 ? turn.parts : keepToolProgress(turn.parts, action.parts),
    streaming: false,
  }));

  if (action.stopReason !== "error") {
    return ended;
  }

  return appendTurn(ended, {
    parts: textParts(action.errorMessage ?? "The model returned an error."),
    role: "error",
  });
};

const settleRun = function settleRun(state: ChatState): ChatState {
  // Close any turn that never saw message_end, so no cursor spins forever,
  // and mark tool calls that will not run now.
  const closed = updateStreamingTurn(state, (turn) => ({ ...turn, streaming: false }));
  const turns = closed.turns.map(cancelOpenToolCalls);

  return { ...closed, phase: closed.phase === "streaming" ? "ready" : closed.phase, turns };
};

export const chatReducer = function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "booted": {
      return {
        ...state,
        modelLabel: action.modelLabel,
        phase: "ready",
        thinkingLevel: action.thinkingLevel,
      };
    }

    case "bootFailed": {
      return { ...state, failure: action.message, phase: "failed" };
    }

    case "userSent": {
      return appendTurn({ ...state, phase: "streaming" }, { parts: action.parts, role: "user" });
    }

    case "imagesAttached": {
      return attachImages(state, action.images);
    }

    case "assistantStarted": {
      return appendTurn(state, {
        model: state.modelLabel,
        parts: [],
        role: "assistant",
        streaming: true,
      });
    }

    case "assistantUpdated": {
      return updateStreamingTurn(state, (turn) => ({
        ...turn,
        parts: keepToolProgress(turn.parts, action.parts),
      }));
    }

    case "assistantEnded": {
      return endAssistantTurn(state, action);
    }

    case "toolStarted": {
      return updateToolCall(state, action.toolCallId, (part) => ({ ...part, status: "running" }));
    }

    case "toolFinished": {
      return updateToolCall(state, action.toolCallId, (part) => ({
        ...part,
        result: action.result,
        status: action.result.isError ? "error" : "done",
      }));
    }

    case "runSettled": {
      return settleRun(state);
    }

    case "runFailed": {
      return appendTurn(settleRun(state), { parts: textParts(action.message), role: "error" });
    }

    case "modelChanged": {
      return { ...state, modelLabel: action.modelLabel };
    }

    case "thinkingLevelChanged": {
      return { ...state, thinkingLevel: action.thinkingLevel };
    }

    case "detailsToggled": {
      return { ...state, showDetails: !state.showDetails };
    }

    case "error": {
      return appendTurn(state, { parts: textParts(action.message), role: "error" });
    }

    default: {
      return state;
    }
  }
};

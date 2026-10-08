/**
 * Pure chat state for the Pi chat demo: session phase, the current model
 * label, and the list of turns shown in the history panel. No React, no SDK.
 */

export type ChatPhase = "booting" | "ready" | "streaming" | "failed";

export type ChatTurnRole = "user" | "assistant" | "error";

export interface ChatTurn {
  id: number;
  role: ChatTurnRole;
  text: string;
  /** Assistant turns only: true while text deltas still arrive. */
  streaming: boolean;
  /** Assistant turns only: true when the user aborted the run. */
  aborted: boolean;
  /** Assistant turns only: the model label at the time of the turn. */
  model?: string;
}

export interface ChatState {
  phase: ChatPhase;
  modelLabel?: string;
  /** Set when booting fails (no models, auth error). */
  failure?: string;
  turns: readonly ChatTurn[];
  nextId: number;
}

export type ChatAction =
  | { type: "booted"; modelLabel: string }
  | { type: "bootFailed"; message: string }
  | { type: "userSent"; text: string }
  | { type: "assistantStarted" }
  | { type: "textDelta"; delta: string }
  | { type: "assistantEnded"; text: string; stopReason?: string; errorMessage?: string }
  | { type: "runSettled" }
  | { type: "runFailed"; message: string }
  | { type: "modelChanged"; modelLabel: string }
  | { type: "error"; message: string };

export const initialChatState: ChatState = { nextId: 1, phase: "booting", turns: [] };

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

/** Apply `update` to the newest assistant turn that is still streaming. */
const updateStreamingTurn = function updateStreamingTurn(
  state: ChatState,
  update: (turn: ChatTurn) => ChatTurn
): ChatState {
  const index = state.turns.findLastIndex((turn) => turn.role === "assistant" && turn.streaming);

  if (index === -1) {
    return state;
  }

  const turns = [...state.turns];
  const turn = turns[index];

  if (turn === undefined) {
    return state;
  }

  turns[index] = update(turn);

  return { ...state, turns };
};

const endAssistantTurn = function endAssistantTurn(
  state: ChatState,
  action: Extract<ChatAction, { type: "assistantEnded" }>
): ChatState {
  const ended = updateStreamingTurn(state, (turn) => ({
    ...turn,
    aborted: action.stopReason === "aborted",
    streaming: false,
    text: action.text === "" ? turn.text : action.text,
  }));

  if (action.stopReason !== "error") {
    return ended;
  }

  return appendTurn(ended, {
    role: "error",
    text: action.errorMessage ?? "The model returned an error.",
  });
};

export const chatReducer = function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "booted": {
      return { ...state, modelLabel: action.modelLabel, phase: "ready" };
    }

    case "bootFailed": {
      return { ...state, failure: action.message, phase: "failed" };
    }

    case "userSent": {
      return appendTurn({ ...state, phase: "streaming" }, { role: "user", text: action.text });
    }

    case "assistantStarted": {
      return appendTurn(state, {
        model: state.modelLabel,
        role: "assistant",
        streaming: true,
        text: "",
      });
    }

    case "textDelta": {
      return updateStreamingTurn(state, (turn) => ({ ...turn, text: turn.text + action.delta }));
    }

    case "assistantEnded": {
      return endAssistantTurn(state, action);
    }

    case "runSettled": {
      // Close any turn that never saw message_end, so no cursor spins forever.
      const closed = updateStreamingTurn(state, (turn) => ({ ...turn, streaming: false }));

      return closed.phase === "streaming" ? { ...closed, phase: "ready" } : closed;
    }

    case "runFailed": {
      const settled = chatReducer(state, { type: "runSettled" });

      return appendTurn(settled, { role: "error", text: action.message });
    }

    case "modelChanged": {
      return { ...state, modelLabel: action.modelLabel };
    }

    case "error": {
      return appendTurn(state, { role: "error", text: action.message });
    }

    default: {
      return state;
    }
  }
};

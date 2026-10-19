import type { InputRenderable, KeyEvent, TextareaRenderable } from "@opentui/core";

type EditableMotionTarget = Pick<
  InputRenderable | TextareaRenderable,
  | "moveCursorLeft"
  | "moveCursorRight"
  | "moveCursorUp"
  | "moveCursorDown"
  | "gotoLineHome"
  | "gotoLineEnd"
  | "gotoBufferHome"
  | "gotoBufferEnd"
  | "moveWordForward"
  | "moveWordBackward"
>;

export type EditableInsertTarget = Pick<
  InputRenderable | TextareaRenderable,
  "gotoLineStart" | "gotoLineTextEnd" | "insertText" | "moveCursorRight" | "moveCursorLeft"
>;

export interface VimMotionState {
  pendingG: boolean;
}

export const appendAtCursor = function appendAtCursor(
  target: EditableInsertTarget | null | undefined
): void {
  target?.moveCursorRight();
};

export const openLineAtCursor = function openLineAtCursor(
  target: EditableInsertTarget | null | undefined,
  position: "above" | "below"
): void {
  if (!target) {
    return;
  }

  if (position === "above") {
    target.gotoLineStart();
    target.insertText("\n");
    target.moveCursorLeft();

    return;
  }

  target.gotoLineTextEnd();
  target.insertText("\n");
};

const consume = function consume(key: KeyEvent): true {
  key.preventDefault();

  return true;
};

const isPlainKey = function isPlainKey(key: KeyEvent, name: string): boolean {
  return (
    !key.ctrl &&
    !key.meta &&
    !key.option &&
    (key.name === name || key.raw === name) &&
    (!key.shift || key.raw === name)
  );
};

const handleBasicMotion = function handleBasicMotion(
  key: KeyEvent,
  target: EditableMotionTarget
): boolean {
  const motions: readonly {
    matches: boolean;
    move: () => void;
  }[] = [
    {
      matches: isPlainKey(key, "h") || key.name === "left",
      move: () => {
        target.moveCursorLeft();
      },
    },
    {
      matches: isPlainKey(key, "l") || key.name === "right",
      move: () => {
        target.moveCursorRight();
      },
    },
    {
      matches: isPlainKey(key, "j") || key.name === "down",
      move: () => {
        target.moveCursorDown();
      },
    },
    {
      matches: isPlainKey(key, "k") || key.name === "up",
      move: () => {
        target.moveCursorUp();
      },
    },
    {
      matches: isPlainKey(key, "0") || key.name === "home",
      move: () => {
        target.gotoLineHome();
      },
    },
    {
      matches: isPlainKey(key, "$") || key.name === "end",
      move: () => {
        target.gotoLineEnd();
      },
    },
    {
      matches: isPlainKey(key, "w"),
      move: () => {
        target.moveWordForward();
      },
    },
    {
      matches: isPlainKey(key, "b"),
      move: () => {
        target.moveWordBackward();
      },
    },
  ];

  const motion = motions.find(({ matches }) => matches);

  if (!motion) {
    return false;
  }

  motion.move();

  return consume(key);
};

export const handleEditBufferVimMotion = function handleEditBufferVimMotion(
  key: KeyEvent,
  target: EditableMotionTarget | null | undefined,
  state: VimMotionState
): boolean {
  if (!target || key.ctrl || key.meta || key.option) {
    state.pendingG = false;

    return false;
  }

  if (state.pendingG) {
    state.pendingG = false;

    if (isPlainKey(key, "g")) {
      target.gotoBufferHome();

      return consume(key);
    }
  }

  if (handleBasicMotion(key, target)) {
    return true;
  }

  if ((key.name === "g" && key.shift) || key.raw === "G") {
    target.gotoBufferEnd();

    return consume(key);
  }

  if (isPlainKey(key, "g")) {
    state.pendingG = true;

    return consume(key);
  }

  return false;
};

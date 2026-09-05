import { KeyEvent } from "@opentui/core";

export const keyEvent = function keyEvent(
  name: string,
  modifiers: Partial<Pick<KeyEvent, "ctrl" | "meta" | "option" | "shift" | "super">> = {},
): KeyEvent {
  return new KeyEvent({
    ctrl: false,
    eventType: "press",
    meta: false,
    name,
    number: false,
    option: false,
    raw: name,
    sequence: name,
    shift: false,
    source: "raw",
    ...modifiers,
  });
};

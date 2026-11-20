import type { KeyEvent } from "@opentui/core";

import type { ParsedStep } from "./types.js";

/** Kitty can report a typed question mark as Shift+/ with the resulting text. */
export const isQuestionMark = function isQuestionMark(event: KeyEvent): boolean {
  return (
    (event.name === "?" || (event.shift && event.name === "/" && event.sequence === "?")) &&
    !event.ctrl &&
    !event.meta &&
    !event.option &&
    event.super !== true &&
    event.hyper !== true
  );
};

/**
 * Check if a KeyEvent matches a ParsedStep.
 */
export const matchStep = function matchStep(event: KeyEvent, step: ParsedStep): boolean {
  if (
    step.key === "?" &&
    !step.shift &&
    !step.ctrl &&
    !step.meta &&
    !step.option &&
    step.super !== true
  ) {
    return isQuestionMark(event);
  }

  if (event.name !== step.key) {
    return false;
  }

  if (event.ctrl !== step.ctrl) {
    return false;
  }

  if (event.meta !== step.meta) {
    return false;
  }

  if (event.shift !== step.shift) {
    return false;
  }

  if (event.option !== step.option) {
    return false;
  }

  if ((event.super ?? false) !== (step.super ?? false)) {
    return false;
  }

  return true;
};

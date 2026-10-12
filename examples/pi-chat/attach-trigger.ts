/**
 * Text rules for `@` then Tab in the input. The trigger is an `@` just
 * before the cursor, at the start of a word. The chosen paths go in at the
 * cursor, so the `@` that the user typed starts the first reference.
 */

/** True when the character before `offset` is an `@` that starts a word. */
export const atAttachTrigger = function atAttachTrigger(text: string, offset: number): boolean {
  if (offset < 1 || offset > text.length || text[offset - 1] !== "@") {
    return false;
  }

  return offset === 1 || /\s/u.test(text[offset - 2] ?? "");
};

/** The text to insert after the typed `@`: `a.ts @b.png ` for two paths. */
export const attachInsertText = function attachInsertText(paths: readonly string[]): string {
  return paths.length === 0 ? "" : `${paths.join(" @")} `;
};

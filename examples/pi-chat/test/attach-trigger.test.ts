import { describe, expect, test } from "bun:test";

import { atAttachTrigger, attachInsertText } from "../attach-trigger.js";

describe("atAttachTrigger", () => {
  test("is true for an @ just before the cursor at the start of a word", () => {
    expect(atAttachTrigger("@", 1)).toBe(true);
    expect(atAttachTrigger("look at @", 9)).toBe(true);
    expect(atAttachTrigger("line one\n@", 10)).toBe(true);
  });

  test("is false inside a word, after other text, or away from the @", () => {
    expect(atAttachTrigger("me@", 3)).toBe(false);
    expect(atAttachTrigger("@src", 4)).toBe(false);
    expect(atAttachTrigger("@ ", 2)).toBe(false);
    expect(atAttachTrigger("", 0)).toBe(false);
  });
});

describe("attachInsertText", () => {
  test("joins paths with @ and ends with a space", () => {
    expect(attachInsertText(["a.ts"])).toBe("a.ts ");
    expect(attachInsertText(["a.ts", "shots/b.png"])).toBe("a.ts @shots/b.png ");
  });

  test("inserts nothing for no paths", () => {
    expect(attachInsertText([])).toBe("");
  });
});

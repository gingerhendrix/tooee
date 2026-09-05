import { expect, mock, test } from "bun:test";

const shell = await import("@tooee/shell");
const runCliSession = mock(async () => {
  await Promise.resolve();
  return null;
});
void mock.module("@tooee/shell", () => ({ ...shell, runCliSession }));

const { launch } = await import("../src/launch.js");

test("standalone view waits for its CLI session", async () => {
  await launch({
    contentProvider: { format: "text", load: () => ({ format: "text", text: "hello" }) },
  });

  expect(runCliSession).toHaveBeenCalledTimes(1);
});

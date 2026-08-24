import { expect, mock, test } from "bun:test";

const shell = await import("@tooee/shell");
const runCliSession = mock(async () => {
  await Promise.resolve();
  return null;
});
void mock.module("@tooee/shell", () => ({ ...shell, runCliSession }));

const { launch } = await import("../src/launch.js");

test("standalone choose inherits the renderer Ctrl+C exit default", async () => {
  await launch({ contentProvider: { load: () => [] } });

  expect(runCliSession).toHaveBeenCalledTimes(1);
  expect(runCliSession.mock.calls[0]?.[1]).toEqual({
    provider: { initialMode: "insert" },
    stdinPolicy: "tty-if-piped",
  });
});

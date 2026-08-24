import { expect, mock, test } from "bun:test";

const shell = await import("@tooee/shell");
const launchCli = mock(async () => {
  await Promise.resolve();
});
void mock.module("@tooee/shell", () => ({ ...shell, launchCli }));

const { launch } = await import("../src/launch.js");

test("standalone ask inherits the renderer Ctrl+C exit default", async () => {
  await launch({});

  expect(launchCli).toHaveBeenCalledTimes(1);
  expect(launchCli.mock.calls[0]?.[1]).toEqual({ provider: { initialMode: "insert" } });
});

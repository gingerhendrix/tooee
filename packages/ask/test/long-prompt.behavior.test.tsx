import { afterEach, expect, test } from "bun:test";

import { TooeeProvider } from "@tooee/shell";
import { testRender } from "@tooee/test-support";
import { act } from "react";

import { Ask } from "../src/ask.js";

let setup: Awaited<ReturnType<typeof testRender>>;

afterEach(async () => {
  await setup?.dispose();
});

test("a long prompt leaves an editable row on the first frame and after resize", async () => {
  let submitted = "";
  setup = await testRender(
    <TooeeProvider initialMode="insert">
      <Ask
        title="Long prompt"
        prompt={Array.from(
          { length: 20 },
          (_, i) => `Prompt line ${i + 1}: Explain the migration.`
        ).join("\n")}
        defaultValue="EDITABLE"
        multiline
        onSubmit={(value) => {
          submitted = value;
        }}
      />
    </TooeeProvider>,
    { height: 14, kittyKeyboard: true, width: 80 }
  );
  await setup.renderOnce();
  const first = setup.captureCharFrame();
  expect(first).toContain("Prompt line 1:");
  expect(first).toContain("EDITABLE");
  expect(first.split("\n").findIndex((line) => line.includes("EDITABLE"))).toBeLessThan(13);
  expect(first.split("\n")[13]).toContain("Mode: insert");

  await act(async () => {
    await setup.mockInput.typeText("!");
  });
  await setup.renderOnce();
  expect(setup.captureCharFrame()).toContain("EDITABLE!");

  await act(async () => {
    setup.resize(60, 18);
    await Promise.resolve();
  });
  await setup.renderOnce();
  const resized = setup.captureCharFrame();
  expect(resized).toContain("EDITABLE!");
  expect(resized.split("\n")[17]).toContain("Mode: insert");
  await setup.renderOnce();
  expect(setup.captureCharFrame()).toBe(resized);

  await act(async () => {
    setup.mockInput.pressEnter({ shift: true });
    await Promise.resolve();
  });
  expect(submitted).toBe("EDITABLE!");
});

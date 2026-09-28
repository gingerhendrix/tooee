import { afterEach, expect, test } from "bun:test";

import type { Session } from "tuistory";

import { launchView } from "./helpers.js";

let session: Session;
afterEach(() => {
  session?.close();
});

test("clicking links in Markdown table cells follows them in the same session", async () => {
  session = await launchView("links/table.md");
  await session.click("Missing row");
  await session.waitForText("File not found: missing.md");
  await session.click("Journey end");
  await session.waitForText("Journey complete");
  expect(await session.text()).toContain("end.md");
  await session.press("backspace");
  await session.waitForText("Table links");
  await session.click("Table target");
  await session.waitForText("Navigation target");
  expect(await session.text()).toContain("target.md");
}, 30_000);

import { afterEach, expect, test } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;
afterEach(() => {
  session?.close();
});

test("standalone links navigate in one PTY, with Back and cursor Enter", async () => {
  session = await launchView("links/start.md");
  await session.click("External website");
  await session.waitForText("Unsupported link: https://example.com");
  await session.click("Open linked document");
  await session.waitForText("Navigation target");
  expect(await session.text()).toContain("target.md");
  await session.click("Continue journey");
  await session.waitForText("Journey complete");
  await session.press(["shift", "g"]);
  await session.waitForText("Navigation bottom marker");
  expect(await session.text()).not.toContain("# Journey complete");
  await session.press("/");
  await session.type("Final searchable");
  await session.press("enter");
  await session.waitForText("Final searchable content.");
  expect(await session.text()).toMatch(/Mode:\s*cursor/u);
  await session.press("backspace");
  await session.waitForText("Navigation target");
  await session.press("backspace");
  await session.waitForText("Link source");
  await session.press("j");
  await session.press("enter");
  await session.waitForText("Navigation target");
  await session.press(":");
  await session.type("Go back");
  await session.press("enter");
  await session.waitForText("Link source");
  expect(await session.text()).toMatch(/Mode:\s*cursor/u);
}, 30_000);

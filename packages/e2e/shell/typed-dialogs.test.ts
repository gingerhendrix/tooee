import { afterEach, test } from "bun:test";
import type { Session } from "tuistory";
import { launchShellFixture } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

// OpenTUI expects kitty-encoded Escape in a real PTY (see docs/testing.md).
const KITTY_ESCAPE = "\u001B[27u";

const launch = async function launch(): Promise<Session> {
  return await launchShellFixture("typed-dialogs-app.tsx", "typed dialogs e2e ready");
};

test("ask dialog open -> type -> submit resolves the value", async () => {
  session = await launch();
  await session.press("a");
  await session.waitForText("Type something", { timeout: 5000 });

  await session.type("hi there");
  await session.press("enter");

  await session.waitForText("ask-result: [hi there]", { timeout: 5000 });
}, 20_000);

test("ask dialog cancel resolves null", async () => {
  session = await launch();
  await session.press("a");
  await session.waitForText("Type something", { timeout: 5000 });

  session.writeRaw(KITTY_ESCAPE); // insert -> cursor on the dialog surface
  await session.waitForText("i insert", { timeout: 5000 }); // cursor-mode hints
  await session.press("q"); // cancel

  await session.waitForText("ask-result: <null>", { timeout: 5000 });
}, 20_000);

test("choose dialog open -> filter -> select resolves the typed item", async () => {
  session = await launch();
  await session.press("c");
  await session.waitForText("Pick a model", { timeout: 5000 });

  await session.type("med");
  await session.press("enter");

  await session.waitForText("choose-result: medium", { timeout: 5000 });
}, 20_000);

test("nested choose over ask suspends the editor and restores it", async () => {
  session = await launch();
  await session.press("a");
  await session.waitForText("Type something", { timeout: 5000 });

  await session.type("use ");
  await session.press(["ctrl", "p"]); // open the nested chooser from the ask surface
  await session.waitForText("Pick a model", { timeout: 5000 });

  await session.type("large"); // goes to the chooser filter, not the editor
  await session.press("enter");
  await session.waitForText("choose-result: large", { timeout: 5000 });

  await session.type("!"); // editor focus restored
  await session.press("enter");

  await session.waitForText("ask-result: [use large!]", { timeout: 5000 });
}, 20_000);

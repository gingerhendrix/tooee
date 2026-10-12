import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import path from "node:path";

import { TooeeProvider } from "@tooee/shell";
import { copied, press, pressEnter, pressEscape, pressTab, testRender } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { act } from "react";

import { TermcnApp } from "../app.js";
import type { TermcnClient } from "../data/client.js";
import {
  createFixtureClient,
  FIXTURE_VENDOR_DIR,
  offlineFetch,
  tempCacheDirectory,
} from "./support/fake-termcn.js";

let session: TestSession | undefined;

const settle = async function settle(current: TestSession): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each pass lets one more async load land
    await act(async () => {
      await Bun.sleep(5);
    });
  }

  await current.renderOnce();
};

const frame = function frame(): string {
  return session?.captureCharFrame() ?? "";
};

const mount = async function mount(
  client: TermcnClient,
  vendorDirectory: string
): Promise<TestSession> {
  session = await testRender(
    <TooeeProvider>
      <TermcnApp client={client} vendorDirectory={vendorDirectory} />
    </TooeeProvider>,
    { height: 36, kittyKeyboard: true, width: 120 }
  );
  await settle(session);

  return session;
};

/** Move to the key-echo row and open the detail panel. Preview is the first tab. */
const openPreview = async function openPreview(current: TestSession): Promise<void> {
  await press(current, "j");
  await settle(current);
  await pressEnter(current);
  await settle(current);
};

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
});

describe("termcn browser", () => {
  test("lists OpenTUI components under category headers", async () => {
    await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    expect(frame()).toContain("LAYOUT");
    expect(frame()).toContain("FEEDBACK");
    expect(frame()).toContain("key-echo");
    expect(frame()).toContain("components 2");
    expect(frame()).toContain("demos termcn fixture");
  });

  test("filters the list and shows each match's category", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await press(current, "i");
    await act(async () => {
      await current.mockInput.typeText("echo");
    });
    await settle(current);

    expect(frame()).toContain("key-echo  feedback");
    expect(frame()).not.toContain("LAYOUT");
  });

  test("shows details, cleaned docs, and source for the selected component", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await press(current, "j");
    await settle(current);

    expect(frame()).toContain("Prints the keys it receives");
    expect(frame()).toContain("npx shadcn@latest add @termcn/opentui/key-echo");

    await pressTab(current);
    await press(current, "2");
    await settle(current);

    expect(frame()).toContain("Usage");
    expect(frame()).not.toContain("<ComponentPreview");

    await press(current, "3");
    await settle(current);

    expect(frame()).toContain("components/ui/key-echo.tsx");
    expect(frame()).toContain("export const KeyEcho");
  });

  test("copies the install command", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await press(current, "y");
    await settle(current);

    expect(copied).toEqual(["npx shadcn@latest add @termcn/opentui/box"]);
  });

  test("explains an offline start", async () => {
    await mount(await createFixtureClient(offlineFetch), FIXTURE_VENDOR_DIR);

    // The error wraps inside the narrow list panel.
    expect(frame()).toContain("Could not load the termcn");
    expect(frame()).toContain("No cached copy");
    expect(frame()).toContain("components unavailable");
  });
});

describe("live preview", () => {
  test("opens the Preview tab first", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await press(current, "j");
    await settle(current);

    expect(frame()).toMatch(/1 Preview .* 2 Docs .* 3 Source/u);
    expect(frame()).toContain("Demo 1/2");
    expect(frame()).not.toContain("Usage");
  });

  test("keeps demo keys gated until interact mode", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await openPreview(current);

    expect(frame()).toContain("Demo 1/2");
    expect(frame()).toContain("key-echo-demo");
    expect(frame()).toContain("termcn theme: tooee-");
    expect(frame()).toContain("demo keys: none");

    await press(current, "x");

    expect(frame()).toContain("demo keys: none");

    await pressEnter(current);
    await press(current, "x");
    await press(current, "q");
    await press(current, "1");

    expect(frame()).toContain("INTERACT");
    expect(frame()).toContain("demo keys: x,q,1");
    expect(current.renderer.isDestroyed).toBe(false);

    await press(current, "g", { ctrl: true });

    expect(frame()).not.toContain("INTERACT");
    expect(frame()).toContain("demo keys: x,q,1");

    await press(current, "x");

    expect(frame()).toContain("demo keys: x,q,1");
  });

  test("cycles demos and shows a failing demo inline", async () => {
    const current = await mount(await createFixtureClient(), FIXTURE_VENDOR_DIR);

    await openPreview(current);
    await press(current, "n");
    await settle(current);

    expect(frame()).toContain("Demo 2/2");
    expect(frame()).toContain("Demo key-echo-broken failed to render.");
    expect(frame()).toContain("fixture demo exploded");

    await pressEscape(current);
    await press(current, "p");
    await settle(current);

    expect(frame()).toContain("demo keys: none");
  });

  test("tells the user how to sync vendor/ when it is missing", async () => {
    const missing = path.join(await tempCacheDirectory(), "vendor");
    const current = await mount(await createFixtureClient(), missing);

    await openPreview(current);

    expect(frame()).toContain("Live demos need the termcn source");
    expect(frame()).toContain("bun examples/termcn/scripts/sync-vendor.ts");
    expect(frame()).toContain("demos not synced");
  });
});

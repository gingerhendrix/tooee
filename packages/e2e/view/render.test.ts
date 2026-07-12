import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

describe("content rendering", () => {
  test("renders markdown content", async () => {
    session = await launchView("sample.md");
    const text = await session.text();
    expect(text).toContain("Hello World");
  }, 20_000);

  test("renders code files with correct format", async () => {
    session = await launchView("sample.ts");
    const text = await session.text();
    expect(text).toContain("Format: code");
  }, 20_000);

  test("renders plain text files", async () => {
    session = await launchView("plain.txt");
    const text = await session.text();
    expect(text).toContain("plain text file");
  }, 20_000);

  test("status bar shows line count", async () => {
    session = await launchView("sample.md");
    const text = await session.text();
    expect(text).toMatch(/Lines:\s*\d+/u);
  }, 20_000);
});

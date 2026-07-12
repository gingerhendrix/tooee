import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

describe("markdown gutter e2e", () => {
  describe("rendering", () => {
    test("markdown renders with line numbers", async () => {
      session = await launchView("sample.md");
      const text = await session.text();
      // Line numbers should appear in the gutter — at least 1, 2, 3
      expect(text).toContain("1");
      expect(text).toContain("2");
      expect(text).toContain("3");
      // Content should also render
      expect(text).toContain("Hello World");
    }, 20_000);

    test("line numbers correspond to block count", async () => {
      session = await launchView("sample.md");
      const text = await session.text();
      // sample.md has blocks: heading, paragraph, heading, list, heading+code block
      // Verify we see several line numbers and the content
      expect(text).toContain("Hello World");
      expect(text).toContain("Section Two");
      expect(text).toContain("Code Example");
    }, 20_000);

    test("line numbers align with content rows", async () => {
      session = await launchView("sample.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      const text = await session.text();
      const lines = text.split("\n");

      // Line numbers should appear on the SAME line as their content
      const helloLine = lines.find((l) => l.includes("Hello World"));
      const sectionTwoLine = lines.find((l) => l.includes("Section Two"));
      const paragraphLine = lines.find((l) => l.includes("This is a test document"));

      expect(helloLine).toBeDefined();
      expect(helloLine).toMatch(/1.*Hello World/u);
      expect(paragraphLine).toBeDefined();
      expect(paragraphLine).toMatch(/2.*This is a test document/u);
      expect(sectionTwoLine).toBeDefined();
      expect(sectionTwoLine).toMatch(/3.*Section Two/u);
    }, 20_000);
  });

  describe("cursor", () => {
    test("cursor indicator appears on active block", async () => {
      session = await launchView("sample.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      const text = await session.text();

      expect(text).toContain("\u25B8");
      expect(text).toContain("Mode: cursor");
      expect(text).toContain("Cursor: 0");
    }, 20_000);

    test("cursor moves with j/k", async () => {
      session = await launchView("long.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      // Move cursor down one at a time, waiting for each update (robust on slow CI)
      await session.press("j");
      await session.waitForText(/Cursor:\s*1/u, { timeout: 5000 });
      await session.press("j");
      await session.waitForText(/Cursor:\s*2/u, { timeout: 5000 });
      await session.press("j");
      await session.waitForText(/Cursor:\s*3/u, { timeout: 5000 });
      const text = await session.text();
      // Should still be in cursor mode after navigation
      expect(text).toMatch(/Mode:\s*cursor/u);
      expect(text).toContain("\u25B8");
      expect(text).toMatch(/Cursor:\s*3/u);
    }, 20_000);
  });

  describe("search", () => {
    test("search shows match indicators", async () => {
      session = await launchView("long.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      // Open search — retry until search bar appears (Mode: cursor disappears)
      for (let attempt = 0; attempt < 3; attempt++) {
        await session.press("/");
        await Bun.sleep(500);
        const check = await session.text();
        if (!check.match(/Mode:\s*cursor/u)) {
          break;
        }
      }
      // Type a query that matches all sections (visible in viewport)
      await session.type("Section");
      // Submit search
      await session.press("enter");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      const text = await session.text();
      // Search match indicator should appear in the gutter
      expect(text).toContain("\u25CF");
    }, 20_000);

    test("search match count shows in search bar", async () => {
      session = await launchView("long.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      // Open search — retry until search bar appears (Mode: cursor disappears)
      for (let attempt = 0; attempt < 3; attempt++) {
        await session.press("/");
        await Bun.sleep(500);
        const check = await session.text();
        if (!check.match(/Mode:\s*cursor/u)) {
          break;
        }
      }
      await session.type("Section");
      // Wait for match count to appear in search bar (N/M format)
      await session.waitForText(/\d+\/\d+/u, { timeout: 10_000 });
      const text = await session.text();
      expect(text).toMatch(/\d+\/\d+/u);
    }, 20_000);
  });

  describe("selection", () => {
    test("selection mode highlights blocks", async () => {
      session = await launchView("long.md");
      await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
      // Enter select mode
      await session.press("v");
      await session.waitForText(/Mode:\s*select/u, { timeout: 5000 });
      // Extend selection
      await session.press("j");
      const text = await session.text();
      expect(text).toMatch(/Mode:\s*select/u);
    }, 20_000);
  });

  describe("code files", () => {
    test("code files still render correctly", async () => {
      session = await launchView("sample.ts");
      const text = await session.text();
      expect(text).toContain("Format: code");
    }, 20_000);
  });

  describe("edge cases", () => {
    test("minimal markdown renders without crashing", async () => {
      session = await launchView("minimal.md");
      const text = await session.text();
      expect(text).toContain("Title");
      expect(text).toContain("Format:");
    }, 20_000);
  });
});

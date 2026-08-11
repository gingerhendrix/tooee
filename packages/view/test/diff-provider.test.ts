import { test, expect, describe } from "bun:test";
import path from "node:path";
import { createFileProvider } from "../src/default-provider.js";
import { getTextContent } from "../src/types.js";

const fixture = function fixture(name: string): string {
  return path.join(import.meta.dir, "fixtures", name);
};

describe("diff format detection", () => {
  test("a .patch file loads as diff content", async () => {
    const content = await createFileProvider(fixture("sample.patch")).load();
    expect(content.format).toBe("diff");
    expect(getTextContent(content)).toContain("@@ -1,3 +1,4 @@");
    expect(content.title).toBe("sample.patch");
  });

  test("--renderer still wins over the extension", async () => {
    const content = await createFileProvider(fixture("sample.patch"), {
      renderer: "text",
    }).load();
    expect(content.format).toBe("text");
  });

  test("a patch with an unhelpful extension is sniffed from its content", async () => {
    const file = path.join(import.meta.dir, "fixtures", "sniffed-patch.tmp");
    await Bun.write(file, await Bun.file(fixture("sample.patch")).text());
    try {
      const content = await createFileProvider(file).load();
      expect(content.format).toBe("diff");
    } finally {
      await Bun.file(file).delete();
    }
  });

  test("ordinary text files are unaffected", async () => {
    const content = await createFileProvider(fixture("plain.txt")).load();
    expect(content.format).toBe("text");
  });
});

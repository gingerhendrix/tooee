import { describe, expect, test } from "bun:test";
import path from "node:path";

import { loadDemo, loadThemeProvider, readVendorStatus } from "../../preview/vendor.js";
import { captureError, FIXTURE_VENDOR_DIR, tempCacheDirectory } from "../support/fake-termcn.js";

describe("readVendorStatus", () => {
  test("reports a missing vendor folder as unavailable", async () => {
    const directory = path.join(await tempCacheDirectory(), "vendor");

    expect(await readVendorStatus(directory)).toEqual({ available: false, directory });
  });

  test("lists the vendored demos and the commit", async () => {
    expect(await readVendorStatus(FIXTURE_VENDOR_DIR)).toEqual({
      available: true,
      commit: "fixture0000000000000000000000000000000000",
      demos: ["key-echo-broken", "key-echo-demo"],
    });
  });
});

describe("vendor loaders", () => {
  test("loads default and named component exports", async () => {
    const echo = await loadDemo("key-echo-demo", FIXTURE_VENDOR_DIR);
    const broken = await loadDemo("key-echo-broken", FIXTURE_VENDOR_DIR);

    expect(echo.name).toBe("KeyEchoDemo");
    expect(broken.name).toBe("KeyEchoBroken");
  });

  test("loads the ThemeProvider", async () => {
    const provider = await loadThemeProvider(FIXTURE_VENDOR_DIR);

    expect(provider.name).toBe("ThemeProvider");
  });

  test("rejects an unknown demo", async () => {
    expect(await captureError(loadDemo("missing-demo", FIXTURE_VENDOR_DIR))).toBeInstanceOf(Error);
  });
});

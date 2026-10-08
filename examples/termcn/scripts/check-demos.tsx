#!/usr/bin/env bun
/**
 * Render every vendored termcn demo headlessly and report which ones fail.
 * Run after a vendor sync, for example when you move the pinned commit:
 *
 *   bun --conditions=@tooee/source examples/termcn/scripts/check-demos.tsx [--json]
 *
 * A demo fails when it throws while importing or rendering. A demo is
 * "blank" when its first frames hold no visible characters.
 */

import { testRender } from "@tooee/test-support";
import { defaultTheme } from "@tooee/themes";
import { createElement } from "react";

import { DemoErrorBoundary } from "../preview/demo-error-boundary.js";
import { toTermcnTheme } from "../preview/theme-bridge.js";
import { loadDemo, loadThemeProvider, readVendorStatus, SYNC_COMMAND } from "../preview/vendor.js";

interface DemoReport {
  demo: string;
  status: "ok" | "blank" | "failed";
  detail: string;
}

const FAILURE_MARKER = "failed to render";

const checkDemo = async function checkDemo(demo: string): Promise<DemoReport> {
  try {
    const [Provider, Demo] = await Promise.all([loadThemeProvider(), loadDemo(demo)]);
    const theme = toTermcnTheme(defaultTheme.name, defaultTheme.colors);

    const setup = await testRender(
      createElement(
        DemoErrorBoundary,
        { demo },
        createElement(Provider, { theme }, createElement(Demo))
      ),
      { height: 30, width: 100 }
    );

    await setup.renderOnce();
    await setup.renderOnce();

    const frame = setup.captureCharFrame();

    await setup.rerender(null);
    setup.renderer.destroy();

    if (frame.includes(FAILURE_MARKER)) {
      const line = frame
        .split("\n")
        .find((row) => row.trim() !== "" && !row.includes(FAILURE_MARKER));

      return { demo, detail: line?.trim() ?? "", status: "failed" };
    }

    return { demo, detail: "", status: frame.trim() === "" ? "blank" : "ok" };
  } catch (error) {
    return {
      demo,
      detail: error instanceof Error ? error.message : String(error),
      status: "failed",
    };
  }
};

const main = async function main(): Promise<void> {
  const vendor = await readVendorStatus();

  if (!vendor.available) {
    console.error(`vendor/ is missing. Run: ${SYNC_COMMAND}`);
    process.exitCode = 1;

    return;
  }

  const reports: DemoReport[] = [];

  for (const demo of vendor.demos) {
    // oxlint-disable-next-line no-await-in-loop -- demos render one at a time so their timers and errors do not mix
    reports.push(await checkDemo(demo));
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const report of reports.filter((item) => item.status !== "ok")) {
      console.log(`${report.status.padEnd(6)} ${report.demo}  ${report.detail}`);
    }
  }

  const ok = reports.filter((item) => item.status === "ok").length;

  console.log(`${ok}/${reports.length} demos rendered (termcn ${vendor.commit.slice(0, 7)})`);
};

if (import.meta.main) {
  await main();
  // Unmounted demos can leave module-level timers (termcn's shared animation
  // pool), which would keep the event loop alive after the report.
  process.exit();
}

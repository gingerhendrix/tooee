import { afterEach, expect, test } from "bun:test";

import { testRender } from "@tooee/test-support";
import type { ReactNode } from "react";

import { ThemeProvider, ThemeSwitcherProvider, useTheme } from "../src/context.js";

const sessions: Awaited<ReturnType<typeof testRender>>[] = [];

afterEach(async () => {
  await Promise.all(
    sessions.splice(0).map(async (session) => {
      session.renderer.destroy();
      await session.renderer.closed;
    })
  );
});

const Code = function Code(): ReactNode {
  const { syntax } = useTheme();

  return <code content="const value = 1" filetype="typescript" syntaxStyle={syntax} />;
};

for (const provider of ["fixed", "switcher", "fallback"]) {
  test(`${provider} syntax styles belong to each renderer independently`, async () => {
    let node: ReactNode = <Code />;

    if (provider === "fixed") {
      node = (
        <ThemeProvider>
          <Code />
        </ThemeProvider>
      );
    } else if (provider === "switcher") {
      node = (
        <ThemeSwitcherProvider>
          <Code />
        </ThemeSwitcherProvider>
      );
    }

    const first = await testRender(node, { height: 5, width: 40 });
    sessions.push(first);
    const second = await testRender(node, { height: 5, width: 40 });
    sessions.push(second);
    await first.renderOnce();
    await second.renderOnce();
    expect(first.captureCharFrame()).toContain("const value = 1");
    first.renderer.destroy();
    await first.renderer.closed;
    await second.renderOnce();
    expect(second.captureCharFrame()).toContain("const value = 1");
  });
}

import { afterEach, expect, test } from "bun:test";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { testRender } from "../../../test/support/test-render.ts";
import { MarkdownView } from "../src/markdown-view.js";
import { renderMermaidForTerminal } from "../src/mermaid.js";

const deploymentTopology = await Bun.file(
  new URL("fixtures/deployment-topology.mmd", import.meta.url),
).text();

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("promptly falls back for a deployment topology that exhausts the Mermaid layout", async () => {
  // Regression fixture copied from the final Mermaid fence in Lia's
  // 2026-07-16 topology-map artifact. beautiful-mermaid 1.1.3 previously
  // blocked here for roughly 84 seconds before throwing "Out of memory".
  const startedAt = performance.now();
  const result = renderMermaidForTerminal(deploymentTopology);
  const elapsedMs = performance.now() - startedAt;

  expect(result).toEqual({
    message: "Mermaid diagram exceeds the synchronous rendering complexity limit",
    ok: false,
    reason: "complexity-limit",
  });
  expect(elapsedMs).toBeLessThan(250);

  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={`\`\`\`mermaid\n${deploymentTopology}\`\`\``} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();

  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("flowchart BT");
  expect(frame).toContain("infrastructure[infrastructure]");
});

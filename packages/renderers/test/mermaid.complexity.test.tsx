import { afterEach, expect, test } from "bun:test";

import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";

import { MarkdownView } from "../src/markdown-view.js";
import { renderMermaidForTerminal } from "../src/mermaid.js";

const deploymentTopology = await Bun.file(
  new URL("fixtures/deployment-topology.mmd", import.meta.url)
).text();
const semanticApplicationInterface = await Bun.file(
  new URL("fixtures/semantic-application-interface.mmd", import.meta.url)
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
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();

  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("flowchart BT");
  expect(frame).toContain("infrastructure[infrastructure]");
});

test("promptly falls back for a small cyclic fan-in and fan-out graph", async () => {
  // Regression fixture copied from the second Mermaid fence in the Personal
  // 2026-09-15 semantic-application-interfaces research article.
  const startedAt = performance.now();
  const result = renderMermaidForTerminal(semanticApplicationInterface);
  const elapsedMs = performance.now() - startedAt;

  expect(result).toEqual({
    message: "Mermaid diagram exceeds the synchronous rendering complexity limit",
    ok: false,
    reason: "complexity-limit",
  });
  expect(elapsedMs).toBeLessThan(250);

  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={`\`\`\`mermaid\n${semanticApplicationInterface}\`\`\``} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();

  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("flowchart TD");
  expect(frame).toContain("H[Human UI] --> CMD[Application command service]");
});

test("renders an acyclic fan-in and fan-out graph", () => {
  const result = renderMermaidForTerminal(`flowchart TD
  A[A] --> HUB[Hub]
  B[B] --> HUB
  C[C] --> HUB
  HUB --> SPLIT[Split]
  SPLIT --> X[X]
  SPLIT --> Y[Y]
  SPLIT --> Z[Z]`);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.text).toContain("Hub");
    expect(result.text).toContain("Split");
  }
});

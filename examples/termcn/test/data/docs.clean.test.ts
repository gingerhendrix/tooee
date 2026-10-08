import { describe, expect, test } from "bun:test";

import { cleanDocsMarkdown, docsUrl, extractPreviewNames } from "../../data/docs.js";
import type { ComponentEntry } from "../../data/registry.js";

const entry = function entry(name: string, category: string): ComponentEntry {
  return {
    category,
    dependencies: [],
    description: "",
    name,
    registryDependencies: [],
    title: name,
  };
};

const MIRROR = [
  "# Spinner",
  "",
  "Animated spinner",
  "",
  '<ComponentPreview base="opentui" name="spinner-demo" />',
  "",
  "Installation [#installation]",
  "",
  "<CodeTabs>",
  "  <TabsList>",
  '    <TabsTrigger value="cli">',
  "      Command",
  "    </TabsTrigger>",
  "  </TabsList>",
  "",
  '  <TabsContent value="cli">',
  "    ```bash",
  "    npx shadcn@latest add @termcn/opentui/spinner",
  "    ```",
  "  </TabsContent>",
  "",
  '  <TabsContent value="manual">',
  "    <Steps>",
  "      <Step>",
  "        Install the following dependencies:",
  "      </Step>",
  "",
  '      <ComponentSource src="registry/bases/opentui/ui/types.ts" title="components/ui/types.ts" />',
  "",
  "      <Step>",
  "        Update the import paths.",
  "      </Step>",
  "    </Steps>",
  "  </TabsContent>",
  "</CodeTabs>",
  "",
  "Examples [#examples]",
  "",
  '<ComponentPreview base="opentui" name="spinner-styles" />',
  '<ComponentPreview base="opentui" name="spinner-demo" />',
].join("\n");

describe("docsUrl", () => {
  test("uses the component category folder", () => {
    expect(docsUrl(entry("spinner", "feedback"))).toBe(
      "https://www.termcn.dev/docs/components/opentui/feedback/spinner.md"
    );
  });

  test("uses the charts folder without the -chart suffix, including dither charts", () => {
    expect(docsUrl(entry("bar-chart", "charts"))).toBe(
      "https://www.termcn.dev/docs/charts/opentui/bar.md"
    );
    expect(docsUrl(entry("dither-pie-chart", "data"))).toBe(
      "https://www.termcn.dev/docs/charts/opentui/dither-pie.md"
    );
  });

  test("uses the templates folder and has no page for core providers", () => {
    expect(docsUrl(entry("app-shell", "templates"))).toBe(
      "https://www.termcn.dev/docs/templates/opentui/app-shell.md"
    );
    expect(docsUrl(entry("theme-provider", "core"))).toBeNull();
  });
});

describe("extractPreviewNames", () => {
  test("lists each preview once, in page order", () => {
    expect(extractPreviewNames(MIRROR)).toEqual(["spinner-demo", "spinner-styles"]);
  });
});

describe("cleanDocsMarkdown", () => {
  const cleaned = cleanDocsMarkdown(MIRROR);

  test("drops MDX tags and tab triggers", () => {
    expect(cleaned).not.toMatch(/<\/?[A-Z]/u);
    expect(cleaned).not.toContain("TabsTrigger");
  });

  test("restores headings and labels tabs", () => {
    expect(cleaned).toContain("## Installation");
    expect(cleaned).toContain("**Command**");
    expect(cleaned).toContain("**Manual**");
  });

  test("dedents fenced code inside tags", () => {
    expect(cleaned).toContain("```bash\nnpx shadcn@latest add @termcn/opentui/spinner\n```");
  });

  test("numbers steps and lists source files", () => {
    expect(cleaned).toContain("1. Install the following dependencies:");
    expect(cleaned).toContain("2. Update the import paths.");
    expect(cleaned).toContain("- `components/ui/types.ts`");
  });

  test("replaces previews with a pointer to the Preview tab", () => {
    expect(cleaned).toContain("> Live demo `spinner-demo`: open the Preview tab to run it.");
  });
});

import { describe, expect, test } from "bun:test";

import { relativeSpecifier, rewriteImports, vendorTarget } from "../../sync/rewrite-imports.js";

describe("vendorTarget", () => {
  test("maps @/ aliases to vendor paths", () => {
    expect(vendorTarget("@/registry/bases/opentui/ui/box")).toBe("registry/bases/opentui/ui/box");
  });

  test("maps shimmed specifiers to shims", () => {
    expect(vendorTarget("ink")).toBe("shims/ink.ts");
    expect(vendorTarget("@/registry/bases")).toBe("shims/bases.ts");
  });

  test("leaves npm and relative specifiers alone", () => {
    expect(vendorTarget("react")).toBeNull();
    expect(vendorTarget("@opentui/react")).toBeNull();
    expect(vendorTarget("./types")).toBeNull();
  });
});

describe("relativeSpecifier", () => {
  test("walks up from the importing file", () => {
    expect(
      relativeSpecifier("examples/opentui/box-demo.tsx", "registry/bases/opentui/ui/box")
    ).toBe("../../registry/bases/opentui/ui/box");
  });

  test("prefixes same-folder paths with ./", () => {
    expect(relativeSpecifier("shims/a.ts", "shims/b.ts")).toBe("./b.ts");
  });
});

describe("rewriteImports", () => {
  test("rewrites static, type, side-effect, and dynamic imports", () => {
    const source = [
      'import { Box } from "@/registry/bases/opentui/ui/box";',
      'import type { Theme } from "@/registry/bases/opentui/ui/types";',
      'import "@/registry/bases/opentui/themes/default";',
      'const lazy = import("@/registry/bases/opentui/ui/spinner");',
      'import { useStdout } from "ink";',
      'import { useState } from "react";',
    ].join("\n");

    const { content, aliasTargets } = rewriteImports(
      source,
      "registry/bases/ink/hooks/use-clipboard.ts"
    );

    expect(content).toBe(
      [
        'import { Box } from "../../opentui/ui/box";',
        'import type { Theme } from "../../opentui/ui/types";',
        'import "../../opentui/themes/default";',
        'const lazy = import("../../opentui/ui/spinner");',
        'import { useStdout } from "../../../../shims/ink.ts";',
        'import { useState } from "react";',
      ].join("\n")
    );
    expect(aliasTargets).toEqual([
      "registry/bases/opentui/ui/box",
      "registry/bases/opentui/ui/types",
      "registry/bases/opentui/themes/default",
      "registry/bases/opentui/ui/spinner",
    ]);
  });

  test("keeps single-quoted specifiers single-quoted", () => {
    const { content } = rewriteImports(
      "export { x } from '@/constants/site';",
      "examples/opentui/a.tsx"
    );

    expect(content).toBe("export { x } from '../../constants/site';");
  });
});

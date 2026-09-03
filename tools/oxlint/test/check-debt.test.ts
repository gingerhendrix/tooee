import { describe, expect, test } from "bun:test";

import { evaluateDebt, parseDiagnostics } from "../check-debt.ts";

const budgets = [{ maximum: 2, rule: "anti-slop/no-runtime-typeof" }];

describe("evaluateDebt", () => {
  test("accepts an unchanged count", () => {
    const result = evaluateDebt(budgets, [
      { code: "anti-slop(no-runtime-typeof)" },
      { code: "anti-slop(no-runtime-typeof)" },
    ]);

    expect(result.failures).toEqual([]);
    expect(result.reductions).toEqual([]);
  });

  test("rejects an increased count", () => {
    const result = evaluateDebt(budgets, [
      { code: "anti-slop(no-runtime-typeof)" },
      { code: "anti-slop(no-runtime-typeof)" },
      { code: "anti-slop(no-runtime-typeof)" },
    ]);

    expect(result.failures).toEqual(["anti-slop/no-runtime-typeof: 3 exceeds budget 2"]);
  });

  test("rejects a new unbudgeted rule", () => {
    const result = evaluateDebt(budgets, [{ code: "anti-slop(no-reflect-get)" }]);

    expect(result.failures).toEqual(["Unbudgeted diagnostic: anti-slop(no-reflect-get)"]);
  });

  test("reports a count reduction", () => {
    const result = evaluateDebt(budgets, [{ code: "anti-slop(no-runtime-typeof)" }]);

    expect(result.failures).toEqual([]);
    expect(result.reductions).toEqual(["anti-slop/no-runtime-typeof: 1 is below budget 2"]);
  });

  test("ignores built-in diagnostics", () => {
    const result = evaluateDebt(budgets, [
      { code: "eslint(no-void)" },
      { code: "anti-slop(no-runtime-typeof)" },
      { code: "anti-slop(no-runtime-typeof)" },
    ]);

    expect(result.failures).toEqual([]);
    expect(result.counts.get("anti-slop/no-runtime-typeof")).toBe(2);
  });
});

describe("parseDiagnostics", () => {
  test("reads diagnostic codes from the Oxlint JSON reporter", () => {
    const json = JSON.stringify({
      diagnostics: [
        { code: "anti-slop(no-runtime-typeof)", filename: "a.ts", severity: "warning" },
        { code: "eslint(no-void)", filename: "b.ts", severity: "error" },
      ],
      number_of_files: 2,
    });

    expect(parseDiagnostics(json)).toEqual([
      { code: "anti-slop(no-runtime-typeof)" },
      { code: "eslint(no-void)" },
    ]);
  });

  test("accepts an empty diagnostics array", () => {
    expect(parseDiagnostics(JSON.stringify({ diagnostics: [] }))).toEqual([]);
  });

  test("rejects output without a diagnostics array", () => {
    expect(() => parseDiagnostics(JSON.stringify({ number_of_files: 2 }))).toThrow(
      "Oxlint JSON output has no `diagnostics` array.",
    );
    expect(() => parseDiagnostics(JSON.stringify({ diagnostics: "none" }))).toThrow(
      "Oxlint JSON output has no `diagnostics` array.",
    );
    expect(() => parseDiagnostics("null")).toThrow(
      "Oxlint JSON output has no `diagnostics` array.",
    );
  });
});

import debt from "./debt.json";

interface DebtBudget {
  rule: string;
  maximum: number;
}

interface DebtFile {
  measuredAt: string;
  budgets: DebtBudget[];
}

interface Diagnostic {
  code: string;
}

export interface DebtEvaluation {
  failures: string[];
  reductions: string[];
  counts: Map<string, number>;
}

const toDiagnosticCode = (rule: string): string => {
  const separator = rule.indexOf("/");
  return `${rule.slice(0, separator)}(${rule.slice(separator + 1)})`;
};

export const evaluateDebt = (
  budgets: readonly DebtBudget[],
  diagnostics: readonly Diagnostic[],
): DebtEvaluation => {
  const rulesByCode = new Map(budgets.map(({ rule }) => [toDiagnosticCode(rule), rule]));
  const counts = new Map(budgets.map(({ rule }) => [rule, 0]));
  const failures: string[] = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.code.startsWith("anti-slop")) {
      continue;
    }

    const rule = rulesByCode.get(diagnostic.code);
    if (rule === undefined) {
      failures.push(`Unbudgeted diagnostic: ${diagnostic.code}`);
      continue;
    }

    counts.set(rule, (counts.get(rule) ?? 0) + 1);
  }

  const reductions: string[] = [];
  for (const { rule, maximum } of budgets) {
    const actual = counts.get(rule) ?? 0;
    if (actual > maximum) {
      failures.push(`${rule}: ${actual} exceeds budget ${maximum}`);
    } else if (actual < maximum) {
      reductions.push(`${rule}: ${actual} is below budget ${maximum}`);
    }
  }

  return { counts, failures, reductions };
};

/**
 * Decode Oxlint's JSON reporter output into the diagnostic codes the ratchet counts.
 * The reporter emits `{ "diagnostics": [{ "code": "plugin(rule)", ... }] }`; anything else
 * is a broken invocation and stops the gate instead of passing it silently.
 */
export const parseDiagnostics = (json: string): Diagnostic[] => {
  const parsed: unknown = JSON.parse(json);
  if (!(parsed instanceof Object) || !("diagnostics" in parsed)) {
    throw new TypeError("Oxlint JSON output has no `diagnostics` array.");
  }
  if (!Array.isArray(parsed.diagnostics)) {
    throw new TypeError("Oxlint JSON output has no `diagnostics` array.");
  }
  const entries: unknown[] = parsed.diagnostics;

  const diagnostics: Diagnostic[] = [];
  for (const entry of entries) {
    if (entry instanceof Object && "code" in entry) {
      diagnostics.push({ code: String(entry.code) });
    }
  }
  return diagnostics;
};

const main = (): void => {
  const { budgets }: DebtFile = debt;
  // The same authoritative lint the repository runs: `oxlint .` resolves oxlint.config.ts,
  // which enables the Ultracite presets, type-aware rules, and the anti-slop plugin.
  const result = Bun.spawnSync({
    cmd: ["bunx", "oxlint", ".", "--format=json"],
    stderr: "inherit",
    stdout: "pipe",
  });

  const evaluation = evaluateDebt(budgets, parseDiagnostics(result.stdout.toString()));

  if (evaluation.reductions.length > 0) {
    console.log("Anti-slop debt decreased; lower these budgets:");
    for (const reduction of evaluation.reductions) {
      console.log(`  ${reduction}`);
    }
  }

  if (evaluation.failures.length > 0) {
    console.error("Anti-slop debt ratchet failed:");
    for (const failure of evaluation.failures) {
      console.error(`  ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  const total = evaluation.counts.values().reduce((sum, count) => sum + count, 0);
  console.log(`Anti-slop debt ratchet passed (${total} budgeted diagnostics).`);
};

if (import.meta.main) {
  main();
}

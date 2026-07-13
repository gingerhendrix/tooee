#!/usr/bin/env bun
/**
 * git-branches.ts - Interactive branch switcher
 *
 * Select a branch to checkout with fuzzy filtering.
 *
 * Run: bun examples/git-branches.ts
 * Controls: j/k navigate, / filter, Enter checkout, q quit
 */

import { launch } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";

const branchProvider = {
  async load(): Promise<ChooseItem[]> {
    // Get current branch
    const currentProc = Bun.spawn(["git", "branch", "--show-current"]);
    const currentBranchText = await new Response(currentProc.stdout).text();
    const currentBranch = currentBranchText.trim();

    // Get all local branches
    const proc = Bun.spawn(["git", "branch", "--format=%(refname:short)"]);
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return [{ text: "Not a git repository", value: "" }];
    }

    const branches = text.trim().split("\n").filter(Boolean);

    if (branches.length === 0) {
      return [{ text: "No branches found", value: "" }];
    }

    return branches.map((branch) => {
      const isCurrent = branch === currentBranch;
      const isMain = branch === "main" || branch === "master";
      let icon = "\u{25CB}";
      if (isCurrent) {
        icon = "\u{2713}";
      } else if (isMain) {
        icon = "\u{25CF}";
      }

      return {
        description: isCurrent ? "current" : undefined,
        icon,
        text: branch,
        value: branch,
      };
    });
  },
};

const main = async function main() {
  const result = await launch({
    contentProvider: branchProvider,
    options: { prompt: "Switch branch" },
  });

  if (result && result.items[0].value !== undefined && result.items[0].value !== "") {
    const branch = result.items[0].value;
    const proc = Bun.spawn(["git", "checkout", branch], {
      stderr: "inherit",
      stdout: "inherit",
    });
    await proc.exited;
  }
};

await main();

import type { ParsedHotkey, ParsedStep } from "./types.js";

const KEY_ALIASES: ReadonlyMap<string, string> = new Map([
  ["backspace", "backspace"],
  ["cr", "return"],
  ["del", "delete"],
  ["enter", "return"],
  ["esc", "escape"],
  ["plus", "+"],
  ["tab", "tab"],
]);

const normalizeKey = function normalizeKey(key: string): string {
  const lower = key.toLowerCase();

  return KEY_ALIASES.get(lower) ?? lower;
};

const warned = new Set<string>();

const warnOnce = function warnOnce(message: string): void {
  if (warned.has(message)) {
    return;
  }

  warned.add(message);
  console.warn(message);
};

/** A hotkey step split at `+`, before modifiers are read. */
interface SplitStep {
  parts: string[];
  /** True when the step's key is `+` itself. */
  plusKey: boolean;
}

/**
 * Split a step into modifier parts and a key. `+` joins modifiers, so a `+`
 * key needs care: a bare `+`, or a trailing `++` as in `ctrl++`, is the `+`
 * key itself.
 */
const splitStep = function splitStep(step: string): SplitStep {
  const lower = step.toLowerCase().trim();

  if (lower === "+") {
    return { parts: [], plusKey: true };
  }

  if (lower.endsWith("++")) {
    return { parts: lower.slice(0, -2).split("+"), plusKey: true };
  }

  return { parts: lower.split("+"), plusKey: false };
};

const parseStep = function parseStep(step: string): ParsedStep {
  const { parts, plusKey } = splitStep(step);
  let key = plusKey ? "+" : "";
  let ctrl = false;
  let meta = false;
  let shift = false;
  let option = false;
  let superKey = false;

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed === "ctrl" || trimmed === "control") {
      ctrl = true;
    } else if (trimmed === "meta" || trimmed === "alt") {
      meta = true;
    } else if (trimmed === "shift") {
      shift = true;
    } else if (trimmed === "option") {
      option = true;
    } else if (trimmed === "super") {
      superKey = true;
    } else {
      key = normalizeKey(trimmed);
    }
  }

  return { ctrl, key, meta, option, shift, super: superKey };
};

/**
 * Parse a hotkey string into a ParsedHotkey.
 *
 * Supports:
 * - Modifier combos: "ctrl+s", "ctrl+shift+p"
 * - Sequences (space-separated): "g g", "d d"
 * - Leader prefix: "<leader>n" expands to leaderKey + "n"
 */
export const parseHotkey = function parseHotkey(hotkey: string, leaderKey?: string): ParsedHotkey {
  const trimmed = hotkey.trim();

  // Handle leader prefix
  const leaderMatch = /^<leader>(?<followingKey>.+)$/u.exec(trimmed);

  if (leaderMatch) {
    if (leaderKey === undefined || leaderKey === "") {
      // No leader configured: the hotkey must not spring to life on some
      // invented default. Zero steps = unmatchable; the dispatcher skips it.
      warnOnce(
        `[tooee/commands] Hotkey "${trimmed}" uses <leader> but no leader key is configured; the hotkey is disabled.`
      );

      return { steps: [] };
    }

    const leaderStep = parseStep(leaderKey);
    const followStep = parseStep(leaderMatch.groups?.followingKey ?? "");

    return { steps: [leaderStep, followStep] };
  }

  // Space-separated = sequence
  const parts = trimmed.split(/\s+/u);
  const steps = parts.map(parseStep);

  return { steps };
};

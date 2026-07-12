import type { ParsedHotkey, ParsedStep } from "./types.js";

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  enter: "return",
  cr: "return",
  del: "delete",
  tab: "tab",
  backspace: "backspace",
  plus: "+",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

const warned = new Set<string>();

function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

function parseStep(step: string): ParsedStep {
  const parts = step.toLowerCase().split("+");
  let key = "";
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

  return { key, ctrl, meta, shift, option, super: superKey };
}

/**
 * Parse a hotkey string into a ParsedHotkey.
 *
 * Supports:
 * - Modifier combos: "ctrl+s", "ctrl+shift+p"
 * - Sequences (space-separated): "g g", "d d"
 * - Leader prefix: "<leader>n" expands to leaderKey + "n"
 */
export function parseHotkey(hotkey: string, leaderKey?: string): ParsedHotkey {
  const trimmed = hotkey.trim();

  // Handle leader prefix
  const leaderMatch = trimmed.match(/^<leader>(.+)$/);
  if (leaderMatch) {
    if (!leaderKey) {
      // No leader configured: the hotkey must not spring to life on some
      // invented default. Zero steps = unmatchable; the dispatcher skips it.
      warnOnce(
        `[tooee/commands] Hotkey "${trimmed}" uses <leader> but no leader key is configured; the hotkey is disabled.`,
      );
      return { steps: [] };
    }
    const leaderStep = parseStep(leaderKey);
    const followStep = parseStep(leaderMatch[1]!);
    return { steps: [leaderStep, followStep] };
  }

  // Space-separated = sequence
  const parts = trimmed.split(/\s+/);
  const steps = parts.map(parseStep);
  return { steps };
}

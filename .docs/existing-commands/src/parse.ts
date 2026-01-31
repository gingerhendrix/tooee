import type { ParsedHotkey, ParsedStep } from "./types.ts"

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  enter: "return",
  cr: "return",
  del: "delete",
  space: " ",
  tab: "tab",
  backspace: "backspace",
}

const MODIFIERS = new Set(["ctrl", "control", "shift", "meta", "alt", "option", "super"])

function normalizeKey(key: string): string {
  const lower = key.toLowerCase()
  return KEY_ALIASES[lower] ?? lower
}

function parseStep(step: string): ParsedStep {
  const parts = step.toLowerCase().split("+")
  let key = ""
  let ctrl = false
  let meta = false
  let shift = false
  let option = false

  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed === "ctrl" || trimmed === "control") {
      ctrl = true
    } else if (trimmed === "meta" || trimmed === "alt") {
      meta = true
    } else if (trimmed === "shift") {
      shift = true
    } else if (trimmed === "option") {
      option = true
    } else if (trimmed === "super") {
      // super modifier — not tracked in ParsedStep currently
    } else {
      key = normalizeKey(trimmed)
    }
  }

  return { key, ctrl, meta, shift, option }
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
  const trimmed = hotkey.trim()

  // Handle leader prefix
  const leaderMatch = trimmed.match(/^<leader>(.+)$/)
  if (leaderMatch) {
    const leaderStep = leaderKey ? parseStep(leaderKey) : { key: "x", ctrl: true, meta: false, shift: false, option: false }
    const followStep = parseStep(leaderMatch[1]!)
    return { steps: [leaderStep, followStep] }
  }

  // Space-separated = sequence
  const parts = trimmed.split(/\s+/)
  const steps = parts.map(parseStep)
  return { steps }
}

import type { KeyEvent } from "@opentui/core"
import type { ParsedStep } from "./types.ts"

/**
 * Check if a KeyEvent matches a ParsedStep.
 */
export function matchStep(event: KeyEvent, step: ParsedStep): boolean {
  if (event.name !== step.key) return false
  if (event.ctrl !== step.ctrl) return false
  if (event.meta !== step.meta) return false
  if (event.shift !== step.shift) return false
  if (event.option !== step.option) return false
  return true
}

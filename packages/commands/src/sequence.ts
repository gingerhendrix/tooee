import type { KeyEvent } from "@opentui/core"
import type { ParsedHotkey } from "./types.js"
import { matchStep } from "./match.js"

export const DEFAULT_SEQUENCE_TIMEOUT_MS = 1500

export interface SequenceTrackerOptions {
  timeout?: number // ms, default DEFAULT_SEQUENCE_TIMEOUT_MS
  onReset?: () => void
}

export interface SequencePendingMatch {
  prefixLength: number
  indexes: number[]
}

export interface SequenceFeedResult {
  matchedIndex: number
  pending: SequencePendingMatch | null
}

export class SequenceTracker {
  private buffer: KeyEvent[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private timeout: number
  private onReset?: () => void

  constructor(options?: SequenceTrackerOptions) {
    this.timeout = options?.timeout ?? DEFAULT_SEQUENCE_TIMEOUT_MS
    this.onReset = options?.onReset
  }

  /**
   * Feed a key event and check against registered hotkeys.
   * Returns the index of the matched hotkey, or -1 if no full match.
   */
  feed(event: KeyEvent, hotkeys: ParsedHotkey[]): number {
    return this.feedWithState(event, hotkeys).matchedIndex
  }

  /**
   * Feed a key event and return both full-match and pending-prefix state.
   */
  feedWithState(event: KeyEvent, hotkeys: ParsedHotkey[]): SequenceFeedResult {
    this.buffer.push(event)
    this.resetTimer()

    for (let i = 0; i < hotkeys.length; i++) {
      const hotkey = hotkeys[i]!
      if (this.matchesBuffer(hotkey)) {
        this.reset()
        return { matchedIndex: i, pending: null }
      }
    }

    // Prune buffer if no hotkey could possibly match
    const maxLen = Math.max(0, ...hotkeys.map((h) => h.steps.length))
    if (maxLen > 0) {
      while (this.buffer.length > maxLen) {
        this.buffer.shift()
      }
    }

    return { matchedIndex: -1, pending: this.findPendingMatch(hotkeys) }
  }

  getPendingMatch(hotkeys: ParsedHotkey[]): SequencePendingMatch | null {
    return this.findPendingMatch(hotkeys)
  }

  private matchesBuffer(hotkey: ParsedHotkey): boolean {
    const { steps } = hotkey
    if (this.buffer.length < steps.length) return false

    const start = this.buffer.length - steps.length
    for (let i = 0; i < steps.length; i++) {
      if (!matchStep(this.buffer[start + i]!, steps[i]!)) return false
    }
    return true
  }

  private findPendingMatch(hotkeys: ParsedHotkey[]): SequencePendingMatch | null {
    const maxPrefixLength = Math.min(
      this.buffer.length,
      Math.max(0, ...hotkeys.map((h) => h.steps.length - 1)),
    )

    for (let prefixLength = maxPrefixLength; prefixLength > 0; prefixLength--) {
      const start = this.buffer.length - prefixLength
      const indexes: number[] = []

      for (let hotkeyIndex = 0; hotkeyIndex < hotkeys.length; hotkeyIndex++) {
        const hotkey = hotkeys[hotkeyIndex]!
        if (hotkey.steps.length <= prefixLength) continue

        let matches = true
        for (let i = 0; i < prefixLength; i++) {
          if (!matchStep(this.buffer[start + i]!, hotkey.steps[i]!)) {
            matches = false
            break
          }
        }

        if (matches) indexes.push(hotkeyIndex)
      }

      if (indexes.length > 0) return { prefixLength, indexes }
    }

    return null
  }

  reset(): void {
    const hadBuffer = this.buffer.length > 0
    this.buffer = []
    this.clearTimer()
    if (hadBuffer) this.onReset?.()
  }

  private resetTimer(): void {
    this.clearTimer()
    this.timer = setTimeout(() => this.reset(), this.timeout)
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

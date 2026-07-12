import type { KeyEvent } from "@opentui/core";
import type { ParsedHotkey } from "./types.js";
import { matchStep } from "./match.js";

export const DEFAULT_SEQUENCE_TIMEOUT_MS = 1500;

export interface SequenceTrackerOptions {
  /** Timeout in milliseconds; defaults to DEFAULT_SEQUENCE_TIMEOUT_MS. */
  timeout?: number;
  onReset?: () => void;
}

export interface SequencePendingMatch {
  prefixLength: number;
  indexes: number[];
}

export interface SequenceFeedResult {
  matchedIndex: number;
  pending: SequencePendingMatch | null;
}

// --- Pure matching helpers ---------------------------------------------------
// These are the sequence-matching primitives, extracted so a store (or any
// non-React dispatcher) can run them against its own buffer without
// instantiating SequenceTracker. SequenceTracker delegates to them.

/**
 * True when the tail of `buffer` fully matches every step of `hotkey`.
 * Zero-step hotkeys (e.g. a disabled leaderless `<leader>` binding) never
 * match anything.
 */
export const matchesBuffer = function matchesBuffer(
  buffer: readonly KeyEvent[],
  hotkey: ParsedHotkey,
): boolean {
  const { steps } = hotkey;
  if (steps.length === 0) {
    return false;
  }
  if (buffer.length < steps.length) {
    return false;
  }

  const start = buffer.length - steps.length;
  for (let i = 0; i < steps.length; i += 1) {
    if (!matchStep(buffer[start + i]!, steps[i]!)) {
      return false;
    }
  }
  return true;
};

/**
 * Find the longest buffer tail that is a proper prefix of at least one hotkey.
 * Returns the prefix length and the indexes of the hotkeys it could still
 * complete, or null when nothing is pending.
 */
export const findPendingMatch = function findPendingMatch(
  buffer: readonly KeyEvent[],
  hotkeys: readonly ParsedHotkey[],
): SequencePendingMatch | null {
  const maxPrefixLength = Math.min(
    buffer.length,
    Math.max(0, ...hotkeys.map((h) => h.steps.length - 1)),
  );

  for (let prefixLength = maxPrefixLength; prefixLength > 0; prefixLength -= 1) {
    const start = buffer.length - prefixLength;
    const indexes: number[] = [];

    for (let hotkeyIndex = 0; hotkeyIndex < hotkeys.length; hotkeyIndex += 1) {
      const hotkey = hotkeys[hotkeyIndex];
      if (hotkey.steps.length <= prefixLength) {
        continue;
      }

      let matches = true;
      for (let i = 0; i < prefixLength; i += 1) {
        if (!matchStep(buffer[start + i], hotkey.steps[i])) {
          matches = false;
          break;
        }
      }

      if (matches) {
        indexes.push(hotkeyIndex);
      }
    }

    if (indexes.length > 0) {
      return { indexes, prefixLength };
    }
  }

  return null;
};

/**
 * Drop buffer entries older than the longest hotkey could ever consume.
 * Returns the same array when nothing needs pruning.
 */
export const pruneBuffer = function pruneBuffer(
  buffer: readonly KeyEvent[],
  hotkeys: readonly ParsedHotkey[],
): readonly KeyEvent[] {
  const maxLen = Math.max(0, ...hotkeys.map((h) => h.steps.length));
  if (maxLen > 0 && buffer.length > maxLen) {
    return buffer.slice(buffer.length - maxLen);
  }
  return buffer;
};

export class SequenceTracker {
  private buffer: KeyEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timeout: number;
  private onReset?: () => void;

  constructor(options?: SequenceTrackerOptions) {
    this.timeout = options?.timeout ?? DEFAULT_SEQUENCE_TIMEOUT_MS;
    this.onReset = options?.onReset;
  }

  /**
   * Feed a key event and check against registered hotkeys.
   * Returns the index of the matched hotkey, or -1 if no full match.
   */
  feed(event: KeyEvent, hotkeys: ParsedHotkey[]): number {
    return this.feedWithState(event, hotkeys).matchedIndex;
  }

  /**
   * Feed a key event and return both full-match and pending-prefix state.
   */
  feedWithState(event: KeyEvent, hotkeys: ParsedHotkey[]): SequenceFeedResult {
    this.buffer.push(event);
    this.resetTimer();

    for (let i = 0; i < hotkeys.length; i += 1) {
      if (matchesBuffer(this.buffer, hotkeys[i])) {
        this.reset();
        return { matchedIndex: i, pending: null };
      }
    }

    // Prune buffer if no hotkey could possibly match
    this.buffer = [...pruneBuffer(this.buffer, hotkeys)];

    return { matchedIndex: -1, pending: findPendingMatch(this.buffer, hotkeys) };
  }

  getPendingMatch(hotkeys: ParsedHotkey[]): SequencePendingMatch | null {
    return findPendingMatch(this.buffer, hotkeys);
  }

  reset(): void {
    const hadBuffer = this.buffer.length > 0;
    this.buffer = [];
    this.clearTimer();
    if (hadBuffer) {
      this.onReset?.();
    }
  }

  private resetTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.reset();
    }, this.timeout);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

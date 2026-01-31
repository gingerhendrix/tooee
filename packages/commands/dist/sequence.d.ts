import type { KeyEvent } from "@opentui/core";
import type { ParsedHotkey } from "./types.ts";
export interface SequenceTrackerOptions {
    timeout?: number;
}
export declare class SequenceTracker {
    private buffer;
    private timer;
    private timeout;
    constructor(options?: SequenceTrackerOptions);
    /**
     * Feed a key event and check against registered hotkeys.
     * Returns the index of the matched hotkey, or -1 if no match.
     */
    feed(event: KeyEvent, hotkeys: ParsedHotkey[]): number;
    private matchesBuffer;
    reset(): void;
    private resetTimer;
    private clearTimer;
}
//# sourceMappingURL=sequence.d.ts.map
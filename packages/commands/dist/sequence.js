import { matchStep } from "./match.ts";
export class SequenceTracker {
    buffer = [];
    timer = null;
    timeout;
    constructor(options) {
        this.timeout = options?.timeout ?? 500;
    }
    /**
     * Feed a key event and check against registered hotkeys.
     * Returns the index of the matched hotkey, or -1 if no match.
     */
    feed(event, hotkeys) {
        this.buffer.push(event);
        this.resetTimer();
        for (let i = 0; i < hotkeys.length; i++) {
            const hotkey = hotkeys[i];
            if (this.matchesBuffer(hotkey)) {
                this.reset();
                return i;
            }
        }
        // Prune buffer if no hotkey could possibly match
        const maxLen = Math.max(...hotkeys.map((h) => h.steps.length));
        if (this.buffer.length > maxLen) {
            this.buffer.shift();
        }
        return -1;
    }
    matchesBuffer(hotkey) {
        const { steps } = hotkey;
        if (this.buffer.length < steps.length)
            return false;
        const start = this.buffer.length - steps.length;
        for (let i = 0; i < steps.length; i++) {
            if (!matchStep(this.buffer[start + i], steps[i]))
                return false;
        }
        return true;
    }
    reset() {
        this.buffer = [];
        this.clearTimer();
    }
    resetTimer() {
        this.clearTimer();
        this.timer = setTimeout(() => this.reset(), this.timeout);
    }
    clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
//# sourceMappingURL=sequence.js.map
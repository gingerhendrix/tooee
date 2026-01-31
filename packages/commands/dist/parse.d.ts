import type { ParsedHotkey } from "./types.ts";
/**
 * Parse a hotkey string into a ParsedHotkey.
 *
 * Supports:
 * - Modifier combos: "ctrl+s", "ctrl+shift+p"
 * - Sequences (space-separated): "g g", "d d"
 * - Leader prefix: "<leader>n" expands to leaderKey + "n"
 */
export declare function parseHotkey(hotkey: string, leaderKey?: string): ParsedHotkey;
//# sourceMappingURL=parse.d.ts.map
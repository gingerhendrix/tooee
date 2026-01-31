export interface ClipboardContent {
    data: string;
    mime: string;
}
export declare function readClipboard(): Promise<ClipboardContent | undefined>;
export declare function readClipboardText(): Promise<string | undefined>;
export declare function copyToClipboard(text: string): Promise<void>;
//# sourceMappingURL=clipboard.d.ts.map
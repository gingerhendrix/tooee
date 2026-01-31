export interface RequestChunk {
    delta: string;
}
export interface RequestContentProvider {
    submit(input: string): AsyncIterable<RequestChunk>;
}
export interface RequestAction {
    id: string;
    title: string;
    hotkey?: string;
    handler: (input: string, response: string) => void;
}
export interface RequestInteractionHandler {
    actions: RequestAction[];
}
//# sourceMappingURL=types.d.ts.map
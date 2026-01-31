export interface ActionDefinition {
    id: string;
    title: string;
    hotkey?: string;
    handler: () => void;
    when?: () => boolean;
}
export declare function useActions(actions: ActionDefinition[] | undefined): void;
//# sourceMappingURL=use-actions.d.ts.map
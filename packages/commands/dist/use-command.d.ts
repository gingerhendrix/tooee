export interface UseCommandOptions {
    id: string;
    title: string;
    handler: () => void;
    hotkey?: string;
    category?: string;
    icon?: string;
    when?: () => boolean;
    hidden?: boolean;
}
export declare function useCommand(options: UseCommandOptions): void;
//# sourceMappingURL=use-command.d.ts.map
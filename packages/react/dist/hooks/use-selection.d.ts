export interface SelectionOptions<T> {
    items: T[];
    multiSelect?: boolean;
    onSelect?: (item: T, index: number) => void;
    onActivate?: (item: T, index: number) => void;
    onYank?: (items: T[]) => void;
}
export interface SelectionState {
    activeIndex: number;
    selectedIndices: Set<number>;
    visualMode: boolean;
}
export declare function useSelection<T>(options: SelectionOptions<T>): SelectionState;
//# sourceMappingURL=use-selection.d.ts.map
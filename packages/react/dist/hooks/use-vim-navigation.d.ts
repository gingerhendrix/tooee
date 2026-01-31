export interface VimNavigationOptions {
    totalLines: number;
    viewportHeight: number;
    onSearch?: (query: string) => void;
}
export interface VimNavigationState {
    scrollOffset: number;
    searchQuery: string;
    searchActive: boolean;
}
export declare function useVimNavigation(options: VimNavigationOptions): VimNavigationState;
//# sourceMappingURL=use-vim-navigation.d.ts.map